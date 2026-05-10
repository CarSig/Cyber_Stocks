import { Injectable } from "@nestjs/common";
import OpenAI from "openai";
import { z } from "zod";
import type { EntityMention } from "./content-analysis.types";

const SINGLE_WORD = z.string().regex(/^[a-z]+$/);

const SentimentSchema = z.object({
  sentiments: z.array(z.object({
    entityId: z.string(),
    sentiment: z.number().min(-1).max(1),
    globalSignals: z.array(SINGLE_WORD).optional(),
  })),
  companySignals: z.array(SINGLE_WORD).optional(),
});

const SignalsSchema = z.object({
  signals: z.array(SINGLE_WORD),
});

@Injectable()
export class SentimentService {
  private readonly openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  async scoreSentiment(
    title: string,
    content: string,
    entities: EntityMention[],
  ): Promise<{ mentions: EntityMention[]; globalSignals: string[]; companySignals: string[] }> {
    if (entities.length === 0) {
      const result = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Extract global macro signals from this article as single lowercase words only (no spaces, no multi-word phrases).
Good examples: "ransomware", "phishing", "vulnerability", "breach", "patching", "zerotrust", "malware", "espionage", "ddos", "compliance".
Bad examples: "enterprise_security", "market_pressure", "interest_rate_rise" — these are too long, break them to the most atomic concept.
Respond with JSON: {"signals": ["word1", "word2"]} — up to 5 single words.`,
          },
          { role: "user", content: `Title: ${title}\n\n${content}` },
        ],
        response_format: { type: "json_object" },
      });
      const raw = result.choices[0].message.content ?? "{}";
      const parsed = SignalsSchema.safeParse(JSON.parse(raw));
      return { mentions: [], globalSignals: parsed.success ? parsed.data.signals : [], companySignals: [] };
    }

    const entityList = entities.map((e) => `- ${e.entityId} (${e.name})`).join("\n");

    const result = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Score sentiment for each entity and extract company-level signals from this article.
Sentiment scale: -1.0 (very negative) to +1.0 (very positive), 0 = neutral.
Company signals are single lowercase words describing what this article is about for the company (e.g. "investment", "analyst", "downgrade", "partnership", "earnings", "growth", "lawsuit").
Global signals are macro/market single lowercase words not tied to a specific company (e.g. "inflation", "rates", "regulation").
All signals must be single lowercase words only — no spaces, no underscores.
Respond with JSON: {"sentiments": [{"entityId": string, "sentiment": number, "globalSignals": []}], "companySignals": ["word1", "word2"]}`,
        },
        {
          role: "user",
          content: `Title: ${title}\n\n${content}\n\nEntities:\n${entityList}`,
        },
      ],
      response_format: { type: "json_object" },
    });

    const raw = result.choices[0].message.content ?? "{}";
    const parsed = SentimentSchema.safeParse(JSON.parse(raw));
    const scoreMap = new Map(parsed.success ? parsed.data.sentiments.map((s) => [s.entityId, s]) : []);
    const globalSignals = [...scoreMap.values()].flatMap((s) => s.globalSignals ?? []);
    const companySignals = parsed.success ? (parsed.data.companySignals ?? []) : [];

    return {
      mentions: entities.map((e) => ({ ...e, sentiment: scoreMap.get(e.entityId)?.sentiment ?? 0 })),
      globalSignals,
      companySignals,
    };
  }
}
