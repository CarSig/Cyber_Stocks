import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../logger";
import { llmTokensTotal, llmRequestDuration } from "../metrics";

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

const SYSTEM_PROMPT = `Analyze news articles about stocks. Return ONLY a JSON object with these fields:
- "sentiment": float from -1.0 (very negative for stock price) to 1.0 (very positive), 0 for neutral
- "importance": integer 1-10, how significant for the company (10 = earnings/acquisition/major breach)
- "relevance": integer 1-10, how directly about the company (10 = directly about the company)
- "summary": one sentence summary of the key point
- "topics": array of relevant topic strings from this list: ${TOPIC_OPTIONS.join(", ")}
- "catalyst": boolean, true if this is likely to move the stock price today
- "timeframe": "short" (days/weeks), "long" (months/years), or "both"
- "entities": array of key company names or people mentioned (max 5)`;

export async function analyzeArticleWithAnthropic(text: string, companyName: string) {
  const anthropic = new Anthropic();
  const endTimer = llmRequestDuration.startTimer({ model: MODEL });
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `Company: ${companyName}\n\nArticle:\n${text}` }],
  });
  endTimer();

  llmTokensTotal.inc({ model: msg.model, type: "input" }, msg.usage.input_tokens);
  llmTokensTotal.inc({ model: msg.model, type: "output" }, msg.usage.output_tokens);
  const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const usage = msg.usage as typeof msg.usage & { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  logger.debug({
    model: msg.model,
    input: msg.usage.input_tokens,
    output: msg.usage.output_tokens,
    cache_write: usage.cache_creation_input_tokens ?? 0,
    cache_read: usage.cache_read_input_tokens ?? 0,
  }, "anthropic response");

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

const FILING_CYBER_SYSTEM_PROMPT = `You classify SEC 8-K "Item 8.01 (Other Events)" filings. A keyword prefilter already flagged this filing for containing cyber/security/outage terms, but those words often appear only in boilerplate (risk factors, forward-looking statements, marketing copy, company descriptions) rather than describing an actual event.

Decide whether this filing is DISCLOSING AN ACTUAL cybersecurity incident, data breach, ransomware attack, or material service outage that the company experienced. Boilerplate risk-factor language, generic descriptions of a security company's products, or routine forward-looking statements do NOT count.

Return ONLY a JSON object:
- "isRealIncident": boolean — true only if the filing discloses an actual incident/breach/outage the company experienced
- "confidence": float 0.0-1.0
- "incidentType": one of "breach", "ransomware", "outage", "unauthorized-access", "other", or "none" (if not a real incident)
- "summary": one sentence describing the event, or why it's not a real incident`;

export async function classifyFiling8kCyber(text: string, companyName: string) {
  const anthropic = new Anthropic();
  const endTimer = llmRequestDuration.startTimer({ model: MODEL });
  const msg = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 256,
    system: [{ type: "text", text: FILING_CYBER_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    // 8-K bodies can be long; the event language is near the Item header, so cap input.
    messages: [{ role: "user", content: `Company: ${companyName}\n\n8-K Item 8.01 body:\n${text.slice(0, 8000)}` }],
  });
  endTimer();

  llmTokensTotal.inc({ model: msg.model, type: "input" }, msg.usage.input_tokens);
  llmTokensTotal.inc({ model: msg.model, type: "output" }, msg.usage.output_tokens);
  const raw = msg.content.find((b) => b.type === "text")?.text ?? "{}";
  const parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}") as Record<string, unknown>;

  const types = ["breach", "ransomware", "outage", "unauthorized-access", "other", "none"];
  return {
    isRealIncident: parsed.isRealIncident === true,
    confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0)),
    incidentType: types.includes(parsed.incidentType as string) ? (parsed.incidentType as string) : "none",
    summary: typeof parsed.summary === "string" ? parsed.summary : null,
    model: msg.model,
  };
}

export async function checkAnthropic() {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY not set");
  return { url: "anthropic-api", model: MODEL, available: [MODEL] };
}
