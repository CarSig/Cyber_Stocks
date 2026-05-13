#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs';
import { Pool } from 'pg';
import { logger } from '@/shared/logger';
import { analyzeArticleWithAnthropic } from '@/shared/utils/anthropicAnalyzer';
import { fetchArticleText } from '@/shared/utils/articleFetcher';
import companies from '@/data/companies';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RSSParser, RSSAdapterFactory } = require('./security_news/rs_parser_node') as {
  RSSParser: new (adapter: unknown) => { parse(xml: string): { items: RssItem[] } };
  RSSAdapterFactory: { createAdapter(xml: string): unknown };
};

const EPOCH_CUTOFF = 1735689600000; // Jan 1 2025
const API_DELAY_MS = 1200;
const ARCHIVE_ROOT = path.resolve(__dirname, '../../../archive/xml');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

type RssItem = {
  title: string;
  link: string;
  pubDate: string;
  epochDate: number | null;
  author: string;
  categories: string[];
  guid: string;
  description: string;
};

type CompanyMatch = { company: string; ticker: string };

const COMPANY_ALIASES: Record<string, string[]> = {
  'CrowdStrike': ['CRWD', 'Falcon platform', 'Falcon sensor'],
  'Palo Alto Networks': ['PANW', 'Cortex', 'Prisma'],
  'Fortinet': ['FTNT', 'FortiGate', 'FortiOS'],
  'Zscaler': ['ZS', 'Zero trust network'],
  'SentinelOne': ['Singularity platform'],
  'Cloudflare': ['Cloudflare Workers'],
  'Microsoft': ['MSFT', 'Azure', 'Windows Defender', 'Entra'],
  'NVIDIA': ['NVDA', 'CUDA'],
  'Cisco': ['CSCO', 'Talos', 'Webex'],
  'Palantir': ['PLTR', 'AIP platform'],
  'Apple': ['AAPL'],
  'Qualys': ['QLYS'],
  'Tenable Holdings': ['TENB', 'Nessus'],
  'Varonis Systems': ['VRNS'],
};

// Precompile word-boundary regexes for company names and aliases
const companyPatterns: { company: string; ticker: string; regex: RegExp }[] = [];
for (const [company, ticker] of Object.entries(companies)) {
  companyPatterns.push({
    company,
    ticker,
    regex: new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
  });
  const aliases = COMPANY_ALIASES[company] ?? [];
  for (const alias of aliases) {
    if (alias.length <= 2) continue;
    companyPatterns.push({
      company,
      ticker,
      regex: new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'),
    });
  }
}

async function ensureTables(db: Pool): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cybersecurity_news (
      id              BIGSERIAL   PRIMARY KEY,
      source          TEXT        NOT NULL,
      title           TEXT        NOT NULL,
      link            TEXT        NOT NULL UNIQUE,
      published_at    TIMESTAMPTZ,
      author          TEXT,
      categories      TEXT[]      NOT NULL DEFAULT '{}',
      description     TEXT        NOT NULL DEFAULT '',
      matched_company TEXT,
      matched_ticker  TEXT,
      all_matches     JSONB       NOT NULL DEFAULT '[]',
      ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cybersecurity_news_link_idx         ON cybersecurity_news (link);
    CREATE INDEX IF NOT EXISTS cybersecurity_news_published_at_idx ON cybersecurity_news (published_at DESC);
    CREATE INDEX IF NOT EXISTS cybersecurity_news_ticker_idx       ON cybersecurity_news (matched_ticker);

    CREATE TABLE IF NOT EXISTS cybersecurity_news_analysis (
      article_url  TEXT        PRIMARY KEY,
      ticker       TEXT        NOT NULL,
      company_name TEXT        NOT NULL,
      sentiment    REAL        NOT NULL,
      importance   INT         NOT NULL,
      relevance    INT         NOT NULL,
      summary      TEXT        NOT NULL DEFAULT '',
      topics       TEXT[]      NOT NULL DEFAULT '{}',
      catalyst     BOOLEAN     NOT NULL DEFAULT false,
      timeframe    TEXT,
      entities     TEXT[]      NOT NULL DEFAULT '{}',
      model        TEXT,
      analyzed_at  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cybersecurity_news_analysis_ticker_idx ON cybersecurity_news_analysis (ticker);
  `);
}

function discoverFiles(root: string): { source: string; filePath: string }[] {
  if (!fs.existsSync(root)) {
    logger.error({ root }, 'archive root not found');
    return [];
  }
  const results: { source: string; filePath: string }[] = [];
  for (const entry of fs.readdirSync(root)) {
    const dir = path.join(root, entry);
    if (!fs.statSync(dir).isDirectory()) continue;
    const files = fs.readdirSync(dir)
      .filter(f => f.endsWith('.xml'))
      .sort();
    for (const file of files) {
      results.push({ source: entry, filePath: path.join(dir, file) });
    }
  }
  return results;
}

function parseXmlFile(filePath: string): RssItem[] {
  const xml = fs.readFileSync(filePath, 'utf-8');
  const adapter = RSSAdapterFactory.createAdapter(xml);
  const parser = new RSSParser(adapter);
  return parser.parse(xml).items ?? [];
}

function matchCompanies(title: string, desc: string): CompanyMatch[] {
  const haystack = title + ' ' + desc;
  const matches: CompanyMatch[] = [];
  for (const { company, ticker, regex } of companyPatterns) {
    if (regex.test(haystack)) {
      matches.push({ company, ticker });
    }
  }
  return matches;
}

async function fetchExistingLinks(db: Pool, links: string[]): Promise<Set<string>> {
  if (links.length === 0) return new Set();
  const { rows } = await db.query<{ link: string }>(
    `SELECT link FROM cybersecurity_news WHERE link = ANY($1)`,
    [links],
  );
  return new Set(rows.map(r => r.link));
}

async function insertNews(
  db: Pool,
  item: RssItem,
  source: string,
  matches: CompanyMatch[],
  scrapedText = '',
  upsert = false,
): Promise<void> {
  const publishedAt = item.epochDate ? new Date(item.epochDate).toISOString() : null;
  const conflict = upsert
    ? `ON CONFLICT (link) DO UPDATE SET
         description = COALESCE(EXCLUDED.description, cybersecurity_news.description),
         scraped_text = COALESCE(EXCLUDED.scraped_text, cybersecurity_news.scraped_text),
         matched_company = EXCLUDED.matched_company,
         matched_ticker = EXCLUDED.matched_ticker,
         all_matches = EXCLUDED.all_matches`
    : `ON CONFLICT (link) DO NOTHING`;
  await db.query(
    `INSERT INTO cybersecurity_news
       (source, title, link, published_at, author, categories, description, scraped_text,
        matched_company, matched_ticker, all_matches)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
     ${conflict}`,
    [
      source,
      item.title,
      item.link,
      publishedAt,
      item.author || null,
      item.categories,
      item.description,
      scrapedText,
      matches[0]?.company ?? null,
      matches[0]?.ticker ?? null,
      JSON.stringify(matches),
    ],
  );
}

async function insertAnalysis(
  db: Pool,
  link: string,
  match: CompanyMatch,
  scores: Awaited<ReturnType<typeof analyzeArticleWithAnthropic>>,
  upsert = false,
): Promise<void> {
  const conflict = upsert
    ? `ON CONFLICT (article_url) DO UPDATE SET
         sentiment = EXCLUDED.sentiment, importance = EXCLUDED.importance,
         relevance = EXCLUDED.relevance, summary = EXCLUDED.summary,
         topics = EXCLUDED.topics, catalyst = EXCLUDED.catalyst,
         timeframe = EXCLUDED.timeframe, entities = EXCLUDED.entities,
         model = EXCLUDED.model, analyzed_at = now()`
    : `ON CONFLICT (article_url) DO NOTHING`;
  await db.query(
    `INSERT INTO cybersecurity_news_analysis
       (article_url, ticker, company_name, sentiment, importance, relevance,
        summary, topics, catalyst, timeframe, entities, model)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ${conflict}`,
    [
      link,
      match.ticker,
      match.company,
      scores.sentiment,
      scores.importance,
      scores.relevance,
      scores.summary ?? '',
      scores.topics ?? [],
      scores.catalyst ?? false,
      scores.timeframe ?? null,
      scores.entities ?? [],
      scores.model ?? null,
    ],
  );
}

async function safeGetText(link: string, fallback: string): Promise<string> {
  try {
    const { text } = await fetchArticleText(link);
    return text;
  } catch (err) {
    logger.info({ link, err: (err as Error).message }, 'scrape failed, using fallback');
    return fallback;
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const FATAL_PATTERNS = ['401', '403', 'authentication', 'insufficient_quota', 'invalid_api_key'];

async function analyzeWithRetry(
  text: string,
  companyName: string,
  link: string,
  maxRetries = 3,
): Promise<Awaited<ReturnType<typeof analyzeArticleWithAnthropic>>> {
  let attempt = 0;
  while (true) {
    try {
      return await analyzeArticleWithAnthropic(text, companyName);
    } catch (err) {
      const msg = (err as Error).message.toLowerCase();

      if (FATAL_PATTERNS.some(p => msg.includes(p))) {
        logger.error({ link, err: (err as Error).message }, 'fatal API error — aborting run');
        throw Object.assign(err as Error, { fatal: true });
      }

      const isRateLimit = msg.includes('429') || msg.includes('rate');
      if (isRateLimit && attempt < maxRetries) {
        attempt++;
        const wait = attempt * 60_000;
        logger.warn({ link, attempt, waitMs: wait }, 'rate limited, retrying');
        await sleep(wait);
        continue;
      }

      throw err;
    }
  }
}

async function getMatchedNewsForReanalysis(db: Pool): Promise<{ link: string; title: string; description: string; matched_company: string; matched_ticker: string }[]> {
  const { rows } = await db.query(
    `SELECT link, title, description, matched_company, matched_ticker
     FROM cybersecurity_news
     WHERE matched_ticker IS NOT NULL
     ORDER BY published_at ASC`,
  );
  return rows;
}

async function main(): Promise<void> {
  const reanalyze = process.argv.includes('--reanalyze');
  await ensureTables(pool);

  if (reanalyze) {
    logger.info('reanalyze mode — re-scraping and re-analyzing all matched articles');
    const rows = await getMatchedNewsForReanalysis(pool);
    logger.info({ total: rows.length }, 'matched articles to reanalyze');

    let analyzed = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        logger.info({ ticker: row.matched_ticker, title: row.title }, 'scraping article');
        const text = await safeGetText(row.link, row.description);
        const isScraped = text.length > (row.description?.length ?? 0);
        logger.info({ ticker: row.matched_ticker, scraped: isScraped, textLength: text.length }, 'scrape result');

        // Update scraped_text if we actually fetched something new
        if (isScraped) {
          await pool.query(
            `UPDATE cybersecurity_news SET scraped_text = $1 WHERE link = $2`,
            [text, row.link],
          );
        }

        logger.info({ ticker: row.matched_ticker, title: row.title }, 'sending to Anthropic');
        const scores = await analyzeWithRetry(text || row.title, row.matched_company, row.link);
        logger.info(
          { ticker: row.matched_ticker, sentiment: scores.sentiment, importance: scores.importance, catalyst: scores.catalyst },
          'analysis done',
        );

        await insertAnalysis(pool, row.link, { company: row.matched_company, ticker: row.matched_ticker }, scores, true);
        analyzed++;

        if (analyzed % 100 === 0) {
          logger.info({ analyzed, total: rows.length, errors }, 'reanalyze progress');
        }

        await sleep(API_DELAY_MS);
      } catch (err) {
        if ((err as Error & { fatal?: boolean }).fatal) throw err;
        logger.error({ link: row.link, err: (err as Error).message }, 'reanalyze item failed');
        errors++;
      }
    }

    logger.info({ analyzed, errors }, 'reanalysis complete');
    return;
  }

  const allFiles = discoverFiles(ARCHIVE_ROOT);
  logger.info({ total: allFiles.length, archiveRoot: ARCHIVE_ROOT }, 'files discovered');

  let filesProcessed = 0;
  let itemsFiltered = 0;
  let newItems = 0;
  let matched = 0;
  let analyzed = 0;
  let errors = 0;

  const bySource = allFiles.reduce<Record<string, number>>((acc, f) => {
    acc[f.source] = (acc[f.source] ?? 0) + 1;
    return acc;
  }, {});
  logger.info({ bySource }, 'files per source');

  for (const { source, filePath } of allFiles) {
    filesProcessed++;
    let items: RssItem[];
    try {
      items = parseXmlFile(filePath);
    } catch (err) {
      logger.warn({ filePath, err: (err as Error).message }, 'xml parse failed, skipping');
      errors++;
      continue;
    }

    const recent = items.filter(
      i => i.link && i.epochDate != null && i.epochDate >= EPOCH_CUTOFF,
    );
    itemsFiltered += recent.length;
    if (recent.length === 0) continue;

    const links = recent.map(i => i.link);
    const known = await fetchExistingLinks(pool, links);
    const toProcess = recent.filter(i => !known.has(i.link));
    newItems += toProcess.length;

    for (const item of toProcess) {
      try {
        const matches = matchCompanies(item.title, item.description);

        if (newItems % 100 === 0) {
          logger.info({ filesProcessed, newItems, matched, analyzed, errors }, 'progress');
        }

        let scrapedText = '';
        if (matches.length > 0) {
          logger.info({ ticker: matches[0].ticker, title: item.title }, 'scraping article');
          scrapedText = await safeGetText(item.link, item.description);
          logger.info(
            { ticker: matches[0].ticker, scraped: scrapedText.length > (item.description?.length ?? 0), textLength: scrapedText.length },
            'scrape result',
          );
        }

        await insertNews(pool, item, source, matches, scrapedText);

        if (matches.length === 0) continue;
        matched++;

        logger.info({ ticker: matches[0].ticker, title: item.title }, 'sending to Anthropic');
        const scores = await analyzeWithRetry(scrapedText || item.title, matches[0].company, item.link);
        logger.info(
          { ticker: matches[0].ticker, sentiment: scores.sentiment, importance: scores.importance, catalyst: scores.catalyst },
          'analysis done',
        );

        await insertAnalysis(pool, item.link, matches[0], scores);
        analyzed++;

        if (analyzed % 100 === 0) {
          logger.info({ analyzed, matched, errors }, 'progress: 100 articles analyzed');
        }

        await sleep(API_DELAY_MS);
      } catch (err) {
        if ((err as Error & { fatal?: boolean }).fatal) throw err;
        logger.error({ filePath, link: item.link, err: (err as Error).message }, 'item failed');
        errors++;
      }
    }
  }

  logger.info(
    { filesProcessed, itemsFiltered, newItems, matched, analyzed, errors },
    'ingestion complete',
  );
}

main()
  .then(() => pool.end())
  .catch(err => {
    logger.error({ err }, 'ingester failed');
    pool.end().finally(() => process.exit(1));
  });
