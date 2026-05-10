import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const STORAGE = path.resolve(__dirname, "../../backend/storage");
const companies: Record<string, string> = {
  "Palo Alto Networks": "PANW", "CrowdStrike": "CRWD", "Fortinet": "FTNT",
  "Zscaler": "ZS", "SentinelOne": "S", "Cloudflare": "NET", "Qualys": "QLYS",
  "Tenable Holdings": "TENB", "Varonis Systems": "VRNS", "NVIDIA": "NVDA",
  "Microsoft": "MSFT", "Apple": "AAPL", "Palantir": "PLTR", "Check Point Software": "CHKP",
};

type Scores = {
  sentiment: number; importance: number; relevance: number;
  summary?: string; topics?: string[]; catalyst?: boolean;
  timeframe?: string; entities?: string[]; model?: string;
};

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let total = 0;
  for (const [companyName, ticker] of Object.entries(companies)) {
    const file = path.join(STORAGE, companyName, "news-analysis.json");
    if (!fs.existsSync(file)) continue;

    const data = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, Scores>;
    const entries = Object.entries(data);
    if (!entries.length) continue;

    for (const [url, s] of entries) {
      await pool.query(
        `INSERT INTO news_analysis (article_url, ticker, company_name, sentiment, importance, relevance, summary, topics, catalyst, timeframe, entities, model)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (article_url) DO NOTHING`,
        [url, ticker, companyName, s.sentiment, s.importance, s.relevance,
         s.summary ?? '', s.topics ?? [], s.catalyst ?? false,
         s.timeframe ?? null, s.entities ?? [], s.model ?? null],
      );
    }
    console.log(`${companyName}: ${entries.length} rows`);
    total += entries.length;
  }

  const { rows: [{ count }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM news_analysis");
  console.log(`\nMigrated: ${total} | DB total: ${count}`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
