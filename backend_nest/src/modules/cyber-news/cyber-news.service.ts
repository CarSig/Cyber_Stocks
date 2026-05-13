import { Injectable } from "@nestjs/common";
import { CoreDbService } from "@/shared/core-db.service";
import { correlateNewsScores } from "@/shared/utils/correlations/newsCorrelation";
import type { Quote } from "@/types/index";

type NewsRow = {
  id: string;
  source: string;
  title: string;
  link: string;
  published_at: string | null;
  author: string | null;
  categories: string[];
  description: string;
  matched_company: string | null;
  matched_ticker: string | null;
  all_matches: { company: string; ticker: string }[];
};

type AnalysisRow = {
  article_url: string;
  ticker: string;
  company_name: string;
  sentiment: number;
  importance: number;
  relevance: number;
  summary: string;
  topics: string[];
  catalyst: boolean;
  timeframe: string | null;
  entities: string[];
  model: string | null;
  analyzed_at: string;
};

@Injectable()
export class CyberNewsService {
  constructor(private readonly db: CoreDbService) {}

  async getTickers(topic?: string): Promise<{ ticker: string; company: string; articleCount: number }[]> {
    const query = topic
      ? `
        SELECT matched_ticker AS ticker, matched_company AS company, count(*)::text AS article_count
        FROM cybersecurity_news n
        JOIN cybersecurity_news_analysis a ON a.article_url = n.link
        WHERE n.matched_ticker IS NOT NULL AND $1 = ANY(a.topics)
        GROUP BY matched_ticker, matched_company
        ORDER BY article_count DESC
      `
      : `
        SELECT matched_ticker AS ticker, matched_company AS company, count(*)::text AS article_count
        FROM cybersecurity_news
        WHERE matched_ticker IS NOT NULL
        GROUP BY matched_ticker, matched_company
        ORDER BY article_count DESC
      `;
    const { rows } = await this.db.pool.query<{ ticker: string; company: string; article_count: string }>(
      query,
      topic ? [topic] : [],
    );
    return rows.map((r) => ({ ticker: r.ticker, company: r.company, articleCount: Number(r.article_count) }));
  }

  async getSummary(ticker: string, topic?: string) {
    const query = topic
      ? `SELECT a.* FROM cybersecurity_news_analysis a
         JOIN cybersecurity_news n ON n.link = a.article_url
         WHERE n.matched_ticker = $1 AND $2 = ANY(a.topics)`
      : `SELECT a.* FROM cybersecurity_news_analysis a
         JOIN cybersecurity_news n ON n.link = a.article_url
         WHERE n.matched_ticker = $1`;
    const { rows } = await this.db.pool.query<AnalysisRow>(query, topic ? [ticker, topic] : [ticker]);
    if (rows.length === 0) return null;

    const sentiments = rows.map((r) => r.sentiment);
    const avgSentiment = sentiments.reduce((s, v) => s + v, 0) / sentiments.length;
    const positiveCount = rows.filter((r) => r.sentiment > 0.1).length;
    const negativeCount = rows.filter((r) => r.sentiment < -0.1).length;
    const neutralCount = rows.length - positiveCount - negativeCount;

    return {
      ticker,
      articleCount: rows.length,
      avgSentiment: Math.round(avgSentiment * 1000) / 1000,
      positiveCount,
      negativeCount,
      neutralCount,
    };
  }

  async getArticles(ticker: string, topic?: string) {
    const query = topic
      ? `SELECT n.*, a.sentiment, a.importance, a.relevance, a.summary, a.topics,
              a.catalyst, a.timeframe, a.entities AS analysis_entities, a.model, a.analyzed_at
       FROM cybersecurity_news n
       LEFT JOIN cybersecurity_news_analysis a ON a.article_url = n.link
       WHERE n.matched_ticker = $1 AND $2 = ANY(a.topics)
       ORDER BY n.published_at DESC NULLS LAST`
      : `SELECT n.*, a.sentiment, a.importance, a.relevance, a.summary, a.topics,
              a.catalyst, a.timeframe, a.entities AS analysis_entities, a.model, a.analyzed_at
       FROM cybersecurity_news n
       LEFT JOIN cybersecurity_news_analysis a ON a.article_url = n.link
       WHERE n.matched_ticker = $1
       ORDER BY n.published_at DESC NULLS LAST`;
    const { rows } = await this.db.pool.query<NewsRow & Partial<AnalysisRow>>(
      query,
      topic ? [ticker, topic] : [ticker],
    );
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      link: r.link,
      publishedAt: r.published_at,
      author: r.author,
      categories: r.categories,
      description: r.description,
      matchedCompany: r.matched_company,
      matchedTicker: r.matched_ticker,
      allMatches: r.all_matches,
      analysis: r.sentiment != null ? {
        sentiment: r.sentiment,
        importance: r.importance,
        relevance: r.relevance,
        summary: r.summary,
        topics: r.topics,
        catalyst: r.catalyst,
        timeframe: r.timeframe,
        entities: (r as { analysis_entities?: string[] }).analysis_entities ?? [],
        model: r.model,
        analyzedAt: r.analyzed_at,
      } : null,
    }));
  }

  async getTopics(): Promise<{ topic: string; count: number }[]> {
    const { rows } = await this.db.pool.query<{ topic: string; count: string }>(`
      SELECT unnest(topics) AS topic, count(*)::text AS count
      FROM cybersecurity_news_analysis
      GROUP BY topic
      ORDER BY count DESC, topic ASC
    `);
    return rows.map((r) => ({ topic: r.topic, count: Number(r.count) }));
  }

  async getRecentArticles(limit = 50) {
    const { rows } = await this.db.pool.query<NewsRow & Partial<AnalysisRow>>(
      `SELECT n.*, a.sentiment, a.importance, a.summary, a.topics, a.catalyst
       FROM cybersecurity_news n
       LEFT JOIN cybersecurity_news_analysis a ON a.article_url = n.link
       ORDER BY n.published_at DESC NULLS LAST
       LIMIT $1`,
      [limit],
    );
    return rows.map((r) => ({
      id: r.id,
      source: r.source,
      title: r.title,
      link: r.link,
      publishedAt: r.published_at,
      matchedCompany: r.matched_company,
      matchedTicker: r.matched_ticker,
      analysis: r.sentiment != null ? {
        sentiment: r.sentiment,
        importance: r.importance,
        summary: r.summary,
        topics: r.topics,
        catalyst: r.catalyst,
      } : null,
    }));
  }

  async getCorrelations(lagDays = 1, topic?: string): Promise<
    { ticker: string; company: string; result: any }[]
  > {
    const query = topic
      ? `SELECT a.ticker, a.company_name,
              DATE(n.published_at)::text AS day,
              (a.sentiment * (a.importance * a.relevance) / 100.0) AS weighted_score
       FROM cybersecurity_news_analysis a
       JOIN cybersecurity_news n ON n.link = a.article_url
       WHERE n.published_at IS NOT NULL AND $1 = ANY(a.topics)
       ORDER BY a.ticker, day ASC`
      : `SELECT a.ticker, a.company_name,
              DATE(n.published_at)::text AS day,
              (a.sentiment * (a.importance * a.relevance) / 100.0) AS weighted_score
       FROM cybersecurity_news_analysis a
       JOIN cybersecurity_news n ON n.link = a.article_url
       WHERE n.published_at IS NOT NULL
       ORDER BY a.ticker, day ASC`;
    const { rows: analysisRows } = await this.db.pool.query<{
      ticker: string;
      company_name: string;
      day: string;
      weighted_score: number;
    }>(query, topic ? [topic] : []);

    const eventsByTicker = new Map<string, { date: string; score: number }[]>();
    const tickerToCompany = new Map<string, string>();
    for (const row of analysisRows) {
      if (!eventsByTicker.has(row.ticker)) {
        eventsByTicker.set(row.ticker, []);
        tickerToCompany.set(row.ticker, row.company_name);
      }
      eventsByTicker.get(row.ticker)!.push({ date: row.day, score: row.weighted_score });
    }

    const results: { ticker: string; company: string; result: any }[] = [];
    for (const [ticker, events] of eventsByTicker) {
      const company = tickerToCompany.get(ticker)!;
      try {
        const { rows: quoteRows } = await this.db.pool.query<{
          date: string;
          close: number;
        }>(
          `SELECT date::text, close FROM stock_quotes WHERE ticker = $1 ORDER BY date ASC`,
          [ticker],
        );
        const quotes: Quote[] = quoteRows.map((r) => ({
          date: r.date,
          close: r.close,
        })) as Quote[];

        if (events.length > 0 && quotes.length > 0) {
          const correlation = correlateNewsScores(events, quotes, { lagDays });
          results.push({ ticker, company, result: correlation });
        } else {
          results.push({
            ticker,
            company,
            result: { error: 'insufficient data' },
          });
        }
      } catch (err) {
        results.push({
          ticker,
          company,
          result: { error: (err as Error).message },
        });
      }
    }

    return results;
  }
}
