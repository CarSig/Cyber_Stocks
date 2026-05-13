import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";

const MODEL = process.env.ANTHROPIC_NEWS_MODEL ?? "claude-haiku-4-5-20251001";

const TOPIC_OPTIONS = [
  "earnings", "revenue", "guidance", "acquisition", "merger", "ipo",
  "breach", "hack", "vulnerability", "ransomware", "incident",
  "regulation", "compliance", "lawsuit", "sec", "investigation",
  "partnership", "contract", "deal", "government",
  "product", "launch", "patent", "research",
  "analyst", "upgrade", "downgrade", "price-target",
  "executive", "layoff", "restructuring",
  "competition", "market-share", "sector",
];

const PROMPT = (text: string, companyName: string) =>
  `Analyze the following news article about ${companyName} stock. Return ONLY a JSON object with these fields:
- "sentiment": float from -1.0 (very negative for stock price) to 1.0 (very positive), 0 for neutral
- "importance": integer 1-10, how significant for the company (10 = earnings/acquisition/major breach)
- "relevance": integer 1-10, how directly about ${companyName} (10 = directly about the company)
- "summary": one sentence summary of the key point
- "topics": array of relevant topic strings from this list: ${TOPIC_OPTIONS.join(", ")}
- "catalyst": boolean, true if this is likely to move the stock price today
- "timeframe": "short" (days/weeks), "long" (months/years), or "both"
- "entities": array of key company names or people mentioned (max 5)

Article:
${text}`;

export async function analyzeArticleWithAnthropic(text: string, companyName: string) {
  const anthropic = new Anthropic();
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    messages: [{ role: "user", content: PROMPT(text, companyName) }],
  });

  const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  logger.debug({ model: msg.model, input: msg.usage.input_tokens, output: msg.usage.output_tokens }, "anthropic response");

  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(jsonMatch?.[0] ?? "{}") as Record<string, unknown>;

  return {
    sentiment:  Math.max(-1, Math.min(1, Number(parsed.sentiment) || 0)),
    importance: Math.max(1,  Math.min(10, Math.round(Number(parsed.importance) || 5))),
    relevance:  Math.max(1,  Math.min(10, Math.round(Number(parsed.relevance)  || 5))),
    summary:    typeof parsed.summary   === "string"  ? parsed.summary  : null,
    topics:     Array.isArray(parsed.topics)   ? (parsed.topics as string[]).filter((t) => TOPIC_OPTIONS.includes(t)) : [],
    catalyst:   typeof parsed.catalyst  === "boolean" ? parsed.catalyst  : false,
    timeframe:  ["short", "long", "both"].includes(parsed.timeframe as string) ? parsed.timeframe as string : "short",
    entities:   Array.isArray(parsed.entities) ? (parsed.entities as string[]).slice(0, 5) : [],
    model:      msg.model,
  };
}

export async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return { url: "anthropic-api", model: MODEL, available: [MODEL] };
}
