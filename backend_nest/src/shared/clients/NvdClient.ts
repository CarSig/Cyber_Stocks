import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { PATHS } from "../paths";

const STORAGE = PATHS.nvd;
const NVD_BASE = "https://services.nvd.nist.gov/rest/json/cves/2.0";

type NvdData = {
  vulnerabilities: Record<string, unknown>[];
  syncedAt: string;
  totalResults: number;
}

export class NvdClient {
  async sync(daysBack = 30): Promise<void> {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - daysBack);

    const params = new URLSearchParams({
      lastModStartDate: start.toISOString().replace("Z", "+00:00"),
      lastModEndDate: end.toISOString().replace("Z", "+00:00"),
      resultsPerPage: String(2000),
    });

    const headers: Record<string, string> = process.env.NVD_API_KEY ? { apiKey: process.env.NVD_API_KEY } : {};
    const res = await fetch(`${NVD_BASE}?${params}`, { headers });
    if (!res.ok) throw new Error(`NVD fetch failed: ${res.status}`);
    const incoming = await res.json() as { vulnerabilities?: Record<string, unknown>[] };
    const fresh = incoming.vulnerabilities ?? [];

    const existing = this.read();
    const byId = new Map((existing?.vulnerabilities ?? []).map((v) => [(v as { cve?: { id?: string } }).cve?.id, v]));
    let updated = 0;
    let added = 0;
    for (const v of fresh) {
      const id = (v as { cve?: { id?: string } }).cve?.id;
      if (!id) continue;
      const prev = byId.get(id);
      const vMod = (v as { cve?: { lastModified?: string } }).cve?.lastModified ?? "";
      const prevMod = (prev as { cve?: { lastModified?: string } } | undefined)?.cve?.lastModified ?? "";
      if (!prev || vMod > prevMod) {
        byId.set(id, v);
        prev ? updated++ : added++;
      }
    }

    const merged: NvdData = { vulnerabilities: [...byId.values()], syncedAt: new Date().toISOString(), totalResults: byId.size };
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(merged));
    logger.info({ total: merged.totalResults, added, updated }, "NVD synced");
  }

  read(): NvdData | null {
    if (!fs.existsSync(STORAGE)) return null;
    return JSON.parse(fs.readFileSync(STORAGE, "utf-8")) as NvdData;
  }
}
