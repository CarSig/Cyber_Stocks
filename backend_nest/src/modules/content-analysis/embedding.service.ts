import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { DbService } from "./db.service";
import { sha256 } from "./hash.util";

@Injectable()
export class EmbeddingService {
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  constructor(private readonly db: DbService) {}

  async getEmbedding(text: string): Promise<{ embeddingId: string; vector: number[] }> {
    const hash = sha256(text);

    const cached = await this.db.pool.query<{ id: string; embedding: string }>(
      "SELECT id, embedding FROM articles WHERE content_hash = $1 AND embedding IS NOT NULL LIMIT 1",
      [hash],
    );
    if (cached.rows.length > 0) {
      return { embeddingId: cached.rows[0].id, vector: JSON.parse(cached.rows[0].embedding) };
    }

    const res = await this.openai.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    return { embeddingId: hash, vector: res.data[0].embedding };
  }
}
