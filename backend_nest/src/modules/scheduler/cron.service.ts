import { Injectable } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { DataSyncService } from "./data-sync.service";
import { RedditService } from "@/modules/reddit/reddit.service";
import { KevClient } from "@/shared/clients/KevClient";
import { NvdClient } from "@/shared/clients/NvdClient";
import { OtxClient } from "@/shared/clients/OtxClient";
import { MispClient } from "@/shared/clients/MispClient";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { fetchTrump } from "@/shared/socials/trump";
import { CoreDbService } from "@/shared/core-db.service";
import { logger } from "@/shared/logger";
import { cronJobDuration, cronJobRunsTotal, threatIntelNewEntriesTotal } from "@/shared/metrics";
import companies from "@/data/companies";
import type { Quote } from "@/types/index";

@Injectable()
export class CronService {
  private dataSyncService!: DataSyncService;
  private readonly kevClient = new KevClient();
  private readonly nvdClient = new NvdClient();
  private readonly otxClient = new OtxClient();
  private readonly mispClient = new MispClient();

  constructor(
    private readonly redditService: RedditService,
    private readonly emitter: EventEmitter2,
    private readonly coreDb: CoreDbService,
  ) {
    this.dataSyncService = new DataSyncService(coreDb.pool);
  }

  @Cron("0 23 * * *")
  async runPopulate(): Promise<void> {
    logger.info("cron: running populateAll");
    const end = cronJobDuration.startTimer({ job: "populate" });
    try {
      await this.dataSyncService.populateAll();
      cronJobRunsTotal.inc({ job: "populate", status: "success" });
    } catch (e: unknown) {
      logger.error({ err: e }, "cron: populateAll failed");
      cronJobRunsTotal.inc({ job: "populate", status: "failure" });
    } finally {
      end();
    }
    logger.info("cron: populateAll done");

    const changes: { ticker: string; changePct: number }[] = [];
    for (const [name, ticker] of Object.entries(companies)) {
      try {
        const { quotes } = await new CybersecurityConsumer(name, this.coreDb.pool).history();
        const byDate = new Map<string, Quote>();
        for (const q of quotes) byDate.set(q.date.slice(0, 10), q);
        const sorted = [...byDate.values()].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const prev = sorted[sorted.length - 2];
        const last = sorted[sorted.length - 1];
        const changePct = prev?.close && last?.close ? ((last.close - prev.close) / prev.close) * 100 : 0;
        changes.push({ ticker, changePct });
      } catch (e) {
        logger.warn({ err: e, ticker }, "cron: stock history unavailable for ticker");
      }
    }
    this.emitter.emit("stocks.updated", { at: new Date().toISOString(), changes });
  }

  @Cron("0 * * * *")
  async runNews(): Promise<void> {
    logger.info("cron: running populateAllNews");
    const end = cronJobDuration.startTimer({ job: "news" });
    try {
      await this.dataSyncService.populateAllNews();
      cronJobRunsTotal.inc({ job: "news", status: "success" });
    } catch (e: unknown) {
      logger.error({ err: e }, "cron: populateAllNews failed");
      cronJobRunsTotal.inc({ job: "news", status: "failure" });
    } finally {
      end();
    }
    logger.info("cron: populateAllNews done");
    this.emitter.emit("news.updated", { at: new Date().toISOString() });
  }

  @Cron("0 * * * *")
  async runFetchTrump(): Promise<void> {
    logger.info("cron: running fetchTrump");
    const end = cronJobDuration.startTimer({ job: "trump" });
    try {
      await fetchTrump(this.coreDb.pool);
      cronJobRunsTotal.inc({ job: "trump", status: "success" });
    } catch (e: unknown) {
      logger.error({ err: e }, "cron: fetchTrump failed");
      cronJobRunsTotal.inc({ job: "trump", status: "failure" });
    } finally {
      end();
    }
    logger.info("cron: fetchTrump done");
    this.emitter.emit("trump.updated", { at: new Date().toISOString() });
  }

  @Cron("0 * * * *")
  async runFetchReddit(): Promise<void> {
    logger.info("cron: running fetchReddit");
    const end = cronJobDuration.startTimer({ job: "reddit" });
    try {
      await this.redditService.syncAll();
      cronJobRunsTotal.inc({ job: "reddit", status: "success" });
    } catch (e: unknown) {
      logger.error({ err: e }, "cron: fetchReddit failed");
      cronJobRunsTotal.inc({ job: "reddit", status: "failure" });
    } finally {
      end();
    }
    logger.info("cron: fetchReddit done");
  }

  @Cron("0 6 * * *")
  async runThreatIntelSync(): Promise<void> {
    logger.info("cron: running threat intel sync");
    const end = cronJobDuration.startTimer({ job: "threatintel" });
    const result = { newKev: 0, criticalNvd: 0, newOtx: 0 };

    const prevKev = this.kevClient.read();
    const prevKevIds = new Set((prevKev?.vulnerabilities ?? []).map((v) => (v as { cveID?: string }).cveID));
    await this.kevClient.sync().catch((e: unknown) => logger.error({ err: e }, "cron: KEV sync failed"));
    const nextKev = this.kevClient.read();
    result.newKev = (nextKev?.vulnerabilities ?? []).filter(
      (v) => !(prevKevIds as Set<string | undefined>).has((v as { cveID?: string }).cveID)
    ).length;

    await this.nvdClient.sync(90).catch((e: unknown) => logger.error({ err: e }, "cron: NVD sync failed"));
    const nextNvd = this.nvdClient.read();
    result.criticalNvd = (nextNvd?.vulnerabilities ?? []).filter((v) => {
      const entry = v as { cve?: { metrics?: { cvssMetricV40?: { cvssData?: { baseSeverity?: string } }[]; cvssMetricV31?: { cvssData?: { baseSeverity?: string } }[] } } };
      const s = entry.cve?.metrics?.cvssMetricV40?.[0]?.cvssData?.baseSeverity ??
                entry.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ?? "";
      return s === "CRITICAL";
    }).length;

    if (this.otxClient.configured) {
      const prevOtx = this.otxClient.read();
      const prevCount = prevOtx?.results?.length ?? 0;
      await this.otxClient.sync().catch((e: unknown) => logger.error({ err: e }, "cron: OTX sync failed"));
      const nextOtx = this.otxClient.read();
      result.newOtx = Math.max(0, (nextOtx?.results?.length ?? 0) - prevCount);
    }

    if (this.mispClient.configured) {
      await this.mispClient.sync().catch((e: unknown) => logger.error({ err: e }, "cron: MISP sync failed"));
    }

    end();
    cronJobRunsTotal.inc({ job: "threatintel", status: "success" });
    if (result.newKev > 0) threatIntelNewEntriesTotal.inc({ source: "kev" }, result.newKev);
    if (result.criticalNvd > 0) threatIntelNewEntriesTotal.inc({ source: "nvd" }, result.criticalNvd);
    if (result.newOtx > 0) threatIntelNewEntriesTotal.inc({ source: "otx" }, result.newOtx);
    logger.info({ ...result }, "cron: threat intel sync done");
    this.emitter.emit("threatintel.updated", { at: new Date().toISOString(), ...result });
  }
}
