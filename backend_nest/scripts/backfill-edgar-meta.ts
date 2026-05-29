/**
 * One-shot script: re-queries SEC submissions JSON for each ticker in SEC_Archive
 * and rewrites every per-accession _meta.json with the full FilingMetadata shape.
 *
 * Run from backend_nest/:
 *   npx tsx scripts/backfill-edgar-meta.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { COMPANY_CIK, toPaddedCik } from '../src/data/CIK';
import { PATHS } from '../src/shared/paths';
import { type FilingMetadata, isSupportedForm } from '@algo/shared';

const SUBMISSIONS_BASE = 'https://data.sec.gov/submissions';
const SEC_USER_AGENT = 'AlgoTrading/1.0 lovro.boric@gmail.com';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { 'User-Agent': SEC_USER_AGENT, 'Accept-Encoding': 'gzip, deflate' },
  });
  await sleep(110);
  return res;
}

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

async function backfillTicker(ticker: string, cik: string): Promise<number> {
  const archiveDir = PATHS.secArchive(ticker);
  if (!fs.existsSync(archiveDir)) {
    console.log(`  [SKIP] No archive dir for ${ticker}`);
    return 0;
  }

  const paddedCik = toPaddedCik(cik);
  const url = `${SUBMISSIONS_BASE}/CIK${paddedCik}.json`;
  console.log(`  Fetching ${url}`);

  const res = await secFetch(url);
  if (!res.ok) {
    console.error(`  [ERROR] ${res.status} for ${ticker}`);
    return 0;
  }

  const data = (await res.json()) as SubmissionsJson;
  const recent = data.filings.recent;

  // Build accession → index map
  const accIndex = new Map<string, number>();
  for (let i = 0; i < recent.accessionNumber.length; i++) {
    accIndex.set(recent.accessionNumber[i], i);
  }

  const accessionDirs = fs.readdirSync(archiveDir).filter((entry) => {
    if (entry === 'coverage.json') return false;
    return fs.statSync(path.join(archiveDir, entry)).isDirectory();
  });

  let updated = 0;
  for (const accession of accessionDirs) {
    const idx = accIndex.get(accession);
    if (idx === undefined) {
      console.log(`  [MISS] ${accession} not found in submissions JSON (may be old/archived)`);
      continue;
    }

    const form = recent.form[idx];
    const rawItems = recent.items?.[idx];
    const meta: FilingMetadata = {
      accession,
      cik,
      form: isSupportedForm(form) ? form : '8-K',
      filingDate: recent.filingDate[idx],
      reportDate: recent.reportDate?.[idx] || undefined,
      acceptanceDateTime: recent.acceptanceDateTime?.[idx] || undefined,
      primaryDocument: recent.primaryDocument[idx] ?? '',
      primaryDocDescription: recent.primaryDocDescription?.[idx] || undefined,
      items: rawItems ? rawItems.split(',').map((s) => s.trim()).filter(Boolean) : undefined,
      isXBRL: !!recent.isXBRL?.[idx],
      isInlineXBRL: !!recent.isInlineXBRL?.[idx],
      size: recent.size?.[idx] ?? 0,
    };

    const metaPath = path.join(archiveDir, accession, '_meta.json');
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
    updated++;
  }

  console.log(`  Updated ${updated}/${accessionDirs.length} accessions for ${ticker}`);
  return updated;
}

async function main() {
  const archiveRoot = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'storage',
    'SEC_Archive',
  );

  if (!fs.existsSync(archiveRoot)) {
    console.error(`SEC_Archive not found at ${archiveRoot}`);
    process.exit(1);
  }

  const tickers = fs.readdirSync(archiveRoot).filter((t) =>
    fs.statSync(path.join(archiveRoot, t)).isDirectory(),
  );

  console.log(`Backfilling ${tickers.length} tickers: ${tickers.join(', ')}\n`);

  let total = 0;
  for (const ticker of tickers) {
    const cik = COMPANY_CIK[ticker];
    if (!cik) {
      console.log(`[SKIP] ${ticker} — not in COMPANY_CIK map`);
      continue;
    }
    console.log(`[${ticker}]`);
    total += await backfillTicker(ticker, String(cik));
  }

  console.log(`\nDone. ${total} _meta.json files updated.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
