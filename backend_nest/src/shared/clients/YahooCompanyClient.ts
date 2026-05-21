import YahooFinance from 'yahoo-finance2';
import { Pool } from 'pg';
import companies from '@/data/companies';
import { logger } from '../logger';
import { publishNewArticles } from '../mq/producers/newsProducer';
import type { Quote } from '../../types/index';
import type { CacheService } from '../cache.service';

const HISTORY_TTL_S = 24 * 60 * 60;

type HistoryResult = { meta: Record<string, unknown>; quotes: Quote[] };

type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw: number;
};

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

const ALPACA_BASE = 'https://data.alpaca.markets/v2';

function alpacaHeaders() {
  return {
    'APCA-API-KEY-ID': process.env.ALPACA_API_KEY ?? '',
    'APCA-API-SECRET-KEY': process.env.ALPACA_SECRET_KEY ?? '',
  };
}

class CybersecurityClient {
  companyName: string;
  ticker: string;
  private yahooClient: InstanceType<typeof YahooFinance>;
  private pool: Pool;

  constructor(companyName: string, pool: Pool) {
    if (!companies[companyName]) {
      throw new Error(
        `Unknown company: "${companyName}". Available: ${Object.keys(companies).join(', ')}`,
      );
    }
    this.companyName = companyName;
    this.ticker = companies[companyName];
    this.yahooClient = new YahooFinance({ suppressNotices: ['yahooSurvey'] });
    this.pool = pool;
  }

  async search() {
    return this.yahooClient.search(this.companyName);
  }

  toString(): string {
    return `CybersecurityClient(${this.companyName} → ${this.ticker})`;
  }

  async #fetchAlpacaDailyBars(
    start: string,
    end: string,
  ): Promise<AlpacaBar[]> {
    const url = new URL(
      `${ALPACA_BASE}/stocks/${encodeURIComponent(this.ticker)}/bars`,
    );
    url.searchParams.set('timeframe', '1Day');
    url.searchParams.set('start', start);
    url.searchParams.set('end', end);
    url.searchParams.set('adjustment', 'all');
    url.searchParams.set('feed', 'iex');
    url.searchParams.set('limit', '10000');

    const bars: AlpacaBar[] = [];
    let nextPageToken: string | null = null;

    do {
      if (nextPageToken) url.searchParams.set('page_token', nextPageToken);
      else url.searchParams.delete('page_token');

      const res = await fetch(url.toString(), { headers: alpacaHeaders() });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as Record<
          string,
          string
        >;
        throw new Error(
          `Alpaca daily bars error ${res.status}: ${body.message ?? 'unknown'}`,
        );
      }
      const data = (await res.json()) as {
        bars: AlpacaBar[] | null;
        next_page_token: string | null;
      };
      if (data.bars) bars.push(...data.bars);
      nextPageToken = data.next_page_token ?? null;
    } while (nextPageToken);

    return bars;
  }

  async populate(): Promise<void> {
    const { rows: maxRows } = await this.pool.query<{ max: string | null }>(
      `SELECT MAX(date)::text AS max FROM stock_quotes WHERE ticker = $1`,
      [this.ticker],
    );
    const maxDate = maxRows[0]?.max ?? null;
    const historyStart = maxDate
      ? (() => {
          const d = new Date(maxDate);
          d.setDate(d.getDate() + 1);
          return d.toISOString().slice(0, 10);
        })()
      : '2024-01-01';

    const today = new Date().toISOString().slice(0, 10);
    const historyUpToDate = historyStart >= today;

    const [bars, search] = await Promise.all([
      historyUpToDate
        ? Promise.resolve([])
        : this.#fetchAlpacaDailyBars(historyStart, today),
      this.search(),
    ]);

    let newQuoteCount = 0;
    if (bars.length > 0) {
      newQuoteCount = await this.#upsertBars(bars);
    }

    const newNews = await this.#upsertNews(
      (search as { news?: NewsArticle[] }).news ?? [],
    );

    logger.debug(
      {
        ticker: this.ticker,
        newQuotes: newQuoteCount,
        newNews: newNews.length,
      },
      `populated ${this.companyName}`,
    );
    await publishNewArticles(
      this.companyName,
      this.ticker,
      newNews as Record<string, unknown>[],
    );
  }

  async populateNews(): Promise<number> {
    const search = await this.search();
    const newArticles = await this.#upsertNews(
      (search as { news?: NewsArticle[] }).news ?? [],
    );
    logger.debug(
      { ticker: this.ticker, newNews: newArticles.length },
      `news updated ${this.companyName}`,
    );
    await publishNewArticles(
      this.companyName,
      this.ticker,
      newArticles as Record<string, unknown>[],
    );
    return newArticles.length;
  }

  async #upsertBars(bars: AlpacaBar[]): Promise<number> {
    let inserted = 0;
    for (const b of bars) {
      const date = b.t.slice(0, 10);
      const result = await this.pool.query(
        `INSERT INTO stock_quotes (ticker, date, open, high, low, close, adjclose, volume)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (ticker, date) DO NOTHING`,
        [this.ticker, date, b.o, b.h, b.l, b.c, b.c, b.v],
      );
      if ((result.rowCount ?? 0) > 0) inserted++;
    }
    return inserted;
  }

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
          a.title ?? '',
          a.link,
          a.publisher ?? null,
          a.providerPublishTime
            ? new Date(a.providerPublishTime as string)
            : null,
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
}

class CybersecurityConsumer {
  companyName: string;
  ticker: string;
  private pool: Pool;
  private cache: CacheService | null;

  constructor(
    companyName: string,
    pool: Pool,
    cache: CacheService | null = null,
  ) {
    if (!companies[companyName]) {
      throw new Error(
        `Unknown company: "${companyName}". Available: ${Object.keys(companies).join(', ')}`,
      );
    }
    this.companyName = companyName;
    this.ticker = companies[companyName];
    this.pool = pool;
    this.cache = cache;
  }

  async history(): Promise<HistoryResult> {
    const fetch = async (): Promise<HistoryResult> => {
      const { rows } = await this.pool.query<{
        date: string;
        open: number | null;
        high: number | null;
        low: number | null;
        close: number | null;
        adjclose: number | null;
        volume: number | null;
      }>(
        `SELECT date::text, open, high, low, close, adjclose, volume FROM stock_quotes WHERE ticker = $1 ORDER BY date ASC`,
        [this.ticker],
      );
      const quotes: Quote[] = rows.map((r) => ({
        date: r.date,
        open: r.open ?? 0,
        high: r.high ?? 0,
        low: r.low ?? 0,
        close: r.close ?? 0,
        adjclose: r.adjclose ?? undefined,
        volume: r.volume ?? undefined,
      }));
      return { meta: {}, quotes };
    };

    if (this.cache)
      return this.cache.getOrSet(
        `history:${this.companyName}`,
        HISTORY_TTL_S,
        fetch,
      );
    return fetch();
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
    return {};
  }
}

export { CybersecurityClient, companies, CybersecurityConsumer };
