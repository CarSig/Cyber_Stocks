import { Injectable } from "@nestjs/common";
import companies from "@/data/companies";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { analyzeHistory } from "@/shared/utils/analysis";
import { correlate, pearsonLag } from "@/shared/utils/stockCorrelation";
import { CoreDbService } from "@/shared/core-db.service";
import { CacheService } from "@/shared/cache.service";
import { invalidateTickerCacheKeys } from "@/shared/cache-keys";

type SparklineEntry = { closes: number[]; closes90: number[]; closes252: number[]; dates: string[]; latestPrice: number | null; changePct: number | null };

@Injectable()
export class StockService {
  constructor(private readonly db: CoreDbService, private readonly cache: CacheService) {}

  async getTickerData(name: string) {
    return this.cache.getOrSet(`ticker:${name}`, 600, async () => {
      const consumer = new CybersecurityConsumer(name, this.db.pool, this.cache);
      const history = await consumer.history();
      const { news } = await consumer.news();
      const ticker = companies[name];
      const filteredNews = (news ?? []).filter(
        (a) => ((a as { relatedTickers?: string[] }).relatedTickers ?? []).includes(ticker),
      );
      return {
        history,
        news: filteredNews,
        analysis: analyzeHistory(history),
      };
    });
  }

  async invalidateTicker(name: string): Promise<void> {
    await invalidateTickerCacheKeys(this.cache, name);
  }

  async sparkline(name: string): Promise<SparklineEntry> {
    return this.cache.getOrSet(`sparkline:${name}`, 86400, async () => {
      const consumer = new CybersecurityConsumer(name, this.db.pool, this.cache);
      const history = await consumer.history();
      const quotes = (history.quotes ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
      const last252 = quotes.slice(-252);
      const last90 = last252.slice(-90);
      const last30 = last90.slice(-30);
      const closes = last30.map((q) => q.adjclose ?? q.close ?? 0).filter((v) => v != null) as number[];
      const closes90 = last90.map((q) => q.adjclose ?? q.close ?? 0).filter((v) => v != null) as number[];
      const closes252 = last252.map((q) => q.adjclose ?? q.close ?? 0).filter((v) => v != null) as number[];
      const dates = last30.map((q) => q.date?.slice(0, 10) ?? "");
      const latestPrice = closes.at(-1) ?? null;
      const firstClose = closes[0] ?? null;
      const changePct = latestPrice != null && firstClose != null && firstClose !== 0
        ? ((latestPrice - firstClose) / firstClose) * 100
        : null;
      return { closes, closes90, closes252, dates, latestPrice, changePct };
    });
  }

  async correlationMatrix(lagDays = 0, windowDays = 90, startDate?: string, endDate?: string) {
    const cacheKey = `corr:matrix:all:${lagDays}:${windowDays}:${startDate ?? ""}:${endDate ?? ""}`;
    const ttl = startDate || endDate ? 86400 : 604800;

    return this.cache.getOrSet(cacheKey, ttl, async () => {
      const names = Object.keys(companies);
      const histories = await Promise.all(
        names.map((n) => new CybersecurityConsumer(n, this.db.pool, this.cache).history()),
      );

      const closes: Record<string, number[]> = {};
      for (let i = 0; i < names.length; i++) {
        const quotes = [...histories[i].quotes].sort((a, b) => a.date.localeCompare(b.date));
        let sliced: typeof quotes;
        if (startDate || endDate) {
          sliced = quotes.filter((q) =>
            (!startDate || q.date >= startDate) && (!endDate || q.date <= endDate)
          );
        } else {
          sliced = quotes.slice(-windowDays);
        }
        closes[names[i]] = sliced
          .map((q) => q.adjclose ?? q.close ?? 0)
          .filter((v): v is number => v != null && v > 0);
      }

      const matrix: Record<string, Record<string, number | null>> = {};
      for (const a of names) {
        matrix[a] = {};
        for (const b of names) {
          if (a === b) { matrix[a][b] = 1; continue; }
          matrix[a][b] = pearsonLag(closes[a], closes[b], lagDays);
        }
      }

      const isCustom = startDate || endDate;
      return {
        matrix,
        tickers: names.map((n) => companies[n]),
        names,
        lagDays,
        windowDays: isCustom ? null : windowDays,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
      };
    });
  }

  async correlate(nameA: string, nameB: string, windowDays?: number | null, lagDays = 0) {
    return this.cache.getOrSet(`corr:${nameA}:${nameB}:stock:${windowDays ?? "all"}:${lagDays}`, 1800, async () => {
      const [historyA, historyB] = await Promise.all([
        new CybersecurityConsumer(nameA, this.db.pool, this.cache).history(),
        new CybersecurityConsumer(nameB, this.db.pool, this.cache).history(),
      ]);
      const sortedA = [...historyA.quotes].sort((a, b) => a.date.localeCompare(b.date));
      const sortedB = [...historyB.quotes].sort((a, b) => a.date.localeCompare(b.date));
      const shiftedB = lagDays > 0
        ? sortedB.map((q, i) => ({ ...q, date: sortedA[i + lagDays]?.date ?? q.date })).slice(0, sortedB.length - lagDays)
        : sortedB;
      const result = correlate(sortedA, shiftedB, { field: "adjclose", windowDays, rollingWindow: 30 });
      return { r: result.r, pValue: result.pValue, significant: result.significant, ci: result.ci, n: result.n, interpretation: result.interpretation, rolling: result.rolling, lagDays };
    });
  }
}
