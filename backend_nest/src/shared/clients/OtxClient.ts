import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { PATHS } from "../paths";

const STORAGE = PATHS.otx;
const OTX_BASE = "https://otx.alienvault.com/api/v1";

type OtxData = {
  results?: Record<string, unknown>[];
  syncedAt: string;
}

export class OtxClient {
  get configured(): boolean {
    return !!process.env.OTX_API_KEY;
  }

  async sync(): Promise<void> {
    if (!this.configured) throw new Error("OTX_API_KEY not configured");
    const res = await fetch(`${OTX_BASE}/pulses/subscribed?limit=100`, {
      headers: { "X-OTX-API-KEY": process.env.OTX_API_KEY! },
    });
    if (!res.ok) throw new Error(`OTX fetch failed: ${res.status}`);
    const data = await res.json() as OtxData;
    data.syncedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(data));
    logger.info({ count: data.results?.length }, "OTX synced");
  }

  read(): OtxData | null {
    if (!fs.existsSync(STORAGE)) return null;
    return JSON.parse(fs.readFileSync(STORAGE, "utf-8")) as OtxData;
  }
}
