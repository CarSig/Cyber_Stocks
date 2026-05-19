import "dotenv/config";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT        PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    const migrationsDir = path.join(__dirname, "migrations");
    const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

    const { rows: applied } = await client.query<{ filename: string }>(
      `SELECT filename FROM schema_migrations ORDER BY filename`,
    );
    const appliedSet = new Set(applied.map((r) => r.filename));

    let ran = 0;
    for (const file of files) {
      if (appliedSet.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
        await client.query("COMMIT");
        console.log(`  apply ${file}`);
        ran++;
      } catch (err) {
        await client.query("ROLLBACK");
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }

    console.log(`\nDone. ${ran} migration(s) applied.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((err: unknown) => {
  console.error("Migration failed:", (err as Error).message);
  process.exit(1);
});
