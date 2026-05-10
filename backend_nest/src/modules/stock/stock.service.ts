import { Injectable } from "@nestjs/common";
import companies from "@/data/companies";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { analyzeHistory } from "@/shared/utils/analysis";
import { correlate } from "@/shared/utils/stockCorrelation";
import { CoreDbService } from "@/shared/core-db.service";

type SparklineEntry = { closes: number[]; closes90: number[]; closes252: number[]; dates: string[]; latestPrice: number | null; changePct: number | null };
const sparklineCache = new Map<string, { data: SparklineEntry; expiresAt: number }>();
const SPARKLINE_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StockService {
  constructor(private readonly db: CoreDbService) {}

  async getTickerData(name: string) {
    const consumer = new CybersecurityConsumer(name, this.db.pool);
    const history = await consumer.history();
    const newsData = await consumer.news() as { news?: { relatedTickers?: string[] }[] } & Record<string, unknown>;
    const ticker = companies[name];
    newsData.news = (newsData.news ?? []).filter(
      (a) => (a.relatedTickers ?? []).includes(ticker),
    );
    return {
      history,
      news: newsData,
      summary: await consumer.summary(),
      analysis: analyzeHistory(history),
    };
  }

  async sparkline(name: string): Promise<SparklineEntry> {
    const cached = sparklineCache.get(name);
    if (cached && cached.expiresAt > Date.now()) return cached.data;
    const consumer = new CybersecurityConsumer(name, this.db.pool);
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
    const data: SparklineEntry = { closes, closes90, closes252, dates, latestPrice, changePct };
    sparklineCache.set(name, { data, expiresAt: Date.now() + SPARKLINE_TTL_MS });
    return data;
  }

  async correlate(nameA: string, nameB: string, windowDays?: number | null, lagDays = 0) {
    const [historyA, historyB] = await Promise.all([
      new CybersecurityConsumer(nameA, this.db.pool).history(),
      new CybersecurityConsumer(nameB, this.db.pool).history(),
    ]);
    const sortedA = [...historyA.quotes].sort((a, b) => a.date.localeCompare(b.date));
    const sortedB = [...historyB.quotes].sort((a, b) => a.date.localeCompare(b.date));
    const shiftedB = lagDays > 0
      ? sortedB.map((q, i) => ({ ...q, date: sortedA[i + lagDays]?.date ?? q.date })).slice(0, sortedB.length - lagDays)
      : sortedB;
    const result = correlate(sortedA, shiftedB, { field: "adjclose", windowDays, rollingWindow: 30 });
    return { r: result.r, pValue: result.pValue, significant: result.significant, ci: result.ci, n: result.n, interpretation: result.interpretation, rolling: result.rolling, lagDays };
  }
}
