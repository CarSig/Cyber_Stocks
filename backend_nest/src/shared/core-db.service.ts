import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

@Injectable()
export class CoreDbService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CoreDbService.name);

  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  async onApplicationBootstrap() {
    await this.runMigrations();
  }

  private async runMigrations() {
    const client = await this.pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
          filename   TEXT        PRIMARY KEY,
          applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);

      const migrationsDir = path.join(__dirname, "..", "db", "migrations");
      const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

      const { rows: applied } = await client.query<{ filename: string }>(
        `SELECT filename FROM schema_migrations ORDER BY filename`,
      );
      const appliedSet = new Set(applied.map((r) => r.filename));

      for (const file of files) {
        if (appliedSet.has(file)) continue;
        const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
        await client.query("BEGIN");
        try {
          await client.query(sql);
          await client.query(`INSERT INTO schema_migrations (filename) VALUES ($1)`, [file]);
          await client.query("COMMIT");
          this.logger.log(`Applied migration: ${file}`);
        } catch (err) {
          await client.query("ROLLBACK");
          this.logger.error(`Migration ${file} failed: ${(err as Error).message}`);
          throw err;
        }
      }
    } finally {
      client.release();
    }
  }
}
