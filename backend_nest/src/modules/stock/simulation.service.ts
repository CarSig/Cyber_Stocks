import { Injectable } from "@nestjs/common";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { simulate, simulationPresets } from "@/shared/utils/simulation";
import { CoreDbService } from "@/shared/core-db.service";

type TrumpPost = {
  created_at?: string;
  analysis?: { sentiment?: string; companies?: { ticker: string }[] };
};

@Injectable()
export class SimulationService {
  constructor(private readonly db: CoreDbService) {}

  async getPresets(name: string, ticker: string): Promise<Record<string, { date: string; number: number }[]>> {
    const { quotes } = await new CybersecurityConsumer(name, this.db.pool).history();
    const seen = new Set<string>();
    const dates = [...quotes]
      .filter((q) => q.close != null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((q) => new Date(q.date).toISOString().slice(0, 10))
      .filter((d) => {
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      });

    let trumpPosts: TrumpPost[] = [];
    try {
      const { rows } = await this.db.pool.query<{ created_at: string; sentiment: string; ticker: string; value: number }>(
        `SELECT tp.created_at, tp.sentiment, tpt.ticker, tpt.value
         FROM trump_posts tp
         JOIN trump_post_tickers tpt ON tpt.post_id = tp.id
         WHERE tpt.ticker = $1`,
        [ticker],
      );
      trumpPosts = rows.map((r) => ({
        created_at: r.created_at,
        analysis: { sentiment: r.sentiment, companies: [{ ticker: r.ticker }] },
      }));
    } catch { /* no trump posts yet */ }

    let newsArticles: { link?: string; providerPublishTime?: number | string }[] = [];
    let newsAnalysis: Record<string, { sentiment?: number }> = {};
    try {
      const newsData = await new CybersecurityConsumer(name, this.db.pool).news() as { news?: typeof newsArticles };
      newsArticles = newsData.news ?? [];
    } catch { /* no news yet */ }
    try {
      const { rows } = await this.db.pool.query<{ article_url: string; sentiment: number }>(
        `SELECT article_url, sentiment FROM news_analysis WHERE company_name = $1`,
        [name],
      );
      newsAnalysis = Object.fromEntries(rows.map((r) => [r.article_url, { sentiment: r.sentiment }]));
    } catch { /* no news analysis yet */ }

    const result: Record<string, { date: string; number: number }[]> = {};
    for (const [presetName, fn] of Object.entries(simulationPresets)) {
      result[presetName] = fn(dates, { trumpPosts, newsArticles, newsAnalysis });
    }
    return result;
  }

  async runSimulation(name: string, actions: { date: string; type: "buy" | "sell"; value: number }[]) {
    const { quotes } = await new CybersecurityConsumer(name, this.db.pool).history();
    return simulate(quotes, actions);
  }
}
