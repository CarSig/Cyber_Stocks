import { Injectable } from "@nestjs/common";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { correlateNewsScores, newsLagImpact } from "@/shared/utils/correlations/newsCorrelation";
import { getChannel, NEWS_QUEUE } from "@/shared/mq/connection";
import { logger } from "@/shared/logger";
import { notFound } from "@/shared/errors";
import companies from "@/data/companies";
import { CoreDbService } from "@/shared/core-db.service";
import { CacheService } from "@/shared/cache.service";

type ArticleScores = {
  sentiment: number;
  importance: number;
  relevance: number;
  summary?: string;
  topics?: string[];
  catalyst?: boolean;
  timeframe?: string;
  entities?: string[];
  model?: string;
};

type NewsArticle = {
  link?: string;
  providerPublishTime?: string;
  [key: string]: unknown;
};

@Injectable()
export class NewsAnalysisService {
  constructor(private readonly db: CoreDbService, private readonly cache: CacheService) {}

  async readAnalysis(companyName: string): Promise<Record<string, ArticleScores>> {
    const { rows } = await this.db.pool.query<{ article_url: string } & ArticleScores>(
      `SELECT article_url, sentiment, importance, relevance, summary, topics, catalyst, timeframe, entities, model
       FROM news_analysis WHERE company_name = $1`,
      [companyName],
    );
    return Object.fromEntries(rows.map((r) => [r.article_url, r]));
  }

  async clearQueued(companyName: string, link: string): Promise<void> {
    await this.db.pool.query(
      `UPDATE news_analysis_queue SET status = 'done', processed_at = now()
       WHERE article_url = $1 AND company_name = $2`,
      [link, companyName],
    );
  }

  async analyzeForTicker(ticker: string): Promise<{ queued: number; total: number }> {
    const entry = Object.entries(companies).find(([, t]) => t === ticker);
    if (!entry) throw notFound(`Unknown ticker: ${ticker}`);
    const [companyName] = entry;

    const { news } = await new CybersecurityConsumer(companyName, this.db.pool).news() as { news: NewsArticle[] };
    if (!news?.length) return { queued: 0, total: 0 };

    // Get already-analyzed URLs in one query
    const { rows: analyzedRows } = await this.db.pool.query<{ article_url: string }>(
      `SELECT article_url FROM news_analysis WHERE company_name = $1`,
      [companyName],
    );
    const analyzed = new Set(analyzedRows.map((r) => r.article_url));

    const pending = news.filter((a) => a.link && !analyzed.has(a.link));
    if (!pending.length) return { queued: 0, total: analyzed.size };

    const ch = await getChannel();
    let queued = 0;
    for (const article of pending) {
      if (!article.link) continue;
      // ON CONFLICT DO NOTHING prevents duplicate queue entries atomically
      const result = await this.db.pool.query(
        `INSERT INTO news_analysis_queue (article_url, ticker, company_name, article_json)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (article_url) DO NOTHING`,
        [article.link, ticker, companyName, JSON.stringify(article)],
      );
      if ((result.rowCount ?? 0) > 0) {
        ch.sendToQueue(NEWS_QUEUE, Buffer.from(JSON.stringify({ companyName, ticker, article })), { persistent: true });
        queued++;
      }
    }

    return { queued, total: analyzed.size };
  }

  async getAnalyzedNews(ticker: string): Promise<(NewsArticle & { analysis: ArticleScores | null })[]> {
    const entry = Object.entries(companies).find(([, t]) => t === ticker);
    if (!entry) throw notFound(`Unknown ticker: ${ticker}`);
    const [companyName] = entry;

    const consumer = new CybersecurityConsumer(companyName, this.db.pool);
    const { news } = await consumer.news() as { news: NewsArticle[] };
    const analysis = await this.readAnalysis(companyName);

    return (news ?? []).map((a) => ({ ...a, analysis: a.link ? (analysis[a.link] ?? null) : null }));
  }

  async backfillAll(): Promise<void> {
    let total = 0;
    for (const [, ticker] of Object.entries(companies)) {
      try {
        const { queued } = await this.analyzeForTicker(ticker);
        if (queued > 0) logger.info({ ticker, queued }, "backfill enqueued");
        total += queued;
      } catch (err) {
        const e = err as { status?: number; message?: string };
        if (e.status !== 503) logger.warn({ ticker, err: e.message }, "backfill skip");
      }
    }
    if (total > 0) logger.info({ total }, "news backfill complete");
  }

  async correlate(ticker: string, lagDays = 1) {
    const entry = Object.entries(companies).find(([, t]) => t === ticker);
    if (!entry) throw notFound(`Unknown ticker: ${ticker}`);
    const [companyName] = entry;

    return this.cache.getOrSet(`corr:${ticker}:news:${lagDays}`, 1800, async () => {
      const consumer = new CybersecurityConsumer(companyName, this.db.pool);
      const [{ news }, { quotes }, analysis] = await Promise.all([
        consumer.news() as Promise<{ news: NewsArticle[] }>,
        consumer.history(),
        this.readAnalysis(companyName),
      ]);

      const dateByLink = Object.fromEntries(
        (news ?? []).filter((a) => a.link && typeof a.providerPublishTime === "string")
          .map((a) => [a.link as string, (a.providerPublishTime as string).slice(0, 10)]),
      );

      const events: { date: string; score: number }[] = [];
      for (const [link, scores] of Object.entries(analysis)) {
        const date = dateByLink[link];
        if (!date || scores.sentiment === 0) continue;
        const score = scores.sentiment * (scores.importance * scores.relevance) / 100;
        events.push({ date, score });
      }

      return {
        correlation: correlateNewsScores(events, quotes, { lagDays }),
        lagImpact: newsLagImpact(events, quotes, { windowDays: lagDays }),
      };
    });
  }
}

// --- OLD FILE-BASED IMPLEMENTATION ---
// readAnalysis: fs.readFileSync(PATHS.newsAnalysis(companyName)) → JSON.parse
// #readQueued / #writeQueued: fs read/write of PATHS.newsQueued(companyName)
// analyzeForTicker: triple file read + TOCTOU race on queue file
// clearQueued: read queue file, filter out link, write back
