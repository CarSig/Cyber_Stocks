import YahooFinance from "yahoo-finance2";
import { Pool } from "pg";
import companies from "@/data/companies";
import { logger } from "../logger";
import { publishNewArticles } from "../mq/producers/newsProducer";
import type { Quote } from "../../types/index";

type HistoryResult = { meta: Record<string, unknown>; quotes: Quote[] };
const historyCache = new Map<string, { data: HistoryResult; expiresAt: number }>();
const HISTORY_TTL_MS = 24 * 60 * 60 * 1000;

type NewsArticle = {
  uuid?: string;
  title?: string;
  link?: string;
  publisher?: string;
  providerPublishTime?: string | Date;
  type?: string;
  thumbnail?: unknown;
  relatedTickers?: string[];
  [key: string]: unknown;
};

class CybersecurityClient {
  companyName: string;
  ticker: string;
  private client: InstanceType<typeof YahooFinance>;
  private pool: Pool;

  constructor(companyName: string, pool: Pool) {
    if (!companies[companyName]) {
      throw new Error(`Unknown company: "${companyName}". Available: ${Object.keys(companies).join(", ")}`);
    }
    this.companyName = companyName;
    this.ticker = companies[companyName];
    this.client = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
    this.pool = pool;
  }

  async getHistory({ start = "2024-01-01", end = new Date().toISOString().slice(0, 10), interval = "1d" as const } = {}) {
    return this.client.chart(this.ticker, { period1: start, period2: end, interval });
  }

  async search() {
    return this.client.search(this.companyName);
  }

  async getQuote() {
    return this.client.quote(this.ticker);
  }

  async getSummary() {
    return this.client.quoteSummary(this.ticker, {
      modules: ["summaryProfile", "financialData", "defaultKeyStatistics"],
    });
  }

  toString(): string {
    return `CybersecurityClient(${this.companyName} → ${this.ticker})`;
  }

  async populate(): Promise<void> {
    // Determine start date from DB max date
    const { rows: maxRows } = await this.pool.query<{ max: string | null }>(
      `SELECT MAX(date)::text AS max FROM stock_quotes WHERE ticker = $1`,
      [this.ticker],
    );
    const maxDate = maxRows[0]?.max ?? null;
    const historyStart = maxDate
      ? (() => { const d = new Date(maxDate); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); })()
      : undefined;

    const today = new Date().toISOString().slice(0, 10);
    const historyUpToDate = historyStart != null && historyStart >= today;

    const [history, search, summary] = await Promise.all([
      historyUpToDate ? null : this.getHistory(historyStart ? { start: historyStart } : undefined),
      this.search(),
      this.getSummary(),
    ]);

    // history → DB
    let newQuoteCount = 0;
    if (history) {
      newQuoteCount = await this.#upsertHistory(history as unknown as Record<string, unknown>);
    }

    // news → DB
    const newNews = await this.#upsertNews((search as { news?: NewsArticle[] }).news ?? []);

    // summary → DB
    await this.pool.query(
      `INSERT INTO company_summary (ticker, company_name, data, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (ticker) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [this.ticker, this.companyName, JSON.stringify(summary)],
    );

    if (newQuoteCount > 0) historyCache.delete(this.companyName);

    logger.debug({ ticker: this.ticker, newQuotes: newQuoteCount, newNews: newNews.length }, `populated ${this.companyName}`);
    await publishNewArticles(this.companyName, this.ticker, newNews as Record<string, unknown>[]);
  }

  async populateNews(): Promise<number> {
    const search = await this.search();
    const newArticles = await this.#upsertNews((search as { news?: NewsArticle[] }).news ?? []);
    logger.debug({ ticker: this.ticker, newNews: newArticles.length }, `news updated ${this.companyName}`);
    await publishNewArticles(this.companyName, this.ticker, newArticles as Record<string, unknown>[]);
    return newArticles.length;
  }

  // Returns only newly inserted articles
  async #upsertNews(articles: NewsArticle[]): Promise<NewsArticle[]> {
    if (!articles.length) return [];
    const newOnes: NewsArticle[] = [];
    for (const a of articles) {
      if (!a.link) continue;
      const result = await this.pool.query(
        `INSERT INTO company_news (id, ticker, company_name, title, link, publisher, published_at, type, thumbnail, related_tickers, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
         ON CONFLICT (link) DO NOTHING`,
        [
          crypto.randomUUID(),
          this.ticker,
          this.companyName,
          a.title ?? "",
          a.link,
          a.publisher ?? null,
          a.providerPublishTime ? new Date(a.providerPublishTime as string) : null,
          a.type ?? null,
          a.thumbnail ? JSON.stringify(a.thumbnail) : null,
          a.relatedTickers ?? [],
          JSON.stringify(a),
        ],
      );
      if ((result.rowCount ?? 0) > 0) newOnes.push(a);
    }
    return newOnes;
  }

  async #upsertHistory(newData: Record<string, unknown>): Promise<number> {
    const meta = newData as Record<string, unknown>;
    const quotes = (newData["quotes"] ?? []) as Record<string, unknown>[];

    // Upsert meta (everything except quotes)
    const metaOnly = Object.fromEntries(Object.entries(meta).filter(([k]) => k !== "quotes"));
    await this.pool.query(
      `INSERT INTO stock_meta (ticker, company_name, data, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (ticker) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
      [this.ticker, this.companyName, JSON.stringify(metaOnly)],
    );

    // Batch upsert quotes
    let inserted = 0;
    for (const q of quotes) {
      const date = String(q["date"] ?? "").slice(0, 10);
      if (!date) continue;
      const result = await this.pool.query(
        `INSERT INTO stock_quotes (ticker, date, open, high, low, close, adjclose, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (ticker, date) DO NOTHING`,
        [this.ticker, date, q["open"] ?? null, q["high"] ?? null, q["low"] ?? null,
         q["close"] ?? null, q["adjclose"] ?? null, q["volume"] ?? null],
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
    }
    return inserted;
  }
}

class CybersecurityConsumer {
  companyName: string;
  ticker: string;
  private pool: Pool;

  constructor(companyName: string, pool: Pool) {
    if (!companies[companyName]) {
      throw new Error(`Unknown company: "${companyName}". Available: ${Object.keys(companies).join(", ")}`);
    }
    this.companyName = companyName;
    this.ticker = companies[companyName];
    this.pool = pool;
  }

  async history(): Promise<HistoryResult> {
    const cached = historyCache.get(this.companyName);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const [metaRes, quotesRes] = await Promise.all([
      this.pool.query<{ data: Record<string, unknown> }>(
        `SELECT data FROM stock_meta WHERE ticker = $1`,
        [this.ticker],
      ),
      this.pool.query<{ date: string; open: number | null; high: number | null; low: number | null; close: number | null; adjclose: number | null; volume: number | null }>(
        `SELECT date::text, open, high, low, close, adjclose, volume FROM stock_quotes WHERE ticker = $1 ORDER BY date ASC`,
        [this.ticker],
      ),
    ]);

    const meta = metaRes.rows[0]?.data ?? {};
    const quotes: Quote[] = quotesRes.rows.map((r) => ({
      date: r.date,
      open: r.open ?? 0,
      high: r.high ?? 0,
      low: r.low ?? 0,
      close: r.close ?? 0,
      adjclose: r.adjclose ?? undefined,
      volume: r.volume ?? undefined,
    }));

    const data: HistoryResult = { meta, quotes };
    historyCache.set(this.companyName, { data, expiresAt: Date.now() + HISTORY_TTL_MS });
    return data;
  }

  async news(): Promise<{ news: NewsArticle[]; count: number }> {
    const { rows } = await this.pool.query<NewsArticle & { raw: NewsArticle }>(
      `SELECT raw FROM company_news WHERE ticker = $1 ORDER BY published_at DESC`,
      [this.ticker],
    );
    const news = rows.map((r) => r.raw);
    return { news, count: news.length };
  }

  async summary(): Promise<Record<string, unknown>> {
    const { rows } = await this.pool.query<{ data: Record<string, unknown> }>(
      `SELECT data FROM company_summary WHERE ticker = $1`,
      [this.ticker],
    );
    if (!rows[0]) throw new Error(`No summary for ${this.companyName}. Run populate() first.`);
    return rows[0].data;
  }
}

export { CybersecurityClient, companies, CybersecurityConsumer };
