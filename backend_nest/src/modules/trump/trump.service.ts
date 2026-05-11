import { Injectable } from "@nestjs/common";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { correlateTrump, trumpLagImpact } from "@/shared/utils/correlations/trumpCorrelation";
import { CoreDbService } from "@/shared/core-db.service";

type TrumpPost = {
  id: string;
  created_at: string;
  content: string;
  url?: string;
  sentiment?: string;
  tags?: string[];
  analyzed_at?: string;
  analysis?: { sentiment?: string; companies?: { ticker: string; value: number }[] };
};

@Injectable()
export class TrumpService {
  constructor(private readonly db: CoreDbService) {}

  async getAllPosts(): Promise<TrumpPost[]> {
    const { rows } = await this.db.pool.query<TrumpPost>(
      `SELECT id, created_at, content, url, sentiment, tags, analyzed_at
       FROM trump_posts
       ORDER BY created_at DESC`,
    );
    return rows.map((r) => ({ ...r, created_at: new Date(r.created_at).toISOString() }));
  }

  async getPostsForTicker(ticker: string): Promise<TrumpPost[]> {
    const { rows } = await this.db.pool.query<TrumpPost & { companies: { ticker: string; value: number }[] }>(
      `SELECT tp.id, tp.created_at, tp.content, tp.url, tp.sentiment, tp.tags,
              json_agg(json_build_object('ticker', tpt.ticker, 'value', tpt.value)) AS companies
       FROM trump_posts tp
       JOIN trump_post_tickers tpt ON tpt.post_id = tp.id
       WHERE tpt.ticker = $1
       GROUP BY tp.id, tp.created_at, tp.content, tp.url, tp.sentiment, tp.tags
       ORDER BY tp.created_at DESC`,
      [ticker],
    );
    return rows.map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toISOString(),
      analysis: { sentiment: r.sentiment ?? undefined, companies: r.companies },
    }));
  }

  async getCorrelation(name: string, ticker: string, lagDays = 1) {
    const [posts, { quotes }] = await Promise.all([
      this.getPostsForTicker(ticker),
      new CybersecurityConsumer(name, this.db.pool).history(),
    ]);
    return correlateTrump(posts, quotes, { lagDays });
  }

  async getLagImpact(name: string, ticker: string, lagDays = 7) {
    const [posts, { quotes }] = await Promise.all([
      this.getPostsForTicker(ticker),
      new CybersecurityConsumer(name, this.db.pool).history(),
    ]);
    return trumpLagImpact(posts, quotes, { windowDays: lagDays });
  }
}

// --- OLD FILE-BASED IMPLEMENTATION ---
// getAllPosts(): JSON.parse(fs.readFileSync(TRUMP_POSTS_PATH, "utf8"))
// getPostsForTicker(ticker): JSON.parse(fs.readFileSync(ANALYZED_POSTS_PATH))
//   .filter((p) => p.analysis?.companies?.some((c) => c.ticker === ticker))
