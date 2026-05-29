import { Injectable } from "@nestjs/common";
import { EdgarService } from "./edgar.service";
import { SecFilingsRepository } from "./sec-filings.repository";
import { SecEdgarClient } from "@/shared/clients/SecEdgarClient";
import { COMPANY_CIK } from "@/data/CIK";
import { logger } from "@/shared/logger";

export type PollResult = {
  ticker: string;
  newAccessions: string[];
  earliestDate: string;
};

@Injectable()
export class EdgarPollerService {
  private readonly client = new SecEdgarClient();

  constructor(
    private readonly edgarService: EdgarService,
    private readonly repo: SecFilingsRepository,
  ) {}

  async pollNewFilings(): Promise<PollResult[]> {
    const tickers = Object.keys(COMPANY_CIK);
    const results: PollResult[] = [];

    for (const ticker of tickers) {
      try {
        const recent = await this.client.fetchRecentFilings(ticker);
        if (recent.length === 0) continue;

        // Notification watermark, independent of the (incomplete) filings
        // archive. A filing is "new" only if accepted strictly after it.
        const watermark = await this.repo.getPollState(ticker);

        // Newest acceptance time in the current feed — where the watermark
        // advances to. Fall back to now if SEC omits the field everywhere.
        const maxSeen = recent.reduce<string>(
          (max, f) => (f.acceptanceDateTime && f.acceptanceDateTime > max ? f.acceptanceDateTime : max),
          "",
        ) || new Date().toISOString();

        // Archive backfill is driven purely by the accession-diff and is
        // decoupled from notifications. This still fills stale tickers in.
        const known = await this.repo.findAccessionsByTicker(ticker);
        const missing = recent.filter((f) => !known.has(f.accession));
        if (missing.length > 0) {
          const earliestDate = missing.reduce(
            (min, f) => (f.filingDate < min ? f.filingDate : min),
            missing[0].filingDate,
          );
          try {
            await this.edgarService.sync(ticker, earliestDate);
          } catch (e: unknown) {
            logger.error({ err: e, ticker }, "edgar poller: sync failed");
          }
        }

        if (watermark === null) {
          // First run for this ticker: seed the watermark, notify nothing.
          await this.repo.setPollState(ticker, maxSeen);
          continue;
        }

        const fresh = recent.filter((f) => f.acceptanceDateTime && f.acceptanceDateTime > watermark);
        await this.repo.setPollState(ticker, maxSeen);

        if (fresh.length > 0) {
          results.push({
            ticker,
            newAccessions: fresh.map((f) => f.accession),
            earliestDate: fresh.reduce((min, f) => (f.filingDate < min ? f.filingDate : min), fresh[0].filingDate),
          });
        }
      } catch (e: unknown) {
        logger.warn({ err: e, ticker }, "edgar poller: ticker poll failed");
      }
    }

    return results;
  }
}
