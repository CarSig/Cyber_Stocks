import { Injectable } from "@nestjs/common";
import type { User } from "@/types/index";
import { CoreDbService } from "@/shared/core-db.service";

type AuditEntry = {
  id: string;
  userId: string;
  username: string;
  role: string;
  action: string;
  meta: Record<string, unknown>;
  timestamp: string;
};

@Injectable()
export class AuditService {
  constructor(private readonly db: CoreDbService) {}

  async log(user: User, action: string, meta: Record<string, unknown> = {}): Promise<void> {
    try {
      await this.db.pool.query(
        `INSERT INTO audit_log (user_id, username, role, action, meta)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.username, user.role, action, JSON.stringify(meta)],
      );
    } catch {
      // non-fatal: audit write failure must not crash the server
    }
  }

  async getAll({ limit = 100, offset = 0, userId, action }: { limit?: number; offset?: number; userId?: string; action?: string } = {}): Promise<{ total: number; entries: AuditEntry[] }> {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (userId) { params.push(userId); conditions.push(`user_id = $${params.length}`); }
    if (action) { params.push(action); conditions.push(`action = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit, offset);
    const rows = await this.db.pool.query<AuditEntry & { total: string }>(
      `SELECT id, user_id AS "userId", username, role, action, meta, created_at AS timestamp,
              COUNT(*) OVER() AS total
       FROM audit_log
       ${where}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      total: rows.rows[0] ? Number(rows.rows[0].total) : 0,
      entries: rows.rows,
    };
  }
}

// --- OLD FILE-BASED IMPLEMENTATION (kept until DB path is verified) ---
// import fs from "fs";
// import path from "path";
// import { PATHS } from "@/shared/paths";
//
// const AUDIT_PATH = PATHS.audit;
//
// function readLog(): AuditEntry[] {
//   if (!fs.existsSync(AUDIT_PATH)) return [];
//   return JSON.parse(fs.readFileSync(AUDIT_PATH, "utf-8")) as AuditEntry[];
// }
//
// log(user, action, meta) {
//   const entries = readLog();
//   entries.push({ id: crypto.randomUUID(), userId: user.id, username: user.username,
//     role: user.role, action, meta, timestamp: new Date().toISOString() });
//   fs.mkdirSync(path.dirname(AUDIT_PATH), { recursive: true });
//   fs.writeFileSync(AUDIT_PATH, JSON.stringify(entries, null, 2), { mode: 0o600 });
// }
//
// getAll({ limit, offset, userId, action }) {
//   let entries = readLog();
//   if (userId) entries = entries.filter((e) => e.userId === userId);
//   if (action) entries = entries.filter((e) => e.action === action);
//   entries = entries.slice().reverse();
//   return { total: entries.length, entries: entries.slice(offset, offset + limit) };
// }
