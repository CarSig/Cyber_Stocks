import { Injectable } from "@nestjs/common";
import { Pool } from "pg";
import { CybersecurityClient } from "@/shared/clients/YahooCompanyClient";
import companies from "@/data/companies";
import { logger } from "@/shared/logger";
import { newsArticlesQueuedTotal } from "@/shared/metrics";

@Injectable()
export class DataSyncService {
  constructor(private readonly pool: Pool) {}

  async populateAll(): Promise<void> {
    logger.info("populating storage for all companies");
    await Promise.all(
      Object.keys(companies).map((name) =>
        new CybersecurityClient(name, this.pool).populate().catch((e: unknown) => logger.error({ err: e }, `failed to populate ${name}`)),
      ),
    );
    logger.info("all companies populated");
  }

  async populateAllNews(): Promise<void> {
    logger.info("fetching news for all companies");
    const names = Object.keys(companies);
    const results = await Promise.allSettled(names.map((name) => new CybersecurityClient(name, this.pool).populateNews()));
    const breakdown: Record<string, number> = {};
    let total = 0;
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        breakdown[names[i]] = r.value;
        total += r.value;
        if (r.value > 0) {
          const ticker = Object.values(companies)[i] as string;
          newsArticlesQueuedTotal.inc({ ticker }, r.value);
        }
      } else {
        logger.error({ err: r.reason }, `failed to fetch news ${names[i]}`);
        breakdown[names[i]] = 0;
      }
    });
    logger.info({ total, breakdown }, "news fetch complete");
  }
}
