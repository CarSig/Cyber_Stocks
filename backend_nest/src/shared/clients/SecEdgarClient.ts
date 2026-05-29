import fs from "fs";
import path from "path";
import { getCik, toPaddedCik } from "@/data/CIK";
import { PATHS } from "@/shared/paths";
import { logger } from "@/shared/logger";
import { type FormType, type FilingMetadata, isSupportedForm, SUPPORTED_FORMS } from "@algo/shared";
import type { SecFilingsRepository } from "@/modules/edgar/sec-filings.repository";
import { parseInsiderSgmlHeader } from "@/modules/insiders/insider.parser";
import { parseForm4Xml, parseOwnerProfile } from "@/modules/insiders/form4.parser";

const SEC_USER_AGENT = "AlgoTrading/1.0 lovro.boric@gmail.com";

const SKIP_EXTENSIONS = new Set([
  // XBRL
  '.xml', '.xsd', '.xslt',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico',
  // Index/header artifacts
  '.hdr',
]);

const SKIP_FILENAME_PATTERNS = [
  /[-_]cal\.xml$/i,
  /[-_]def\.xml$/i,
  /[-_]lab\.xml$/i,
  /[-_]pre\.xml$/i,
  /[-_]ref\.xml$/i,
  /-index-headers/i,
  /FilingSummary/i,
  /R\d+\.htm$/,  // XBRL viewer fragments
];

function shouldSkipFile(name: string): boolean {
  const ext = name.slice(name.lastIndexOf('.')).toLowerCase();
  if (SKIP_EXTENSIONS.has(ext)) return true;
  return SKIP_FILENAME_PATTERNS.some((p) => p.test(name));
}

const SUBMISSIONS_BASE = "https://data.sec.gov/submissions";
const EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data";

const DEFAULT_FORM_TYPES: FormType[] = [
  // Earnings & operations
  "10-K", "10-Q", "8-K", "8-K/A",
  // Proxy
  "DEF 14A", "DEFA14A", "DEFM14A",
  // Insider
  "3", "4", "5",
  // Ownership
  "SC 13G", "SC 13D", "SC 13D/A",
  // M&A
  "425", "SC TO-T", "SC TO-I", "S-4",
  // Capital raises
  "S-3", "424B4", "FWP", "S-1",
];

// ── Coverage index ────────────────────────────────────────────────────────────
// Stored at <tickerDir>/coverage.json — single source of truth for which date
// ranges have been downloaded. No DB involved.

export type CoverageRange = { from: string; to: string };

export type CoverageIndex = {
  ticker: string;
  ranges: CoverageRange[];  // sorted, non-overlapping
};

function coveragePath(ticker: string): string {
  return path.join(PATHS.secArchive(ticker), "coverage.json");
}

function readCoverage(ticker: string): CoverageIndex {
  const p = coveragePath(ticker);
  if (!fs.existsSync(p)) return { ticker, ranges: [] };
  try {
    return JSON.parse(fs.readFileSync(p, "utf8")) as CoverageIndex;
  } catch {
    return { ticker, ranges: [] };
  }
}

function writeCoverage(coverage: CoverageIndex): void {
  const dir = PATHS.secArchive(coverage.ticker);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(coveragePath(coverage.ticker), JSON.stringify(coverage, null, 2));
}

export function writeCoverageForTicker(ticker: string, from: string, to: string): void {
  const coverage = readCoverage(ticker);
  coverage.ranges = mergeRange(coverage.ranges, { from, to });
  writeCoverage(coverage);
}

function mergeRange(ranges: CoverageRange[], newRange: CoverageRange): CoverageRange[] {
  const all = [...ranges, newRange].sort((a, b) => a.from.localeCompare(b.from));
  const merged: CoverageRange[] = [];
  for (const r of all) {
    const last = merged[merged.length - 1];
    if (last && r.from <= nextDay(last.to)) {
      last.to = last.to > r.to ? last.to : r.to;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function nextDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function prevDay(dateStr: string): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function findGaps(ticker: string, from: string, to: string): CoverageRange[] {
  const { ranges } = readCoverage(ticker);
  const gaps: CoverageRange[] = [];
  let cursor = from;
  for (const r of ranges) {
    if (r.to < from || r.from > to) continue;
    const start = r.from > from ? r.from : from;
    if (cursor < start) gaps.push({ from: cursor, to: prevDay(start) });
    const after = nextDay(r.to);
    if (after > cursor) cursor = after;
  }
  if (cursor <= to) gaps.push({ from: cursor, to });
  return gaps;
}

// ── SEC types ─────────────────────────────────────────────────────────────────

type SubmissionsJson = {
  cik: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      acceptanceDateTime: string[];
      form: string[];
      primaryDocument: string[];
      primaryDocDescription: string[];
      items: string[];
      size: number[];
      isXBRL: number[];
      isInlineXBRL: number[];
    };
  };
};

type FilingIndexFile = {
  name: string;
  type: string;
  size: string;
};

type FilingIndex = {
  directory: {
    item: FilingIndexFile[] | FilingIndexFile;
    name: string;
  };
};

export type SyncResult = {
  filesAdded: number;
  skippedFilings: number;
  coveredRanges: CoverageRange[];
  gaps: CoverageRange[];
};

export type LocalFileListing = {
  accession: string;
  files: string[];
  meta?: FilingMetadata;
};

export { type FormType, type FilingMetadata, isSupportedForm, SUPPORTED_FORMS };

// ── HTTP ──────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept-Encoding": "gzip, deflate" },
  });
  await sleep(110); // SEC rate limit: max 10 req/sec
  return res;
}

// ── Client ────────────────────────────────────────────────────────────────────

export type SyncProgressEvent = { current: number; total: number; form: string; accession: string };

export type RecentFiling = {
  accession: string;
  form: string;
  filingDate: string;
  acceptanceDateTime?: string;
};

export class SecEdgarClient {
  constructor(private readonly repo?: SecFilingsRepository) {}

  async fetchRecentFilings(ticker: string): Promise<RecentFiling[]> {
    const cik = getCik(ticker);
    if (!cik) throw new Error(`Unknown ticker: ${ticker}`);
    const paddedCik = toPaddedCik(cik);
    const submissionsUrl = `${SUBMISSIONS_BASE}/CIK${paddedCik}.json`;
    const res = await secFetch(submissionsUrl);
    if (!res.ok) throw new Error(`SEC submissions fetch failed: ${res.status} ${submissionsUrl}`);
    const submissions = await res.json() as SubmissionsJson;
    const recent = submissions.filings.recent;
    const out: RecentFiling[] = [];
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const form = recent.form[i];
      if (!isSupportedForm(form) || !DEFAULT_FORM_TYPES.includes(form as FormType)) continue;
      out.push({
        accession: recent.accessionNumber[i],
        form,
        filingDate: recent.filingDate[i],
        acceptanceDateTime: recent.acceptanceDateTime?.[i] || undefined,
      });
    }
    return out;
  }

  private async indexFilingToDb(
    ticker: string,
    cik: string,
    meta: FilingMetadata,
    files: string[],
    destDir: string,
  ): Promise<void> {
    if (!this.repo) return;
    try {
      let header = null;
      let transactions: ReturnType<typeof parseForm4Xml> = [];
      let ownerProfile: ReturnType<typeof parseOwnerProfile> = undefined;
      const txtFile = path.join(destDir, `${meta.accession}.txt`);
      if (fs.existsSync(txtFile)) {
        const fullText = fs.readFileSync(txtFile, "utf8");
        header = parseInsiderSgmlHeader(fullText);
        if (header?.formType === "4" || header?.formType === "4/A") {
          transactions = parseForm4Xml(fullText);
          ownerProfile = parseOwnerProfile(fullText);
        }
      }

      await this.repo.upsertFiling({
        accession: meta.accession,
        ticker,
        issuerCik: meta.cik || cik,
        form: meta.form,
        filingDate: meta.filingDate,
        reportPeriod: meta.reportDate ?? null,
        primaryDocument: meta.primaryDocument ?? null,
        items: meta.items ?? null,
        files,
        isXBRL: meta.isXBRL,
        isInlineXBRL: meta.isInlineXBRL,
        sizeBytes: meta.size,
      });

      if (header) {
        await this.repo.replaceOwners(meta.accession, [{
          personCik: header.ownerCik,
          personName: header.ownerName,
          profile: ownerProfile,
        }]);
      }

      if (transactions.length > 0) {
        await this.repo.replaceTransactions(meta.accession, transactions);
      }
    } catch (e) {
      logger.warn({ err: e, accession: meta.accession }, "SEC: DB index failed");
    }
  }

  async sync(
    ticker: string,
    dateFrom?: string,
    dateTo?: string,
    formTypes: FormType[] = DEFAULT_FORM_TYPES,
    force = false,
    onProgress?: (event: SyncProgressEvent) => void,
  ): Promise<SyncResult> {
    const cik = getCik(ticker);
    if (!cik) throw new Error(`Unknown ticker: ${ticker}`);

    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const fromStr = startDate.toISOString().slice(0, 10);
    const toStr = endDate.toISOString().slice(0, 10);

    const paddedCik = toPaddedCik(cik);
    const submissionsUrl = `${SUBMISSIONS_BASE}/CIK${paddedCik}.json`;
    const subRes = await secFetch(submissionsUrl);
    if (!subRes.ok) throw new Error(`SEC submissions fetch failed: ${subRes.status} ${submissionsUrl}`);

    const submissions = await subRes.json() as SubmissionsJson;
    const recent = submissions.filings.recent;

    type MatchedFiling = {
      accession: string;
      form: FormType;
      filingDate: string;
      reportDate?: string;
      acceptanceDateTime?: string;
      primaryDocument: string;
      primaryDocDescription?: string;
      items?: string[];
      isXBRL: boolean;
      isInlineXBRL: boolean;
      size: number;
    };
    const matched: MatchedFiling[] = [];
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const date = recent.filingDate[i];
      const form = recent.form[i];
      if (date < fromStr || date > toStr) continue;
      if (!isSupportedForm(form) || !formTypes.includes(form as FormType)) continue;
      const rawItems = recent.items?.[i];
      matched.push({
        accession: recent.accessionNumber[i],
        form: form as FormType,
        filingDate: date,
        reportDate: recent.reportDate?.[i] || undefined,
        acceptanceDateTime: recent.acceptanceDateTime?.[i] || undefined,
        primaryDocument: recent.primaryDocument[i] ?? '',
        primaryDocDescription: recent.primaryDocDescription?.[i] || undefined,
        items: rawItems ? rawItems.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
        isXBRL: !!recent.isXBRL?.[i],
        isInlineXBRL: !!recent.isInlineXBRL?.[i],
        size: recent.size?.[i] ?? 0,
      });
    }

    logger.info({ ticker, matched: matched.length, from: fromStr, to: toStr }, "SEC: matched filings");

    let filesAdded = 0;
    let skippedFilings = 0;
    let filingsDone = 0;

    for (const filing of matched) {
      const accDashes = filing.accession;
      const accNoDashes = accDashes.replace(/-/g, "");
      const destDir = path.join(PATHS.secArchive(ticker), accDashes);

      if (!force && fs.existsSync(destDir) && fs.readdirSync(destDir).length > 0) {
        skippedFilings++;
        filingsDone++;
        onProgress?.({ current: filingsDone, total: matched.length, form: filing.form, accession: accDashes });
        continue;
      }

      const indexUrl = `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}/index.json`;
      logger.info({ indexUrl }, "SEC: fetching index");
      const idxRes = await secFetch(indexUrl);
      if (!idxRes.ok) {
        logger.warn({ ticker, accession: accDashes, status: idxRes.status, indexUrl }, "SEC: index fetch failed, skipping");
        skippedFilings++;
        continue;
      }

      const index = await idxRes.json() as FilingIndex;
      const indexItems = Array.isArray(index.directory.item)
        ? index.directory.item
        : [index.directory.item];

      const downloadable = indexItems.filter((item) => item?.name && !shouldSkipFile(item.name));
      const primaryDocFile = downloadable.find((item) => /\.(htm|html|txt)$/i.test(item.name)) ?? downloadable[0];

      const meta: FilingMetadata = {
        accession: accDashes,
        cik,
        form: filing.form,
        filingDate: filing.filingDate,
        reportDate: filing.reportDate,
        acceptanceDateTime: filing.acceptanceDateTime,
        primaryDocument: primaryDocFile?.name ?? filing.primaryDocument,
        primaryDocDescription: filing.primaryDocDescription,
        items: filing.items,
        isXBRL: filing.isXBRL,
        isInlineXBRL: filing.isInlineXBRL,
        size: filing.size,
      };

      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(path.join(destDir, "_meta.json"), JSON.stringify(meta, null, 2));

      for (const item of downloadable) {
        const fileUrl = `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}/${item.name}`;
        const fileRes = await secFetch(fileUrl);
        if (!fileRes.ok) {
          logger.warn({ ticker, file: item.name, status: fileRes.status }, "SEC: file fetch failed");
          continue;
        }
        const buf = Buffer.from(await fileRes.arrayBuffer());
        fs.writeFileSync(path.join(destDir, item.name), buf);
        filesAdded++;
      }

      logger.info({ ticker, accession: accDashes, form: filing.form, files: indexItems.length }, "SEC: filing saved");

      const writtenFiles = downloadable.map((d) => d.name);
      await this.indexFilingToDb(ticker, cik, meta, writtenFiles, destDir);

      filingsDone++;
      onProgress?.({ current: filingsDone, total: matched.length, form: filing.form, accession: accDashes });
    }

    // Update coverage — mark this entire date range as covered
    const coverage = readCoverage(ticker);
    coverage.ranges = mergeRange(coverage.ranges, { from: fromStr, to: toStr });
    writeCoverage(coverage);

    const gaps = findGaps(ticker, fromStr, toStr);

    logger.info({ ticker, filesAdded, skippedFilings }, "SEC: sync complete");
    return { filesAdded, skippedFilings, coveredRanges: coverage.ranges, gaps };
  }

  listLocalFiles(ticker: string): LocalFileListing[] {
    const dir = PATHS.secArchive(ticker);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((entry) => {
        if (entry === "coverage.json") return false;
        return fs.statSync(path.join(dir, entry)).isDirectory();
      })
      .map((accession) => {
        const accDir = path.join(dir, accession);
        const allFiles = fs.readdirSync(accDir);
        const metaPath = path.join(accDir, "_meta.json");
        let meta: FilingMetadata | undefined;
        if (fs.existsSync(metaPath)) {
          try {
            const raw = JSON.parse(fs.readFileSync(metaPath, "utf8"));
            // Support both new FilingMetadata shape and legacy { date, form, cik, primaryDoc }
            if (raw.filingDate) {
              meta = raw as FilingMetadata;
            } else if (raw.date && raw.form) {
              meta = {
                accession,
                cik: raw.cik ?? '',
                form: isSupportedForm(raw.form) ? raw.form : '8-K' as FormType,
                filingDate: raw.date,
                primaryDocument: raw.primaryDoc ?? '',
                isXBRL: false,
                isInlineXBRL: false,
                size: 0,
              };
            }
          } catch { /* ignore malformed meta */ }
        }
        return { accession, files: allFiles.filter((f) => f !== "_meta.json"), meta };
      })
      .sort((a, b) => (b.meta?.filingDate ?? '').localeCompare(a.meta?.filingDate ?? ''));
  }

  getCoverage(ticker: string): CoverageIndex {
    return readCoverage(ticker);
  }
}
