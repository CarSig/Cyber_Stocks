import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Subject, Observable, merge, interval } from "rxjs";
import { map, finalize } from "rxjs/operators";
import type { MessageEvent } from "@nestjs/common";
import { SecEdgarClient, type FormType, type SyncProgressEvent, writeCoverageForTicker } from "@/shared/clients/SecEdgarClient";
import { COMPANY_CIK } from "@/data/CIK";
import { notFound } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { SecFilingsRepository } from "./sec-filings.repository";
import { readBodyText, scanCyberKeywords } from "./filing-body";
import { classifyFiling8kCyber } from "@/shared/utils/anthropicAnalyzer";

const SCAN_801 = "cyber_8.01";

export type Scan801ProgressEvent = {
  type: "progress" | "done";
  current?: number;
  total?: number;
  matched?: number;
  ticker?: string;
  accession?: string;
};

type ProgressState = {
  subject: Subject<MessageEvent>;
  current: number;
  total: number;
};

export type SyncAllProgressEvent = {
  type: "ticker_start" | "filing" | "ticker_done" | "done";
  ticker?: string;
  tickerIndex?: number;
  tickerTotal?: number;
  filingCurrent?: number;
  filingTotal?: number;
  form?: string;
  accession?: string;
};

@Injectable()
export class EdgarService {
  private readonly client: SecEdgarClient;
  private readonly progress = new Map<string, ProgressState>();

  // Single shared stream for the sync-all job
  private syncAllSubject = new Subject<MessageEvent>();
  private syncAllRunning = false;

  // In-flight single-ticker syncs (fire-and-forget)
  private readonly running = new Set<string>();

  // Single shared stream for the 8.01 keyword-scan job
  private scan801Subject = new Subject<MessageEvent>();
  private scan801Running = false;

  constructor(
    private readonly emitter: EventEmitter2,
    private readonly repo: SecFilingsRepository,
  ) {
    this.client = new SecEdgarClient(repo);
  }

  tickers(): string[] {
    return Object.keys(COMPANY_CIK);
  }

  async sync(ticker: string, dateFrom?: string, dateTo?: string, formTypes?: FormType[], force?: boolean) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);

    const existing = this.progress.get(upper);
    if (existing) existing.subject.complete();
    const subject = new Subject<MessageEvent>();
    this.progress.set(upper, { subject, current: 0, total: 0 });

    const result = await this.client.sync(upper, dateFrom, dateTo, formTypes, force, (evt: SyncProgressEvent) => {
      const state = this.progress.get(upper);
      if (!state) return;
      state.current = evt.current;
      state.total = evt.total;
      state.subject.next({ data: { type: "progress", ...evt } });
      if (evt.current >= evt.total && evt.total > 0) {
        state.subject.complete();
        this.progress.delete(upper);
      }
    });

    const state = this.progress.get(upper);
    if (state) {
      state.subject.complete();
      this.progress.delete(upper);
    }

    this.emitter.emit("insiders.invalidate");
    return result;
  }

  /** Fire-and-forget single-ticker sync. Returns immediately; progress streams via streamProgress. */
  startSync(ticker: string, dateFrom?: string, dateTo?: string, formTypes?: FormType[], force?: boolean): { started: boolean; running: boolean } {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    if (this.running.has(upper)) return { started: false, running: true };

    this.running.add(upper);
    void this.sync(upper, dateFrom, dateTo, formTypes, force)
      .catch((err: unknown) => logger.error({ err, ticker: upper }, "edgar: background sync failed"))
      .finally(() => this.running.delete(upper));

    return { started: true, running: true };
  }

  isSyncRunning(ticker: string): boolean {
    return this.running.has(ticker.toUpperCase());
  }

  streamProgress(ticker: string): Observable<MessageEvent> {
    const upper = ticker.toUpperCase();
    let state = this.progress.get(upper);
    if (!state) {
      const subject = new Subject<MessageEvent>();
      state = { subject, current: 0, total: 0 };
      this.progress.set(upper, state);
      setTimeout(() => { subject.complete(); this.progress.delete(upper); }, 0);
    }
    return merge(
      interval(30_000).pipe(map(() => ({ data: { type: "ping" } } as MessageEvent))),
      state.subject.asObservable(),
    ).pipe(finalize(() => { /* client disconnected */ }));
  }

  // ── Sync-all job ────────────────────────────────────────────────────────────

  get isSyncAllRunning(): boolean {
    return this.syncAllRunning;
  }

  /** Fire-and-forget: starts sync for all tickers over last 2 years, emits progress events. */
  startSyncAll(): void {
    if (this.syncAllRunning) return;
    // Replace subject so new subscribers get a fresh stream
    this.syncAllSubject = new Subject<MessageEvent>();
    this.syncAllRunning = true;
    void this.runSyncAll();
  }

  private async runSyncAll(): Promise<void> {
    const tickers = Object.keys(COMPANY_CIK);
    const dateFrom = new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const dateTo = new Date().toISOString().slice(0, 10);

    this.emit({ type: "ticker_start", tickerIndex: 0, tickerTotal: tickers.length });

    for (let i = 0; i < tickers.length; i++) {
      const ticker = tickers[i];
      this.emit({ type: "ticker_start", ticker, tickerIndex: i + 1, tickerTotal: tickers.length });
      logger.info({ ticker }, "edgar sync-all: starting ticker");

      try {
        await this.client.sync(ticker, dateFrom, dateTo, undefined, false, (evt: SyncProgressEvent) => {
          this.emit({
            type: "filing",
            ticker,
            tickerIndex: i + 1,
            tickerTotal: tickers.length,
            filingCurrent: evt.current,
            filingTotal: evt.total,
            form: evt.form,
            accession: evt.accession,
          });
        });
        this.emit({ type: "ticker_done", ticker, tickerIndex: i + 1, tickerTotal: tickers.length });
      } catch (e: unknown) {
        logger.error({ err: e, ticker }, "edgar sync-all: ticker failed");
        this.emit({ type: "ticker_done", ticker, tickerIndex: i + 1, tickerTotal: tickers.length });
      }
    }

    this.emit({ type: "done", tickerTotal: tickers.length });
    this.syncAllSubject.complete();
    this.syncAllRunning = false;
    logger.info("edgar sync-all: complete");
    this.emitter.emit("insiders.invalidate");
  }

  private emit(evt: SyncAllProgressEvent): void {
    this.syncAllSubject.next({ data: evt });
  }

  streamSyncAll(): Observable<MessageEvent> {
    return merge(
      interval(30_000).pipe(map(() => ({ data: { type: "ping" } } as MessageEvent))),
      this.syncAllSubject.asObservable(),
    ).pipe(finalize(() => { /* client disconnected */ }));
  }

  files(ticker: string) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    return this.repo.listByTicker(upper);
  }

  filesAll() {
    return this.repo.listAllAsListings();
  }

  coverage(ticker: string) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    return this.client.getCoverage(upper);
  }

  // ── 8.01 keyword-scan job ─────────────────────────────────────────────────
  // Scans the body of every 8-K filed under Item 8.01 ("Other Events") for
  // cyber/outage/breach keywords. Catches material events filed under 8.01
  // rather than the dedicated cybersecurity item 1.05 (e.g. CrowdStrike's 2024
  // Falcon outage). Bodies are fetched from SEC and persisted on first run.

  get isScan801Running(): boolean {
    return this.scan801Running;
  }

  /** Fire-and-forget: scans all 8.01 filing bodies, emits progress, stores matches. */
  startScan801(): { started: boolean; running: boolean } {
    if (this.scan801Running) return { started: false, running: true };
    this.scan801Subject = new Subject<MessageEvent>();
    this.scan801Running = true;
    void this.runScan801();
    return { started: true, running: true };
  }

  private async runScan801(): Promise<void> {
    try {
      const rows = await this.repo.list801Accessions();
      const total = rows.length;
      let matchedCount = 0;

      for (let i = 0; i < total; i++) {
        const row = rows[i];
        try {
          const text = await readBodyText({
            ticker: row.ticker,
            accession: row.accession,
            cik: row.issuer_cik,
          });
          const result = text
            ? scanCyberKeywords(text)
            : { matched: false, keywords: [], snippet: null };

          // Two-stage funnel: only the cheap keyword match gates the AI call, so
          // we classify a handful of candidates instead of every 8.01 body. The
          // AI weeds out boilerplate (risk-factor / marketing) false positives.
          let ai: Awaited<ReturnType<typeof classifyFiling8kCyber>> | null = null;
          if (result.matched && text) {
            try {
              ai = await classifyFiling8kCyber(text, row.ticker);
            } catch (e) {
              logger.warn({ accession: row.accession, err: (e as Error).message }, "scan801: AI classify failed");
            }
          }

          await this.repo.upsertScan({
            accession: row.accession,
            scanType: SCAN_801,
            matched: result.matched,
            matchedKeywords: result.keywords,
            snippet: result.snippet,
            aiRealIncident: ai ? ai.isRealIncident : null,
            aiConfidence: ai ? ai.confidence : null,
            aiIncidentType: ai ? ai.incidentType : null,
            aiSummary: ai ? ai.summary : null,
            aiModel: ai ? ai.model : null,
          });
          if (ai ? ai.isRealIncident : result.matched) matchedCount++;
        } catch (e) {
          logger.warn({ accession: row.accession, err: (e as Error).message }, "scan801: filing failed");
        }

        this.scan801Subject.next({
          data: {
            type: "progress",
            current: i + 1,
            total,
            matched: matchedCount,
            ticker: row.ticker,
            accession: row.accession,
          } satisfies Scan801ProgressEvent,
        });
      }

      this.scan801Subject.next({ data: { type: "done", total, matched: matchedCount } satisfies Scan801ProgressEvent });
      logger.info({ total, matched: matchedCount }, "scan801: complete");
    } catch (e) {
      logger.error({ err: (e as Error).message }, "scan801: job failed");
    } finally {
      this.scan801Subject.complete();
      this.scan801Running = false;
    }
  }

  streamScan801(): Observable<MessageEvent> {
    return merge(
      interval(30_000).pipe(map(() => ({ data: { type: "ping" } } as MessageEvent))),
      this.scan801Subject.asObservable(),
    ).pipe(finalize(() => { /* client disconnected */ }));
  }

  scan801Results() {
    return this.repo.getScans(SCAN_801);
  }

  async backfillCoverage(): Promise<{ updated: number; tickers: string[] }> {
    const rows = await this.repo.getFilingDateRangePerTicker();
    const updated: string[] = [];
    for (const { ticker, minDate, maxDate } of rows) {
      writeCoverageForTicker(ticker, minDate, maxDate);
      updated.push(ticker);
      logger.info({ ticker, minDate, maxDate }, "edgar: backfilled coverage");
    }
    return { updated: updated.length, tickers: updated };
  }
}
