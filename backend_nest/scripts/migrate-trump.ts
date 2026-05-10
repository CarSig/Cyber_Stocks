import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const TRUMP_PATH    = path.resolve(__dirname, "../../backend/socials/trump_posts.json");
const ANALYZED_PATH = path.resolve(__dirname, "../../backend/socials/analyzed_posts.json");

type RawPost = { id: string; created_at: string; content: string; url?: string };
type AnalyzedPost = RawPost & { analysis?: { sentiment?: string; tags?: string[]; companies?: { ticker: string; value: number }[] } };

async function main() {
  const posts: RawPost[] = fs.existsSync(TRUMP_PATH)
    ? JSON.parse(fs.readFileSync(TRUMP_PATH, "utf8")) as RawPost[]
    : [];

  const analyzed: AnalyzedPost[] = fs.existsSync(ANALYZED_PATH)
    ? JSON.parse(fs.readFileSync(ANALYZED_PATH, "utf8")) as AnalyzedPost[]
    : [];

  console.log(`trump_posts.json: ${posts.length} posts`);
  console.log(`analyzed_posts.json: ${analyzed.length} posts`);

  // Build lookup map from analyzed posts
  const analysisMap = new Map(analyzed.map((p) => [p.id, p.analysis]));

  // Merge: start from the full archive, overlay analysis where available
  const allIds = new Set([...posts.map((p) => p.id), ...analyzed.map((p) => p.id)]);
  const postMap = new Map([...posts, ...analyzed].map((p) => [p.id, p]));

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: [{ count: before }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM trump_posts");
  console.log(`Rows in trump_posts before: ${before}`);

  const BATCH = 500;
  const allPosts = [...allIds].map((id) => postMap.get(id)!);
  let insertedPosts = 0;

  for (let i = 0; i < allPosts.length; i += BATCH) {
    const batch = allPosts.slice(i, i + BATCH);
    const values = batch.map((_, j) => {
      const b = j * 6;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6})`;
    }).join(", ");
    const params = batch.flatMap((p) => {
      const analysis = analysisMap.get(p.id);
      return [
        p.id,
        new Date(p.created_at),
        p.content.replace(/<[^>]*>/g, "").trim(),
        p.url || `https://truthsocial.com/@realDonaldTrump/${p.id}`,
        analysis?.sentiment ?? null,
        analysis?.tags ?? [],
      ];
    });
    const result = await pool.query(
      `INSERT INTO trump_posts (id, created_at, content, url, sentiment, tags)
       VALUES ${values}
       ON CONFLICT (id) DO NOTHING`,
      params,
    );
    insertedPosts += result.rowCount ?? 0;
    process.stdout.write(`\rPosts: ${i + batch.length}/${allPosts.length}...`);
  }

  // Insert ticker associations from analyzed posts
  let insertedTickers = 0;
  for (const p of analyzed) {
    const companies = p.analysis?.companies ?? [];
    for (const c of companies) {
      await pool.query(
        `INSERT INTO trump_post_tickers (post_id, ticker, value)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [p.id, c.ticker, c.value ?? 1],
      );
      insertedTickers++;
    }
  }

  const { rows: [{ count: after }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM trump_posts");
  const { rows: [{ count: tickerCount }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM trump_post_tickers");
  console.log(`\nInserted posts: ${insertedPosts}, ticker associations: ${insertedTickers}`);
  console.log(`trump_posts total: ${after}, trump_post_tickers total: ${tickerCount}`);
  console.log("Done.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
