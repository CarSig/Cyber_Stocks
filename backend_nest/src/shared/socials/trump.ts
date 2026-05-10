import https from "https";
import { logger } from "../logger";
import { Pool } from "pg";

const ARCHIVE_URL = "https://ix.cnn.io/data/truth-social/truth_archive.json";

type TrumpPost = {
  id: string;
  created_at: string;
  content: string;
  url?: string;
};

function fetchJSON(url: string): Promise<TrumpPost[]> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data) as TrumpPost[]);
          } catch (e) {
            reject(new Error("Failed to parse JSON: " + (e as Error).message));
          }
        });
      })
      .on("error", reject);
  });
}

export async function fetchTrump(pool: Pool): Promise<void> {
  logger.info("fetching Trump Truth Social posts");

  const allPosts = await fetchJSON(ARCHIVE_URL);

  const cleaned = allPosts.map((p) => ({
    id: p.id,
    created_at: p.created_at,
    content: p.content.replace(/<[^>]*>/g, "").trim(),
    url: p.url || `https://truthsocial.com/@realDonaldTrump/${p.id}`,
  }));

  if (cleaned.length === 0) return;

  // Batch insert, skip duplicates
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < cleaned.length; i += BATCH) {
    const batch = cleaned.slice(i, i + BATCH);
    const values = batch.map((_, j) => {
      const b = j * 4;
      return `($${b+1},$${b+2},$${b+3},$${b+4})`;
    }).join(", ");
    const params = batch.flatMap((p) => [p.id, new Date(p.created_at), p.content, p.url]);
    const result = await pool.query(
      `INSERT INTO trump_posts (id, created_at, content, url)
       VALUES ${values}
       ON CONFLICT (id) DO NOTHING`,
      params,
    );
    inserted += result.rowCount ?? 0;
  }

  const { rows: [{ count }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM trump_posts");
  logger.info({ newPosts: inserted, total: Number(count) }, "Trump posts updated");
}

// --- OLD FILE-BASED IMPLEMENTATION ---
// Loaded existing from file, deduped by id, wrote merged array back to disk
