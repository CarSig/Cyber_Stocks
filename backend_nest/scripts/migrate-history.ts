import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const STORAGE = path.resolve(__dirname, "../storage");
const companies: Record<string, string> = {
  "Palo Alto Networks": "PANW", "CrowdStrike": "CRWD", "Fortinet": "FTNT",
  "Zscaler": "ZS", "SentinelOne": "S", "Cloudflare": "NET", "Qualys": "QLYS",
  "Tenable Holdings": "TENB", "Varonis Systems": "VRNS", "NVIDIA": "NVDA",
  "Microsoft": "MSFT", "Apple": "AAPL", "Palantir": "PLTR", "Check Point Software": "CHKP",
};

type QuoteRow = { date: string; open?: number; high?: number; low?: number; close?: number; adjclose?: number; volume?: number };

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS stock_meta (
      ticker       TEXT        PRIMARY KEY,
      company_name TEXT        NOT NULL,
      data         JSONB       NOT NULL,
      updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS stock_quotes (
      ticker   TEXT  NOT NULL,
      date     DATE  NOT NULL,
      open     REAL,
      high     REAL,
      low      REAL,
      close    REAL,
      adjclose REAL,
      volume   BIGINT,
      PRIMARY KEY (ticker, date)
    );
    CREATE INDEX IF NOT EXISTS stock_quotes_ticker_date_idx ON stock_quotes (ticker, date DESC);
  `);

  for (const [companyName, ticker] of Object.entries(companies)) {
    const file = path.join(STORAGE, companyName, "history.json");
    if (!fs.existsSync(file)) {
      process.stdout.write(`${companyName}: file not found, skipping\n`);
      continue;
    }

    const raw = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
    const quotes = (raw["quotes"] ?? []) as QuoteRow[];
    const meta = Object.fromEntries(Object.entries(raw).filter(([k]) => k !== "quotes"));

    // Upsert meta
    await pool.query(
      `INSERT INTO stock_meta (ticker, company_name, data, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (ticker) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [ticker, companyName, JSON.stringify(meta)],
    );

    // Deduplicate quotes by date (take last occurrence per date)
    const byDate = new Map<string, QuoteRow>();
    for (const q of quotes) {
      const date = String(q.date ?? "").slice(0, 10);
      if (date) byDate.set(date, q);
    }

    let inserted = 0;
    for (const [date, q] of byDate) {
      const result = await pool.query(
        `INSERT INTO stock_quotes (ticker, date, open, high, low, close, adjclose, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (ticker, date) DO NOTHING`,
        [ticker, date, q.open ?? null, q.high ?? null, q.low ?? null,
         q.close ?? null, q.adjclose ?? null, q.volume ?? null],
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
    }

    process.stdout.write(`${companyName} (${ticker}): ${inserted}/${byDate.size} quotes inserted\n`);
  }

  const { rows: [qc] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM stock_quotes");
  const { rows: [mc] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM stock_meta");
  const { rows: perTicker } = await pool.query<{ ticker: string; count: string }>(
    "SELECT ticker, COUNT(*) FROM stock_quotes GROUP BY ticker ORDER BY ticker",
  );
  console.log(`\nstock_meta rows: ${mc.count}`);
  console.log(`stock_quotes total: ${qc.count}`);
  console.log("Per ticker:", Object.fromEntries(perTicker.map((r) => [r.ticker, r.count])));

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
