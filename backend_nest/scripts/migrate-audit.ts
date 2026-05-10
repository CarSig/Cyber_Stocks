import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const AUDIT_PATH = path.resolve(__dirname, "../../backend/storage/audit.json");

async function main() {
  if (!fs.existsSync(AUDIT_PATH)) {
    console.error("audit.json not found at", AUDIT_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf-8")) as Array<{
    id: string;
    userId: string;
    username: string;
    role: string;
    action: string;
    meta: Record<string, unknown>;
    timestamp: string;
  }>;

  console.log(`Found ${raw.length} entries in audit.json`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS audit_log (
      id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID        NOT NULL,
      username   TEXT        NOT NULL,
      role       TEXT        NOT NULL,
      action     TEXT        NOT NULL,
      meta       JSONB       NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON audit_log (user_id);
    CREATE INDEX IF NOT EXISTS audit_log_action_idx     ON audit_log (action);
    CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
  `);

  const { rows: [{ count: before }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM audit_log");
  console.log(`Rows in audit_log before migration: ${before}`);

  const BATCH = 500;
  let inserted = 0;

  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH);
    const values = batch.map((_, j) => {
      const b = j * 7;
      return `($${b+1},$${b+2},$${b+3},$${b+4},$${b+5},$${b+6},$${b+7})`;
    }).join(", ");

    const params = batch.flatMap((e) => [
      e.id,
      e.userId,
      e.username,
      e.role,
      e.action,
      JSON.stringify(e.meta ?? {}),
      new Date(e.timestamp),
    ]);

    await pool.query(
      `INSERT INTO audit_log (id, user_id, username, role, action, meta, created_at)
       VALUES ${values}
       ON CONFLICT (id) DO NOTHING`,
      params,
    );

    inserted += batch.length;
    process.stdout.write(`\rMigrated ${inserted}/${raw.length}...`);
  }

  const { rows: [{ count: after }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM audit_log");
  console.log(`\nRows in audit_log after migration: ${after}`);
  console.log("Done.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
