import { Injectable } from "@nestjs/common";
import { DbService } from "./db.service";
import { EmbeddingService } from "./embedding.service";
import { EntityService } from "./entity.service";
import { SentimentService } from "./sentiment.service";
import { sha256 } from "./hash.util";
import { CybersecurityConsumer } from "@/shared/clients/YahooCompanyClient";
import { CoreDbService } from "@/shared/core-db.service";
import { runCorrelation } from "@/shared/utils/correlations/correlationCore";
import type {
  ArticleResponse,
  BackendArticleInput,
  BackendArticleResponse,
  EntityMention,
  EntitySummary,
  NewsType,
  ProcessArticleInput,
  SignalCount,
} from "./content-analysis.types";
import type { CorrelationResult } from "@/shared/utils/correlations/correlationCore";

function classifyNewsType(mentions: EntityMention[]): NewsType {
  if (mentions.length === 0) return "macro_global";
  if (mentions.length === 1) return "company_specific";
  return "multi_entity";
}

@Injectable()
export class ContentAnalysisService {
  constructor(
    private readonly db: DbService,
    private readonly embedding: EmbeddingService,
    private readonly entity: EntityService,
    private readonly sentiment: SentimentService,
    private readonly coreDb: CoreDbService,
  ) {}

  async processArticle(input: ProcessArticleInput): Promise<ArticleResponse> {
    const contentHash = sha256(input.title + input.content);

    const existing = await this.db.pool.query<{ id: string; news_type: string }>(
      "SELECT id, news_type FROM articles WHERE content_hash = $1",
      [contentHash],
    );
    if (existing.rows.length > 0) {
      return this.buildResponse(existing.rows[0].id, existing.rows[0].news_type as NewsType);
    }

    const [{ vector }, rawEntities] = await Promise.all([
      this.embedding.getEmbedding(input.title + " " + input.content),
      this.entity.extractEntities(input.title, input.content),
    ]);

    const { mentions, globalSignals, companySignals } = await this.sentiment.scoreSentiment(
      input.title,
      input.content,
      rawEntities,
    );
    const newsType = classifyNewsType(mentions);

    await this.db.pool.query(
      `INSERT INTO articles (id, content_hash, title, content, timestamp, news_type, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO NOTHING`,
      [input.id, contentHash, input.title, input.content, input.timestamp, newsType, JSON.stringify(vector)],
    );

    for (const m of mentions) {
      await this.db.pool.query(
        `INSERT INTO entities (id, name, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [m.entityId, m.name, m.type],
      );
      await this.db.pool.query(
        `INSERT INTO entity_mentions (article_id, entity_id, score, sentiment, role)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [input.id, m.entityId, m.score, m.sentiment, m.role],
      );
    }

    for (const signal of globalSignals) {
      await this.db.pool.query(
        "INSERT INTO global_signals (article_id, signal_type) VALUES ($1, $2)",
        [input.id, signal],
      );
    }

    for (const signal of companySignals) {
      await this.db.pool.query(
        "INSERT INTO company_signals (article_id, signal_type) VALUES ($1, $2)",
        [input.id, signal],
      );
    }

    return { id: input.id, entities: mentions, newsType, globalSignals, companySignals, embeddingId: contentHash };
  }

  async getArticle(id: string): Promise<ArticleResponse | null> {
    const row = await this.db.pool.query<{ id: string; news_type: string }>(
      "SELECT id, news_type FROM articles WHERE id = $1",
      [id],
    );
    if (row.rows.length === 0) return null;
    return this.buildResponse(row.rows[0].id, row.rows[0].news_type as NewsType);
  }

  async getArticlesByEntity(entityId: string): Promise<ArticleResponse[]> {
    const rows = await this.db.pool.query<{ id: string; news_type: string }>(
      `SELECT a.id, a.news_type FROM articles a
       JOIN entity_mentions em ON em.article_id = a.id
       WHERE em.entity_id = $1
       ORDER BY a.timestamp DESC`,
      [entityId],
    );
    return Promise.all(rows.rows.map((r) => this.buildResponse(r.id, r.news_type as NewsType)));
  }

  async getEntitySummary(entityId: string): Promise<EntitySummary | null> {
    const res = await this.db.pool.query<{
      article_count: string; avg_sentiment: string;
      positive_count: string; negative_count: string; neutral_count: string;
    }>(
      `SELECT
         COUNT(*) AS article_count,
         AVG(sentiment) AS avg_sentiment,
         SUM(CASE WHEN sentiment > 0.1 THEN 1 ELSE 0 END) AS positive_count,
         SUM(CASE WHEN sentiment < -0.1 THEN 1 ELSE 0 END) AS negative_count,
         SUM(CASE WHEN sentiment BETWEEN -0.1 AND 0.1 THEN 1 ELSE 0 END) AS neutral_count
       FROM entity_mentions WHERE entity_id = $1`,
      [entityId],
    );
    if (!res.rows.length || res.rows[0].article_count === "0") return null;

    const roleRes = await this.db.pool.query<{ role: string }>(
      `SELECT role FROM entity_mentions WHERE entity_id = $1
       GROUP BY role ORDER BY COUNT(*) DESC LIMIT 1`,
      [entityId],
    );

    const r = res.rows[0];
    return {
      entityId,
      articleCount: Number(r.article_count),
      avgSentiment: Number(Number(r.avg_sentiment).toFixed(3)),
      positiveCount: Number(r.positive_count),
      negativeCount: Number(r.negative_count),
      neutralCount: Number(r.neutral_count),
      dominantRole: roleRes.rows[0]?.role ?? "mentioned",
    };
  }

  async getGlobalSignals(): Promise<SignalCount[]> {
    const res = await this.db.pool.query<{ signal_type: string; count: string }>(
      `SELECT signal_type, COUNT(*) AS count
       FROM global_signals GROUP BY signal_type ORDER BY count DESC`,
    );
    return res.rows.map((r) => ({ signalType: r.signal_type, count: Number(r.count) }));
  }

  // --- backend (Yahoo news) variants ---

  async processBackendArticle(input: BackendArticleInput): Promise<BackendArticleResponse> {
    const existing = await this.db.pool.query<{ id: string; news_type: string }>(
      "SELECT id, news_type FROM backend_articles WHERE id = $1",
      [input.id],
    );
    if (existing.rows.length > 0) {
      return this.buildBackendResponse(existing.rows[0].id, existing.rows[0].news_type as NewsType);
    }

    const text = input.title;
    const [{ vector }, rawEntities] = await Promise.all([
      this.embedding.getEmbedding(text),
      this.entity.extractEntities(input.title, text),
    ]);

    const { mentions, globalSignals, companySignals } = await this.sentiment.scoreSentiment(
      input.title,
      text,
      rawEntities,
    );
    const newsType = classifyNewsType(mentions);

    await this.db.pool.query(
      `INSERT INTO backend_articles (id, uuid, title, link, publisher, ticker, timestamp, news_type, embedding)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING`,
      [input.id, input.uuid ?? null, input.title, input.link, input.publisher ?? null, input.ticker, input.timestamp, newsType, JSON.stringify(vector)],
    );

    for (const m of mentions) {
      await this.db.pool.query(
        `INSERT INTO entities (id, name, type) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [m.entityId, m.name, m.type],
      );
      await this.db.pool.query(
        `INSERT INTO backend_entity_mentions (article_id, entity_id, score, sentiment, role)
         VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING`,
        [input.id, m.entityId, m.score, m.sentiment, m.role],
      );
    }

    for (const signal of globalSignals) {
      await this.db.pool.query(
        "INSERT INTO backend_global_signals (article_id, signal_type) VALUES ($1, $2)",
        [input.id, signal],
      );
    }

    for (const signal of companySignals) {
      await this.db.pool.query(
        "INSERT INTO backend_company_signals (article_id, signal_type) VALUES ($1, $2)",
        [input.id, signal],
      );
    }

    return this.buildBackendResponse(input.id, newsType);
  }

  async getBackendArticlesByEntity(entityId: string): Promise<BackendArticleResponse[]> {
    const rows = await this.db.pool.query<{ id: string; news_type: string }>(
      `SELECT a.id, a.news_type FROM backend_articles a
       JOIN backend_entity_mentions em ON em.article_id = a.id
       WHERE em.entity_id = $1
       ORDER BY a.timestamp DESC`,
      [entityId],
    );
    return Promise.all(rows.rows.map((r) => this.buildBackendResponse(r.id, r.news_type as NewsType)));
  }

  async getBackendEntitySummary(entityId: string): Promise<EntitySummary | null> {
    const res = await this.db.pool.query<{
      article_count: string; avg_sentiment: string;
      positive_count: string; negative_count: string; neutral_count: string;
    }>(
      `SELECT
         COUNT(*) AS article_count,
         AVG(sentiment) AS avg_sentiment,
         SUM(CASE WHEN sentiment > 0.1 THEN 1 ELSE 0 END) AS positive_count,
         SUM(CASE WHEN sentiment < -0.1 THEN 1 ELSE 0 END) AS negative_count,
         SUM(CASE WHEN sentiment BETWEEN -0.1 AND 0.1 THEN 1 ELSE 0 END) AS neutral_count
       FROM backend_entity_mentions WHERE entity_id = $1`,
      [entityId],
    );
    if (!res.rows.length || res.rows[0].article_count === "0") return null;

    const roleRes = await this.db.pool.query<{ role: string }>(
      `SELECT role FROM backend_entity_mentions WHERE entity_id = $1
       GROUP BY role ORDER BY COUNT(*) DESC LIMIT 1`,
      [entityId],
    );

    const r = res.rows[0];
    return {
      entityId,
      articleCount: Number(r.article_count),
      avgSentiment: Number(Number(r.avg_sentiment).toFixed(3)),
      positiveCount: Number(r.positive_count),
      negativeCount: Number(r.negative_count),
      neutralCount: Number(r.neutral_count),
      dominantRole: roleRes.rows[0]?.role ?? "mentioned",
    };
  }

  async getBackendEntities(): Promise<{ entityId: string; name: string; articleCount: number }[]> {
    const res = await this.db.pool.query<{ entity_id: string; name: string; count: string }>(
      `SELECT em.entity_id, e.name, COUNT(*) AS count
       FROM backend_entity_mentions em
       JOIN entities e ON e.id = em.entity_id
       GROUP BY em.entity_id, e.name
       ORDER BY count DESC`,
    );
    return res.rows.map((r) => ({ entityId: r.entity_id, name: r.name, articleCount: Number(r.count) }));
  }

  async getBackendGlobalSignals(): Promise<SignalCount[]> {
    const res = await this.db.pool.query<{ signal_type: string; count: string }>(
      `SELECT signal_type, COUNT(*) AS count
       FROM backend_global_signals GROUP BY signal_type ORDER BY count DESC`,
    );
    return res.rows.map((r) => ({ signalType: r.signal_type, count: Number(r.count) }));
  }

  async getAllSentimentCorrelations(
    entities: { entityId: string; name: string; ticker: string }[],
    lagDays: number,
  ): Promise<{ entityId: string; name: string; ticker: string; result: CorrelationResult | { error: string } }[]> {
    const rows = await this.db.pool.query<{ entity_id: string; day: string; weighted_sentiment: string }>(
      `SELECT
         em.entity_id,
         DATE(a.timestamp)::text AS day,
         (em.sentiment * em.score) AS weighted_sentiment
       FROM backend_articles a
       JOIN backend_entity_mentions em ON em.article_id = a.id
       WHERE em.entity_id = ANY($1)
       ORDER BY day`,
      [entities.map((e) => e.entityId)],
    );

    const byEntity = new Map<string, { day: string; value: number }[]>();
    for (const r of rows.rows) {
      if (r.weighted_sentiment == null) continue;
      const arr = byEntity.get(r.entity_id) ?? [];
      arr.push({ day: r.day.slice(0, 10), value: Number(r.weighted_sentiment) });
      byEntity.set(r.entity_id, arr);
    }

    return Promise.all(
      entities.map(async ({ entityId, name, ticker }) => {
        const dayValues = byEntity.get(entityId) ?? [];
        try {
          const consumer = new CybersecurityConsumer(name, this.coreDb.pool);
          const history = await consumer.history();
          const result = runCorrelation(dayValues, history.quotes ?? [], { lagDays, source: "news sentiment (relevance-weighted)" });
          return { entityId, name, ticker, result };
        } catch (e: unknown) {
          return { entityId, name, ticker, result: { error: e instanceof Error ? e.message : String(e) } };
        }
      }),
    );
  }

  private async buildResponse(articleId: string, newsType: NewsType): Promise<ArticleResponse> {
    const [mentionsRes, globalRes, companyRes] = await Promise.all([
      this.db.pool.query<{ entity_id: string; name: string; type: string; role: string; score: number; sentiment: number }>(
        `SELECT em.entity_id, e.name, e.type, em.role, em.score, em.sentiment
         FROM entity_mentions em JOIN entities e ON e.id = em.entity_id
         WHERE em.article_id = $1`,
        [articleId],
      ),
      this.db.pool.query<{ signal_type: string }>(
        "SELECT signal_type FROM global_signals WHERE article_id = $1",
        [articleId],
      ),
      this.db.pool.query<{ signal_type: string }>(
        "SELECT signal_type FROM company_signals WHERE article_id = $1",
        [articleId],
      ),
    ]);

    return {
      id: articleId,
      entities: mentionsRes.rows.map((r) => ({
        entityId: r.entity_id,
        name: r.name,
        type: r.type as EntityMention["type"],
        role: r.role as EntityMention["role"],
        score: r.score,
        sentiment: r.sentiment,
      })),
      newsType,
      globalSignals: globalRes.rows.map((r) => r.signal_type),
      companySignals: companyRes.rows.map((r) => r.signal_type),
      embeddingId: articleId,
    };
  }

  private async buildBackendResponse(articleId: string, newsType: NewsType): Promise<BackendArticleResponse> {
    const articleRes = await this.db.pool.query<{ link: string; publisher: string | null; ticker: string; timestamp: string }>(
      "SELECT link, publisher, ticker, timestamp FROM backend_articles WHERE id = $1",
      [articleId],
    );
    const meta = articleRes.rows[0];

    const [mentionsRes, globalRes, companyRes] = await Promise.all([
      this.db.pool.query<{ entity_id: string; name: string; type: string; role: string; score: number; sentiment: number }>(
        `SELECT em.entity_id, e.name, e.type, em.role, em.score, em.sentiment
         FROM backend_entity_mentions em JOIN entities e ON e.id = em.entity_id
         WHERE em.article_id = $1`,
        [articleId],
      ),
      this.db.pool.query<{ signal_type: string }>(
        "SELECT signal_type FROM backend_global_signals WHERE article_id = $1",
        [articleId],
      ),
      this.db.pool.query<{ signal_type: string }>(
        "SELECT signal_type FROM backend_company_signals WHERE article_id = $1",
        [articleId],
      ),
    ]);

    return {
      id: articleId,
      link: meta?.link ?? "",
      publisher: meta?.publisher ?? null,
      ticker: meta?.ticker ?? "",
      timestamp: meta?.timestamp ?? "",
      entities: mentionsRes.rows.map((r) => ({
        entityId: r.entity_id,
        name: r.name,
        type: r.type as EntityMention["type"],
        role: r.role as EntityMention["role"],
        score: r.score,
        sentiment: r.sentiment,
      })),
      newsType,
      globalSignals: globalRes.rows.map((r) => r.signal_type),
      companySignals: companyRes.rows.map((r) => r.signal_type),
      embeddingId: articleId,
    };
  }
}
