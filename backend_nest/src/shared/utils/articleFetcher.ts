import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { logger } from "../logger";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_TEXT_CHARS   = 4000;

export async function fetchArticleText(url: string): Promise<{ text: string; title: string }> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; NewsBot/1.0)",
      "Accept": "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);

  const html    = await res.text();
  const dom     = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article?.textContent?.trim()) throw new Error(`No article text extracted from ${url}`);

  const text = article.textContent.replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_CHARS);
  logger.debug({ url, chars: text.length, title: article.title }, "article fetched");
  return { text, title: article.title ?? "" };
}
