# SEC EDGAR Archive

## Overview

The EDGAR archive feature downloads SEC filings for tracked companies, stores them locally under `storage/SEC_Archive/`, and surfaces them in the frontend with price-chart overlays and filing impact analysis.

## Supported form types (`FormType`)

Defined as a TypeScript const-tuple union in `shared/src/types.ts` (`SUPPORTED_FORMS`). All form strings in the system must be members of this union.

| Category | Forms |
|---|---|
| Earnings & operations | `10-K`, `10-K/A`, `10-Q`, `10-Q/A`, `8-K`, `8-K/A` |
| Proxy | `DEF 14A`, `DEFA14A`, `DEFM14A`, `PRE 14A`, `DEFR14A`, `PREM14A` |
| Insider transactions | `3`, `4`, `5` |
| Beneficial ownership | `SC 13G`, `SC 13G/A`, `SC 13D`, `SC 13D/A` |
| M&A | `425`, `SC TO-T`, `SC TO-I`, `S-4` |
| Capital raises | `S-1`, `S-1/A`, `S-3`, `S-3/A`, `424B4`, `424B3`, `424B5`, `FWP` |
| Institutional holdings | `13F-HR`, `13F-HR/A` |
| Foreign issuers | `20-F`, `20-F/A`, `6-K`, `40-F` |
| Admin / SEC correspondence | `CORRESP`, `UPLOAD`, `EFFECT`, `SD` |

**Default sync set** (what `POST /edgar/sync` downloads when `formTypes` is omitted):
`10-K`, `10-Q`, `8-K`, `8-K/A`, `DEF 14A`, `DEFA14A`, `DEFM14A`, `3`, `4`, `5`, `SC 13G`, `SC 13D`, `SC 13D/A`, `425`, `SC TO-T`, `SC TO-I`, `S-4`, `S-3`, `424B4`, `FWP`, `S-1`

## Filing metadata (`FilingMetadata`)

Every downloaded accession folder contains a `_meta.json` file conforming to the `FilingMetadata` type (defined in `shared/src/types.ts`):

```ts
type FilingMetadata = {
  accession: string;           // "0001104659-24-057449"
  cik: string;                 // unpadded CIK, e.g. "1535527"
  form: FormType;              // enforced union member
  filingDate: string;          // YYYY-MM-DD — when SEC received the filing
  reportDate?: string;         // YYYY-MM-DD — period the filing covers (often differs from filingDate)
  acceptanceDateTime?: string; // ISO 8601 with time-of-day
  primaryDocument: string;     // filename of the main document in the accession folder
  primaryDocDescription?: string;
  items?: string[];            // 8-K item codes, e.g. ["2.02", "9.01"] = earnings + exhibit
  isXBRL: boolean;
  isInlineXBRL: boolean;
  size: number;                // total filing size in bytes per SEC
};
```

The `items` field is particularly useful for classifying 8-Ks without parsing the document body:
- `2.02` — Results of Operations (earnings)
- `1.05` — Material Cybersecurity Incident
- `5.02` — Departure/Appointment of Officers or Directors
- `8.01` — Other Events (catch-all)

## Storage layout

```
storage/SEC_Archive/
  {TICKER}/
    coverage.json          — sorted, non-overlapping date ranges already synced
    {accession}/
      _meta.json           — FilingMetadata for this filing
      {primaryDoc}.htm     — main filing document (HTML/HTM/TXT)
      ...                  — supporting documents (PDFs, exhibits, etc.)
```

XBRL/XML files, images, and index artifacts are skipped during download (see `SKIP_EXTENSIONS` and `SKIP_FILENAME_PATTERNS` in `SecEdgarClient.ts`).

## Coverage model

Each ticker has a `coverage.json` that tracks which date ranges have been downloaded. Before syncing, `findGaps()` computes uncovered ranges so duplicate downloads are avoided. After sync, the new range is merged into the index.

```ts
type CoverageIndex = {
  ticker: string;
  ranges: CoverageRange[];  // sorted, non-overlapping
};
type CoverageRange = { from: string; to: string };  // YYYY-MM-DD
```

## API endpoints

All routes are under `/edgar` (Bearer auth required). See `docs/backend/api.md` for full auth tiers.

| Method | Route | Description |
|---|---|---|
| `GET` | `/edgar/tickers` | List all supported tickers (from `COMPANY_CIK` map) |
| `POST` | `/edgar/sync` | Download filings for a ticker + date range |
| `GET` | `/edgar/files/:ticker` | List locally saved filings with `FilingMetadata` |
| `GET` | `/edgar/coverage/:ticker` | Return coverage index for a ticker |

### `POST /edgar/sync` body

```json
{
  "ticker": "CRWD",
  "dateFrom": "2024-01-01",   // optional, defaults to 60 days ago
  "dateTo": "2024-12-31",     // optional, defaults to today
  "formTypes": ["10-K", "8-K"],  // optional, defaults to standard set
  "force": false              // optional, re-download even if already present
}
```

`formTypes` values are validated against `SUPPORTED_FORMS` at the API boundary — unknown form strings are rejected.

## Scheduled new-filings polling

`CronService.runEdgarNewFilings()` runs hourly (`0 * * * *`). For each ticker in `COMPANY_CIK` it:

1. Fetches `https://data.sec.gov/submissions/CIK{paddedCik}.json` via `SecEdgarClient.fetchRecentFilings()`.
2. **Archive backfill (decoupled from notifications):** diffs the returned accessions against `edgar.filings` (`SecFilingsRepository.findAccessionsByTicker`) and calls `EdgarService.sync(ticker, earliestMissingDate)` for any not yet downloaded. Coverage logic + `ON CONFLICT` upserts prevent re-downloading.
3. **Notification watermark:** reads `edgar.poll_state.last_seen_at` for the ticker (`getPollState`). A filing notifies only if its SEC `acceptanceDateTime` is strictly after that watermark. The watermark then advances to the newest `acceptanceDateTime` in the feed (`setPollState`).
4. **First run** (no `poll_state` row): seeds the watermark to the newest acceptance time in the feed and notifies nothing — no initial backlog burst.

**Why a separate `edgar.poll_state` table and not `max(filing_date)`?** The `edgar.filings` archive is an incomplete backfill (some tickers are years stale), so it records what was *downloaded*, not what was *notified*. Using it as the watermark dumped the entire backlog as "new" (e.g. a ticker stuck at a 2024 filing reported ~2 years of filings). The dedicated watermark tracks "last seen by the poller," independent of the archive.

On non-zero new filings, the cron emits an internal `edgar.new_filings` event carrying `{ count, changes: { ticker, count }[] }`. `EventBridgeService` translates that into an SSE notification of the same name with a per-ticker message like `"CRWD +2, AAPL +1"` (sorted by count desc). `NotificationBell` renders the `changes` array directly so each ticker appears as its own chip.

**Why not the EDGAR full-text search backend (`efts.sec.gov/LATEST/search-index`)?** Undocumented, ranked-relevance output, not optimized for "newest since X". The per-issuer `submissions.json` is the authoritative, documented primitive.

## Rate limiting

SEC's EDGAR API enforces a 10 req/sec limit. `SecEdgarClient` sleeps 110ms between every request. The SEC `User-Agent` header is required and set to `AlgoTrading/1.0 lovro.boric@gmail.com`.

## Backfilling existing metadata

If filings were downloaded before `FilingMetadata` was introduced (old `_meta.json` had only `date`, `form`, `cik`, `primaryDoc`), run the one-shot backfill script from `backend_nest/`:

```bash
npx tsx scripts/backfill-edgar-meta.ts
```

This re-fetches the SEC submissions JSON once per ticker and rewrites all `_meta.json` files with the full schema. Does not download any new filings.

## Tracked companies

Defined in `backend_nest/src/data/CIK.ts` (`COMPANY_CIK` map). Currently 24 companies including AAPL, MSFT, AMZN, GOOGL, META, TSLA, NVDA, CRWD, PANW, FTNT, DDOG, CSCO, and others.

## Frontend

- **Page**: `/edgar-archive` — download orchestration, filing browser, price chart with filing overlays
- **Research pages**: `/research/edgar-uses`, `/research/edgar-deeper`, `/research/edgar-entities`, `/research/edgar-8k-items`
- **Key hook**: `useSecFilingImpact(ticker, lagDays)` — computes price impact grouped by form type
- **Chart plugin**: `secFilingsOverlay` — overlays filing markers on price charts, click for modal with links to SEC
