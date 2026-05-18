import { Injectable, OnApplicationBootstrap } from "@nestjs/common";
import { Pool } from "pg";

@Injectable()
export class CoreDbService implements OnApplicationBootstrap {
  readonly pool = new Pool({ connectionString: process.env.DATABASE_URL });

  async onApplicationBootstrap() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        username      TEXT        NOT NULL UNIQUE,
        password_hash TEXT,
        role          TEXT        NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        email         TEXT,
        oauth_id      TEXT        UNIQUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_id TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS email    TEXT;
      CREATE UNIQUE INDEX IF NOT EXISTS users_oauth_id_idx ON users (oauth_id) WHERE oauth_id IS NOT NULL;
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS company_news (
        id           TEXT        PRIMARY KEY,
        ticker       TEXT        NOT NULL,
        company_name TEXT        NOT NULL,
        title        TEXT        NOT NULL,
        link         TEXT        UNIQUE NOT NULL,
        publisher    TEXT,
        published_at TIMESTAMPTZ,
        type         TEXT,
        thumbnail    JSONB,
        related_tickers TEXT[]   DEFAULT '{}',
        raw          JSONB       NOT NULL DEFAULT '{}'
      );
      CREATE INDEX IF NOT EXISTS company_news_ticker_idx      ON company_news (ticker);
      CREATE INDEX IF NOT EXISTS company_news_published_at_idx ON company_news (published_at DESC);

      CREATE TABLE IF NOT EXISTS company_summary (
        ticker       TEXT        PRIMARY KEY,
        company_name TEXT        NOT NULL,
        data         JSONB       NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS news_analysis (
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
      CREATE INDEX IF NOT EXISTS news_analysis_ticker_idx ON news_analysis (ticker);

      CREATE TABLE IF NOT EXISTS news_analysis_queue (
        article_url  TEXT        PRIMARY KEY,
        ticker       TEXT        NOT NULL,
        company_name TEXT        NOT NULL,
        article_json JSONB       NOT NULL,
        status       TEXT        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed')),
        enqueued_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
        processed_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS news_queue_status_idx ON news_analysis_queue (status) WHERE status = 'pending';
      CREATE INDEX IF NOT EXISTS news_queue_ticker_idx ON news_analysis_queue (ticker);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS trump_posts (
        id          TEXT        PRIMARY KEY,
        created_at  TIMESTAMPTZ NOT NULL,
        content     TEXT        NOT NULL,
        url         TEXT,
        sentiment   TEXT,
        tags        TEXT[]      DEFAULT '{}',
        analyzed_at TIMESTAMPTZ
      );
      CREATE TABLE IF NOT EXISTS trump_post_tickers (
        post_id TEXT NOT NULL REFERENCES trump_posts(id) ON DELETE CASCADE,
        ticker  TEXT NOT NULL,
        value   REAL NOT NULL DEFAULT 1.0,
        PRIMARY KEY (post_id, ticker)
      );
      CREATE INDEX IF NOT EXISTS trump_post_tickers_ticker_idx ON trump_post_tickers (ticker);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS stock_meta (
        ticker       TEXT        PRIMARY KEY,
        company_name TEXT        NOT NULL,
        data         JSONB       NOT NULL,
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS stock_quotes (
        ticker   TEXT  NOT NULL,
        date     DATE  NOT NULL,
        open     REAL,
        high     REAL,
        low      REAL,
        close    REAL,
        adjclose REAL,
        volume   BIGINT,
        PRIMARY KEY (ticker, date)
      );
      CREATE INDEX IF NOT EXISTS stock_quotes_ticker_date_idx ON stock_quotes (ticker, date DESC);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS cybersecurity_news (
        id              BIGSERIAL   PRIMARY KEY,
        source          TEXT        NOT NULL,
        title           TEXT        NOT NULL,
        link            TEXT        NOT NULL UNIQUE,
        published_at    TIMESTAMPTZ,
        author          TEXT,
        categories      TEXT[]      NOT NULL DEFAULT '{}',
        description     TEXT        NOT NULL DEFAULT '',
        scraped_text    TEXT        NOT NULL DEFAULT '',
        matched_company TEXT,
        matched_ticker  TEXT,
        all_matches     JSONB       NOT NULL DEFAULT '[]',
        ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      ALTER TABLE cybersecurity_news ADD COLUMN IF NOT EXISTS scraped_text TEXT NOT NULL DEFAULT '';
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

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS dom_feedback (
        id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        message       TEXT        NOT NULL,
        tag_name      TEXT        NOT NULL,
        element_id    TEXT        NOT NULL DEFAULT '',
        classes       TEXT[]      NOT NULL DEFAULT '{}',
        css_selector  TEXT        NOT NULL,
        dom_path      TEXT[]      NOT NULL DEFAULT '{}',
        inner_text    TEXT        NOT NULL DEFAULT '',
        page_url      TEXT        NOT NULL,
        bounding_rect JSONB       NOT NULL DEFAULT '{}',
        submitted_by  TEXT        NOT NULL DEFAULT 'guest',
        status        TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending', 'approved', 'rejected', 'implemented', 'failed')),
        dev_comment   TEXT,
        ai_comment    TEXT        CHECK (char_length(ai_comment) <= 600),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS dom_feedback_status_idx     ON dom_feedback (status);
      CREATE INDEX IF NOT EXISTS dom_feedback_created_at_idx ON dom_feedback (created_at DESC);
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id    UUID        NOT NULL,
        username   TEXT        NOT NULL,
        role       TEXT        NOT NULL,
        action     TEXT        NOT NULL,
        meta       JSONB       NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS audit_log_user_id_idx    ON audit_log (user_id);
      CREATE INDEX IF NOT EXISTS audit_log_action_idx     ON audit_log (action);
      CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log (created_at DESC);
    `);
  }
}
