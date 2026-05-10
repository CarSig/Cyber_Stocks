import fs from "fs";
import path from "path";
import { logger } from "../logger";
import { PATHS } from "../paths";

const STORAGE = PATHS.misp;

type MispData = {
  events: unknown[];
  syncedAt: string;
}

export class MispClient {
  get configured(): boolean {
    return !!(process.env.MISP_URL && process.env.MISP_API_KEY);
  }

  async sync(): Promise<void> {
    if (!this.configured) throw new Error("MISP not configured (set MISP_URL and MISP_API_KEY)");
    const res = await fetch(`${process.env.MISP_URL!}/events/index.json`, {
      headers: {
        Authorization: process.env.MISP_API_KEY!,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error(`MISP fetch failed: ${res.status}`);
    const raw = await res.json() as unknown[] | { response?: unknown[] };
    const events = Array.isArray(raw) ? raw : (raw as { response?: unknown[] }).response ?? [];
    const data: MispData = { events, syncedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(STORAGE), { recursive: true });
    fs.writeFileSync(STORAGE, JSON.stringify(data));
    logger.info({ count: events.length }, "MISP synced");
  }

  read(): MispData | null {
    if (!fs.existsSync(STORAGE)) return null;
    return JSON.parse(fs.readFileSync(STORAGE, "utf-8")) as MispData;
  }
}
