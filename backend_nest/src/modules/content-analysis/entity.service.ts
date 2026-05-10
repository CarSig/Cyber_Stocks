import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { z } from "zod";
import type { EntityMention, EntityType, EntityRole } from "./content-analysis.types";

const ExtractedEntitySchema = z.object({
  entities: z.array(z.object({
    name: z.string(),
    type: z.enum(["company", "region", "sector"]),
    role: z.enum(["primary_subject", "secondary_subject", "competitor", "mentioned"]),
    score: z.number().min(0).max(1),
  })),
});

const NORMALIZE: Record<string, string> = {
  "apple inc": "apple", "apple inc.": "apple",
  "microsoft corporation": "microsoft", "msft": "microsoft",
  "alphabet inc": "google", "google llc": "google",
  "meta platforms": "meta", "facebook": "meta",
  "amazon.com": "amazon", "amazon web services": "aws",
};

function resolveId(name: string): string {
  const key = name.toLowerCase().trim();
  return NORMALIZE[key] ?? key.replace(/\s+/g, "_");
}

@Injectable()
export class EntityService {
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async extractEntities(title: string, content: string): Promise<EntityMention[]> {
    const result = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a financial news analyst. Extract all entities (companies, regions, sectors) mentioned in the article.
Respond with a JSON object matching this schema exactly:
{"entities": [{"name": string, "type": "company"|"region"|"sector", "role": "primary_subject"|"secondary_subject"|"competitor"|"mentioned", "score": number 0-1}]}
Return {"entities": []} if no specific entities found.`,
        },
        { role: "user", content: `Title: ${title}\n\n${content}` },
      ],
      response_format: { type: "json_object" },
    });

    const raw = result.choices[0].message.content ?? "{}";
    const parsed = ExtractedEntitySchema.safeParse(JSON.parse(raw));
    if (!parsed.success) return [];

    return parsed.data.entities.map((e) => ({
      entityId: resolveId(e.name),
      name: e.name,
      type: e.type as EntityType,
      role: e.role as EntityRole,
      score: e.score,
      sentiment: 0,
    }));
  }
}
