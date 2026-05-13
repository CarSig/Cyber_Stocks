import { Injectable, OnApplicationBootstrap, OnApplicationShutdown } from "@nestjs/common";
import { Pool } from "pg";

@Injectable()
export class DbService implements OnApplicationBootstrap, OnApplicationShutdown {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.CONTENT_ANALYSIS_DATABASE_URL });
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.pool.query(`CREATE EXTENSION IF NOT EXISTS vector`);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id           TEXT PRIMARY KEY,
        content_hash TEXT UNIQUE NOT NULL,
        title        TEXT NOT NULL,
        content      TEXT NOT NULL,
        timestamp    TIMESTAMPTZ NOT NULL,
        news_type    TEXT NOT NULL,
        embedding    vector(1536)
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS entities (
        id   TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS entity_mentions (
        article_id TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        entity_id  TEXT NOT NULL REFERENCES entities(id),
        score      REAL NOT NULL,
        sentiment  REAL NOT NULL,
        role       TEXT NOT NULL,
        PRIMARY KEY (article_id, entity_id)
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS global_signals (
        id          SERIAL PRIMARY KEY,
        article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS company_signals (
        id          SERIAL PRIMARY KEY,
        article_id  TEXT NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS backend_articles (
        id          TEXT PRIMARY KEY,
        uuid        TEXT,
        title       TEXT NOT NULL,
        link        TEXT NOT NULL,
        publisher   TEXT,
        ticker      TEXT NOT NULL,
        timestamp   TIMESTAMPTZ NOT NULL,
        news_type   TEXT NOT NULL DEFAULT 'company_specific',
        embedding   vector(1536),
        urgency     TEXT DEFAULT 'recent'
      )
    `);

    // Add urgency column to existing table if it doesn't exist
    await this.pool.query(`
      ALTER TABLE backend_articles ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'recent'
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS backend_entity_mentions (
        article_id  TEXT NOT NULL REFERENCES backend_articles(id) ON DELETE CASCADE,
        entity_id   TEXT NOT NULL REFERENCES entities(id),
        score       REAL NOT NULL,
        sentiment   REAL NOT NULL,
        role        TEXT NOT NULL,
        PRIMARY KEY (article_id, entity_id)
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS backend_global_signals (
        id          SERIAL PRIMARY KEY,
        article_id  TEXT NOT NULL REFERENCES backend_articles(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL
      )
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS backend_company_signals (
        id          SERIAL PRIMARY KEY,
        article_id  TEXT NOT NULL REFERENCES backend_articles(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL
      )
    `);
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
