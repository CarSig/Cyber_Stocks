import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { PATHS } from "../paths";

const STORAGE = PATHS.kev;
const KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

type KevData = {
  count: number;
  syncedAt: string;
  vulnerabilities: Record<string, unknown>[];
}

export class KevClient {
  async sync(): Promise<void> {
    const res = await fetch(KEV_URL);
    if (!res.ok) throw new Error(`KEV fetch failed: ${res.status}`);
    const data = await res.json() as KevData;
    data.syncedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(data));
    logger.info({ count: data.count }, "KEV synced");
  }

  read(): KevData | null {
    if (!fs.existsSync(STORAGE)) return null;
    return JSON.parse(fs.readFileSync(STORAGE, "utf-8")) as KevData;
  }
}
