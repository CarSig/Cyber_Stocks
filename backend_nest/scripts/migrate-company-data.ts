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

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  let newsTotal = 0, summaryTotal = 0;

  for (const [companyName, ticker] of Object.entries(companies)) {
    const dir = path.join(STORAGE, companyName);

    // Migrate news.json
    const newsFile = path.join(dir, "news.json");
    if (fs.existsSync(newsFile)) {
      const raw = JSON.parse(fs.readFileSync(newsFile, "utf8")) as { news?: Record<string, unknown>[] };
      const articles = raw.news ?? [];
      for (const a of articles) {
        if (!a.link) continue;
        await pool.query(
          `INSERT INTO company_news (id, ticker, company_name, title, link, publisher, published_at, type, thumbnail, related_tickers, raw)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           ON CONFLICT (link) DO NOTHING`,
          [
            crypto.randomUUID(), ticker, companyName,
            a.title ?? "", a.link,
            a.publisher ?? null,
            a.providerPublishTime ? new Date(a.providerPublishTime as string) : null,
            a.type ?? null,
            a.thumbnail ? JSON.stringify(a.thumbnail) : null,
            a.relatedTickers ?? [],
            JSON.stringify(a),
          ],
        );
        newsTotal++;
      }
      process.stdout.write(`${companyName}: ${articles.length} news\n`);
    }

    // Migrate summary.json
    const summaryFile = path.join(dir, "summary.json");
    if (fs.existsSync(summaryFile)) {
      const data = JSON.parse(fs.readFileSync(summaryFile, "utf8")) as Record<string, unknown>;
      await pool.query(
        `INSERT INTO company_summary (ticker, company_name, data, updated_at)
         VALUES ($1,$2,$3,now())
         ON CONFLICT (ticker) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [ticker, companyName, JSON.stringify(data)],
      );
      summaryTotal++;
    }
  }

  const { rows: [nc] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM company_news");
  const { rows: [sc] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM company_summary");
  console.log(`\ncompany_news DB total: ${nc.count} (attempted: ${newsTotal})`);
  console.log(`company_summary DB total: ${sc.count} (upserted: ${summaryTotal})`);
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
