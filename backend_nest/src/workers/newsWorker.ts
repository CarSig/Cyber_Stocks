#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
import amqplib from 'amqplib';
import type { Channel, ConsumeMessage } from 'amqplib';
import { Pool } from 'pg';
import { logger } from '@/shared/logger';
import { analyzeArticleWithAnthropic } from '@/shared/utils/anthropicAnalyzer';
import { NEWS_ANALYZED_QUEUE, MAX_RETRIES } from '@/shared/mq/connection';
import { newsArticlesProcessedTotal, rabbitmqDlxMessagesTotal } from '@/shared/metrics';

const AMQP_URL = process.env.AMQP_URL ?? 'amqp://localhost';
const QUEUE = 'news.articles';
const NEWS_DLX = 'news.articles.dlx';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function processMessage(msg: ConsumeMessage, ch: Channel): Promise<void> {
  const { companyName, ticker, article } = JSON.parse(
    msg.content.toString(),
  ) as {
    companyName: string;
    ticker: string;
    article: { link?: string; title?: string };
  };

  // Skip if already analyzed
  if (article.link) {
    const { rows } = await pool.query(
      `SELECT 1 FROM news_analysis WHERE article_url = $1`,
      [article.link],
    );
    if (rows.length > 0) {
      logger.debug(
        { ticker, link: article.link },
        'already analyzed, skipping',
      );
      newsArticlesProcessedTotal.inc({ status: 'skipped' });
      ch.ack(msg);
      return;
    }
  }

  const text = article.title ?? '';
  logger.info({ ticker, title: article.title }, 'analyzing with Anthropic');
  const scores = await analyzeArticleWithAnthropic(text, companyName);

  if (article.link) {
    await pool.query(
      `INSERT INTO news_analysis (article_url, ticker, company_name, sentiment, importance, relevance, summary, topics, catalyst, timeframe, entities, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (article_url) DO NOTHING`,
      [
        article.link,
        ticker,
        companyName,
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
    await pool.query(
      `UPDATE news_analysis_queue SET status = 'done', processed_at = now()
       WHERE article_url = $1`,
      [article.link],
    );
  }

  newsArticlesProcessedTotal.inc({ status: 'success' });
  logger.info(
    {
      ticker,
      title: article.title,
      sentiment: scores.sentiment,
      importance: scores.importance,
    },
    'analysis saved',
  );
  ch.sendToQueue(
    NEWS_ANALYZED_QUEUE,
    Buffer.from(JSON.stringify({ ticker, title: article.title, scores })),
    { persistent: false },
  );
  ch.ack(msg);
}

async function connect(retries = 10, delayMs = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      return await amqplib.connect(AMQP_URL);
    } catch (err) {
      logger.warn(
        { attempt: i, retries, err: (err as Error).message },
        'RabbitMQ not ready, retrying...',
      );
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  throw new Error('RabbitMQ unreachable after retries');
}

async function start(): Promise<void> {
  const conn = await connect();
  const ch = await conn.createChannel();
  await ch.assertExchange(NEWS_DLX, 'direct', { durable: true });
  await ch.assertQueue(QUEUE, { durable: true, arguments: { 'x-dead-letter-exchange': NEWS_DLX, 'x-dead-letter-routing-key': QUEUE } });
  ch.prefetch(1);

  logger.info(
    {
      queue: QUEUE,
      model: process.env.ANTHROPIC_NEWS_MODEL ?? 'claude-haiku-4-5-20251001',
    },
    'news worker started',
  );

  ch.consume(QUEUE, async (msg) => {
    if (!msg) return;
    try {
      await processMessage(msg, ch);
    } catch (err) {
      const deaths = (msg.properties.headers?.["x-death"] as Array<{ count: number }> | undefined)?.[0]?.count ?? 0;
      const requeue = deaths < MAX_RETRIES;
      logger.error({ err, deaths, requeue }, 'failed to process message');
      newsArticlesProcessedTotal.inc({ status: 'failed' });
      if (!requeue) rabbitmqDlxMessagesTotal.inc({ queue: 'news.articles' });
      ch.nack(msg, false, requeue);
    }
  });

  process.on('SIGINT', async () => {
    logger.info('worker shutting down');
    await pool.end();
    await conn.close();
    process.exit(0);
  });
}

start().catch((err: unknown) => {
  logger.error({ err }, 'worker failed to start');
  process.exit(1);
});
