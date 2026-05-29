import { Injectable } from "@nestjs/common";
import { CoreDbService } from "@/shared/core-db.service";
import type { FilingPriceImpact } from "@algo/shared";

@Injectable()
export class PriceImpactService {
  constructor(private readonly db: CoreDbService) {}

  async getDeltaForTickerDates(
    ticker: string,
    dates: string[],
  ): Promise<Map<string, FilingPriceImpact | null>> {
    const result = new Map<string, FilingPriceImpact | null>(
      dates.map((d) => [d, null]),
    );
    if (dates.length === 0) return result;

    const rows = await this.db.pool.query<{ date: string; open: string; close: string }>(
      `SELECT date::text, open, close FROM stock_quotes WHERE ticker = $1 AND date = ANY($2::date[])`,
      [ticker, dates],
    );
    for (const row of rows.rows) {
      const open = parseFloat(row.open);
      const close = parseFloat(row.close);
      if (open === 0) continue;
      result.set(row.date, {
        open,
        close,
        deltaPct: ((close - open) / open) * 100,
      });
    }
    return result;
  }
}
