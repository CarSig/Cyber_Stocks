import fs from "fs";
import path from "path";
import { getCik, toPaddedCik } from "@/data/CIK";
import { PATHS } from "@/shared/paths";
import { logger } from "@/shared/logger";

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

const DEFAULT_FORM_TYPES = [
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
      form: string[];
      primaryDocument: string[];
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
  date?: string;
  form?: string;
  cik?: string;
  primaryDoc?: string;
};

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

export class SecEdgarClient {
  async sync(
    ticker: string,
    dateFrom?: string,
    dateTo?: string,
    formTypes: string[] = DEFAULT_FORM_TYPES,
    force = false,
  ): Promise<SyncResult> {
    const cik = getCik(ticker);
    if (!cik) throw new Error(`Unknown ticker: ${ticker}`);

    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom ? new Date(dateFrom) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fromStr = startDate.toISOString().slice(0, 10);
    const toStr = endDate.toISOString().slice(0, 10);

    const paddedCik = toPaddedCik(cik);
    const submissionsUrl = `${SUBMISSIONS_BASE}/CIK${paddedCik}.json`;
    const subRes = await secFetch(submissionsUrl);
    if (!subRes.ok) throw new Error(`SEC submissions fetch failed: ${subRes.status} ${submissionsUrl}`);

    const submissions = await subRes.json() as SubmissionsJson;
    const recent = submissions.filings.recent;

    const matched: { accession: string; form: string; date: string }[] = [];
    for (let i = 0; i < recent.accessionNumber.length; i++) {
      const date = recent.filingDate[i];
      const form = recent.form[i];
      if (date < fromStr || date > toStr) continue;
      if (!formTypes.includes(form)) continue;
      matched.push({ accession: recent.accessionNumber[i], form, date });
    }

    logger.info({ ticker, matched: matched.length, from: fromStr, to: toStr }, "SEC: matched filings");

    let filesAdded = 0;
    let skippedFilings = 0;

    for (const filing of matched) {
      const accDashes = filing.accession;
      const accNoDashes = accDashes.replace(/-/g, "");
      const destDir = path.join(PATHS.secArchive(ticker), accDashes);

      if (!force && fs.existsSync(destDir) && fs.readdirSync(destDir).length > 0) {
        skippedFilings++;
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
      const items = Array.isArray(index.directory.item)
        ? index.directory.item
        : [index.directory.item];

      const downloadable = items.filter((item) => item?.name && !shouldSkipFile(item.name));
      const primaryDoc = downloadable.find((item) => /\.(htm|html|txt)$/i.test(item.name)) ?? downloadable[0];

      fs.mkdirSync(destDir, { recursive: true });
      fs.writeFileSync(
        path.join(destDir, "_meta.json"),
        JSON.stringify({ date: filing.date, form: filing.form, cik, primaryDoc: primaryDoc?.name ?? null }),
      );

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

      logger.info({ ticker, accession: accDashes, form: filing.form, files: items.length }, "SEC: filing saved");
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
        let date: string | undefined;
        let form: string | undefined;
        let cik: string | undefined;
        let primaryDoc: string | undefined;
        if (fs.existsSync(metaPath)) {
          try {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as { date?: string; form?: string; cik?: string; primaryDoc?: string };
            date = meta.date;
            form = meta.form;
            cik = meta.cik;
            primaryDoc = meta.primaryDoc ?? undefined;
          } catch { /* ignore malformed meta */ }
        }
        return { accession, files: allFiles.filter((f) => f !== "_meta.json"), date, form, cik, primaryDoc };
      })
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }

  getCoverage(ticker: string): CoverageIndex {
    return readCoverage(ticker);
  }
}
