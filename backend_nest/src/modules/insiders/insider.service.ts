import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import type {
  FilingPriceImpact,
  Form4Transaction,
  InsiderCompanySummary,
  InsiderFiling,
  InsiderImpactAggregate,
  InsiderLeaderboardResponse,
  InsiderLeaderboardRow,
  InsiderOwnerProfile,
  InsiderRow,
  PersonDetail,
} from "@algo/shared";
import { COMPANY_CIK } from "@/data/CIK";
import { notFound } from "@/shared/errors";
import { logger } from "@/shared/logger";
import { SecFilingsRepository, type FilingRow, type OwnerRow, type TxnRow } from "@/modules/edgar/sec-filings.repository";
import { PriceImpactService } from "./price-impact.service";

const INSIDER_FORMS = new Set(["3", "4", "5", "3/A", "4/A", "5/A"]);

function filingDirection(txns: Form4Transaction[]): "buy" | "sell" | "other" {
  if (txns.length === 0) return "other";
  const nonDeriv = txns.filter((t) => t.table === "nonDerivative");
  if (nonDeriv.some((t) => t.code === "P")) return "buy";
  if (nonDeriv.some((t) => t.code === "S")) return "sell";
  return "other";
}

function buildAggregate(filings: InsiderFiling[]): InsiderImpactAggregate {
  const withPrice = filings.filter((f) => f.priceImpact != null);
  const buckets = { buy: [] as number[], sell: [] as number[], other: [] as number[] };
  const byCode = new Map<string, number[]>();

  for (const f of filings) {
    if (!f.priceImpact) continue;
    const delta = f.priceImpact.deltaPct;
    buckets[filingDirection(f.transactions ?? [])].push(delta);

    const primaryCode = f.transactions?.find((t) => t.table === "nonDerivative")?.code
      ?? f.transactions?.[0]?.code;
    if (primaryCode) {
      const arr = byCode.get(primaryCode) ?? [];
      arr.push(delta);
      byCode.set(primaryCode, arr);
    }
  }

  const avg = (arr: number[]): number | null =>
    arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length;

  const allDeltas = [...buckets.buy, ...buckets.sell, ...buckets.other];

  const byCodeResult: Record<string, { count: number; avgDeltaPct: number | null }> = {};
  for (const [code, deltas] of byCode) {
    byCodeResult[code] = { count: deltas.length, avgDeltaPct: avg(deltas) };
  }

  return {
    filingCount: filings.length,
    withPriceData: withPrice.length,
    buy: { count: buckets.buy.length, avgDeltaPct: avg(buckets.buy) },
    sell: { count: buckets.sell.length, avgDeltaPct: avg(buckets.sell) },
    other: { count: buckets.other.length, avgDeltaPct: avg(buckets.other) },
    overall: { avgDeltaPct: avg(allDeltas) },
    byCode: byCodeResult,
  };
}

function rowToTransaction(r: TxnRow): Form4Transaction {
  return {
    table: r.tbl,
    securityTitle: r.security_title,
    transactionDate: r.transaction_date ?? undefined,
    code: r.code,
    acquiredDisposed: r.acquired_disposed,
    shares: r.shares != null ? parseFloat(r.shares) : null,
    pricePerShare: r.price_per_share != null ? parseFloat(r.price_per_share) : null,
    priceFromFootnote: r.price_from_footnote,
    sharesOwnedAfter: r.shares_owned_after != null ? parseFloat(r.shares_owned_after) : null,
    directOrIndirect: r.direct_or_indirect,
  };
}

function rowToOwnerProfile(r: OwnerRow): InsiderOwnerProfile {
  return {
    isDirector: r.is_director,
    isOfficer: r.is_officer,
    isTenPercentOwner: r.is_ten_percent_owner,
    officerTitle: r.officer_title ?? undefined,
  };
}

@Injectable()
export class InsiderService {
  constructor(
    private readonly repo: SecFilingsRepository,
    private readonly priceImpactService: PriceImpactService,
  ) {}

  @OnEvent("insiders.invalidate")
  invalidate(): void {
    // No process-level cache to clear; queries hit DB directly.
    logger.info("insider cache invalidate event (no-op: DB-backed)");
  }

  private filterInsiderForms(rows: FilingRow[]): FilingRow[] {
    return rows.filter((r) => INSIDER_FORMS.has(r.form));
  }

  private async hydrate(rows: FilingRow[]): Promise<InsiderFiling[]> {
    if (rows.length === 0) return [];
    const accessions = rows.map((r) => r.accession);
    const [owners, txns] = await Promise.all([
      this.repo.ownersForAccessions(accessions),
      this.repo.transactionsForAccessions(accessions),
    ]);

    const ownersByAcc = new Map<string, OwnerRow[]>();
    for (const o of owners) {
      const list = ownersByAcc.get(o.accession);
      if (list) list.push(o);
      else ownersByAcc.set(o.accession, [o]);
    }

    const txnsByAcc = new Map<string, Form4Transaction[]>();
    for (const t of txns) {
      const list = txnsByAcc.get(t.accession);
      const conv = rowToTransaction(t);
      if (list) list.push(conv);
      else txnsByAcc.set(t.accession, [conv]);
    }

    // Batch price impact lookups grouped by ticker
    const datesByTicker = new Map<string, Set<string>>();
    for (const r of rows) {
      if (!datesByTicker.has(r.ticker)) datesByTicker.set(r.ticker, new Set());
      datesByTicker.get(r.ticker)!.add(r.filing_date);
    }
    const impactByTickerDate = new Map<string, Map<string, FilingPriceImpact | null>>();
    await Promise.all(
      Array.from(datesByTicker.entries()).map(async ([ticker, dates]) => {
        const m = await this.priceImpactService.getDeltaForTickerDates(ticker, Array.from(dates));
        impactByTickerDate.set(ticker, m);
      }),
    );

    return rows.map((r) => {
      const owner = ownersByAcc.get(r.accession)?.[0];
      const impact = impactByTickerDate.get(r.ticker)?.get(r.filing_date) ?? null;
      return {
        accession: r.accession,
        form: r.form as InsiderFiling["form"],
        filingDate: r.filing_date,
        ticker: r.ticker,
        issuerCik: r.issuer_cik,
        reportPeriod: r.report_period ?? undefined,
        transactions: txnsByAcc.get(r.accession) ?? [],
        priceImpact: impact,
        ownerProfile: owner ? rowToOwnerProfile(owner) : undefined,
      };
    });
  }

  async listCompanies(): Promise<InsiderCompanySummary[]> {
    const rows = this.filterInsiderForms(await this.repo.listAllFilings());
    const owners = await this.repo.ownersForAccessions(rows.map((r) => r.accession));
    const ownersByAcc = new Map<string, OwnerRow[]>();
    for (const o of owners) {
      const list = ownersByAcc.get(o.accession);
      if (list) list.push(o);
      else ownersByAcc.set(o.accession, [o]);
    }

    const byTicker = new Map<string, { persons: Set<string>; latest: string }>();
    for (const r of rows) {
      let agg = byTicker.get(r.ticker);
      if (!agg) {
        agg = { persons: new Set(), latest: "0000-00-00" };
        byTicker.set(r.ticker, agg);
      }
      for (const o of ownersByAcc.get(r.accession) ?? []) agg.persons.add(o.person_cik);
      if (r.filing_date > agg.latest) agg.latest = r.filing_date;
    }

    const out: InsiderCompanySummary[] = [];
    for (const [ticker, v] of byTicker) {
      out.push({ ticker, insiderCount: v.persons.size, latestFilingDate: v.latest });
    }
    return out.sort((a, b) => (b.latestFilingDate > a.latestFilingDate ? 1 : -1));
  }

  async listByCompany(ticker: string): Promise<InsiderRow[]> {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    const rows = this.filterInsiderForms(await this.repo.listFilingsForTicker(upper));
    const owners = await this.repo.ownersForAccessions(rows.map((r) => r.accession));
    const ownersByAcc = new Map<string, OwnerRow[]>();
    for (const o of owners) {
      const list = ownersByAcc.get(o.accession);
      if (list) list.push(o);
      else ownersByAcc.set(o.accession, [o]);
    }

    type Acc = { name: string; count: number; latest: string };
    const grouped = new Map<string, Acc>();
    for (const r of rows) {
      const owner = ownersByAcc.get(r.accession)?.[0];
      if (!owner) continue;
      const acc = grouped.get(owner.person_cik);
      if (acc) {
        acc.count++;
        if (r.filing_date > acc.latest) acc.latest = r.filing_date;
      } else {
        grouped.set(owner.person_cik, { name: owner.person_name, count: 1, latest: r.filing_date });
      }
    }

    const out: InsiderRow[] = [];
    for (const [personCik, v] of grouped) {
      out.push({ personCik, name: v.name, companies: [upper], filingCount: v.count, latestFilingDate: v.latest });
    }
    return out.sort((a, b) => (b.latestFilingDate > a.latestFilingDate ? 1 : -1));
  }

  async listAll(): Promise<InsiderRow[]> {
    const rows = this.filterInsiderForms(await this.repo.listAllFilings());
    const owners = await this.repo.ownersForAccessions(rows.map((r) => r.accession));
    const ownersByAcc = new Map<string, OwnerRow[]>();
    for (const o of owners) {
      const list = ownersByAcc.get(o.accession);
      if (list) list.push(o);
      else ownersByAcc.set(o.accession, [o]);
    }
    const tickerByAcc = new Map(rows.map((r) => [r.accession, r.ticker]));
    const dateByAcc = new Map(rows.map((r) => [r.accession, r.filing_date]));

    type Acc = { name: string; companies: Set<string>; count: number; latest: string };
    const grouped = new Map<string, Acc>();
    for (const [acc, ownerList] of ownersByAcc) {
      const ticker = tickerByAcc.get(acc);
      const date = dateByAcc.get(acc);
      if (!ticker || !date) continue;
      for (const o of ownerList) {
        const v = grouped.get(o.person_cik);
        if (v) {
          v.companies.add(ticker);
          v.count++;
          if (date > v.latest) v.latest = date;
        } else {
          grouped.set(o.person_cik, { name: o.person_name, companies: new Set([ticker]), count: 1, latest: date });
        }
      }
    }

    const out: InsiderRow[] = [];
    for (const [personCik, v] of grouped) {
      out.push({
        personCik,
        name: v.name,
        companies: Array.from(v.companies).sort(),
        filingCount: v.count,
        latestFilingDate: v.latest,
      });
    }
    return out.sort((a, b) => (b.latestFilingDate > a.latestFilingDate ? 1 : -1));
  }

  async getPerson(personCik: string): Promise<PersonDetail> {
    const normalized = String(parseInt(personCik, 10));
    const rows = this.filterInsiderForms(await this.repo.listFilingsForPerson(normalized));
    if (rows.length === 0) throw notFound(`Unknown insider person CIK: ${personCik}`);

    const filings = await this.hydrate(rows);
    const firstOwner = (await this.repo.ownersForAccessions([rows[0].accession]))[0];
    const name = firstOwner?.person_name ?? "Unknown";

    const filingsByCompany: Record<string, InsiderFiling[]> = {};
    for (const f of filings) {
      const list = filingsByCompany[f.ticker];
      if (list) list.push(f);
      else filingsByCompany[f.ticker] = [f];
    }
    for (const ticker of Object.keys(filingsByCompany)) {
      filingsByCompany[ticker].sort((a, b) => (b.filingDate > a.filingDate ? 1 : -1));
    }

    const seenRoles = new Set<string>();
    const roles: InsiderOwnerProfile[] = [];
    for (const f of filings) {
      if (!f.ownerProfile) continue;
      const key = `${f.ownerProfile.isDirector}|${f.ownerProfile.isOfficer}|${f.ownerProfile.isTenPercentOwner}|${f.ownerProfile.officerTitle ?? ''}`;
      if (!seenRoles.has(key)) {
        seenRoles.add(key);
        roles.push(f.ownerProfile);
      }
    }

    return { personCik: normalized, name, filingsByCompany, roles };
  }

  async companyAggregate(ticker: string): Promise<InsiderImpactAggregate> {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    const rows = this.filterInsiderForms(await this.repo.listFilingsForTicker(upper));
    const filings = await this.hydrate(rows);
    return buildAggregate(filings);
  }

  async personAggregate(personCik: string): Promise<InsiderImpactAggregate> {
    const normalized = String(parseInt(personCik, 10));
    const rows = this.filterInsiderForms(await this.repo.listFilingsForPerson(normalized));
    if (rows.length === 0) throw notFound(`Unknown insider person CIK: ${personCik}`);
    const filings = await this.hydrate(rows);
    return buildAggregate(filings);
  }

  async leaderboard(): Promise<InsiderLeaderboardResponse> {
    const rows = this.filterInsiderForms(await this.repo.listAllFilings());
    const filings = await this.hydrate(rows);
    const owners = await this.repo.ownersForAccessions(rows.map((r) => r.accession));

    const filingByAcc = new Map(filings.map((f) => [f.accession, f]));
    const filingsByPerson = new Map<string, { name: string; filings: InsiderFiling[]; companies: Set<string> }>();
    for (const o of owners) {
      const f = filingByAcc.get(o.accession);
      if (!f) continue;
      const v = filingsByPerson.get(o.person_cik);
      if (v) {
        v.filings.push(f);
        v.companies.add(f.ticker);
      } else {
        filingsByPerson.set(o.person_cik, {
          name: o.person_name,
          filings: [f],
          companies: new Set([f.ticker]),
        });
      }
    }

    const codeFreq = new Map<string, number>();
    const out: InsiderLeaderboardRow[] = [];
    for (const [personCik, v] of filingsByPerson) {
      const aggregate = buildAggregate(v.filings);
      out.push({
        personCik,
        name: v.name,
        companies: Array.from(v.companies).sort(),
        filingCount: v.filings.length,
        aggregate,
      });
      for (const [code, bucket] of Object.entries(aggregate.byCode)) {
        codeFreq.set(code, (codeFreq.get(code) ?? 0) + bucket.count);
      }
    }

    const topCodes = Array.from(codeFreq.entries())
      .filter(([code]) => code !== "P" && code !== "S")
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code]) => code);

    out.sort((a, b) => {
      const av = a.aggregate.overall.avgDeltaPct;
      const bv = b.aggregate.overall.avgDeltaPct;
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return Math.abs(bv) - Math.abs(av);
    });

    return { rows: out, topCodes };
  }
}
