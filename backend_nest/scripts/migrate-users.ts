import "dotenv/config";
import fs from "fs";
import path from "path";
import { Pool } from "pg";

const USERS_PATH = path.resolve(__dirname, "../../backend/storage/users.json");

async function main() {
  if (!fs.existsSync(USERS_PATH)) {
    console.error("users.json not found at", USERS_PATH);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(USERS_PATH, "utf-8")) as Array<{
    id: string;
    username: string;
    role: "user" | "admin";
    email?: string;
    googleId?: string;
    passwordHash?: string;
    createdAt: string;
  }>;

  console.log(`Found ${raw.length} users in users.json`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: [{ count: before }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM users");
  console.log(`Rows in users before migration: ${before}`);

  for (const u of raw) {
    await pool.query(
      `INSERT INTO users (id, username, password_hash, role, email, google_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [u.id, u.username, u.passwordHash ?? null, u.role, u.email ?? null, u.googleId ?? null, new Date(u.createdAt)],
    );
  }

  const { rows: [{ count: after }] } = await pool.query<{ count: string }>("SELECT COUNT(*) FROM users");
  console.log(`Rows in users after migration: ${after}`);
  console.log("Done.");
  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
