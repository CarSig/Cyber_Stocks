import fs from "fs";
import path from "path";
import { PATHS } from "@/shared/paths";
import { logger } from "@/shared/logger";

const SEC_USER_AGENT = "AlgoTrading/1.0 lovro.boric@gmail.com";
const EDGAR_ARCHIVES = "https://www.sec.gov/Archives/edgar/data";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function secFetch(url: string): Promise<Response> {
  const res = await fetch(url, {
    headers: { "User-Agent": SEC_USER_AGENT, "Accept-Encoding": "gzip, deflate" },
  });
  await sleep(110); // SEC rate limit: max 10 req/sec
  return res;
}

/** A real 8-K body doc, not an index page, XBRL viewer fragment, or header. */
function isBodyDoc(name: string): boolean {
  if (!/\.(htm|html|txt)$/i.test(name)) return false;
  if (/index/i.test(name)) return false;
  if (/-index-headers/i.test(name)) return false;
  if (/R\d+\.htm$/.test(name)) return false; // XBRL viewer fragment
  return true;
}

/** Strip HTML/entities to plain lowercase-friendly text. Tuned for 8-K boilerplate, not articles. */
export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#xa0;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#147;|&#148;|&#8220;|&#8221;|&quot;/gi, '"')
    .replace(/&#146;|&#8217;|&#39;/gi, "'")
    .replace(/&[a-z]+;|&#\d+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

type BodyLocator = { ticker: string; accession: string; cik: string };

/**
 * Returns the plain-text body of a filing. Reads the body file from disk if a
 * usable one is already saved; otherwise fetches the filing's index.json from
 * SEC, picks the primary body doc, persists it, and returns its text. Returns
 * null if no body could be obtained.
 */
export async function readBodyText({ ticker, accession, cik }: BodyLocator): Promise<string | null> {
  const accDir = path.join(PATHS.secArchive(ticker), accession);

  // 1. Try disk first.
  if (fs.existsSync(accDir)) {
    const local = fs.readdirSync(accDir).find(isBodyDoc);
    if (local) {
      try {
        return htmlToText(fs.readFileSync(path.join(accDir, local), "utf8"));
      } catch { /* fall through to fetch */ }
    }
  }

  // 2. Fetch from SEC: resolve the body doc via index.json, then download it.
  if (!cik) return null;
  const accNoDashes = accession.replace(/-/g, "");
  const indexUrl = `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}/index.json`;
  try {
    const idxRes = await secFetch(indexUrl);
    if (!idxRes.ok) {
      logger.warn({ accession, status: idxRes.status }, "scan: index fetch failed");
      return null;
    }
    const index = (await idxRes.json()) as { directory: { item: { name: string }[] | { name: string } } };
    const items = Array.isArray(index.directory.item) ? index.directory.item : [index.directory.item];
    const bodyName = items.map((i) => i?.name).filter(Boolean).find(isBodyDoc);
    if (!bodyName) return null;

    const bodyUrl = `${EDGAR_ARCHIVES}/${cik}/${accNoDashes}/${bodyName}`;
    const bodyRes = await secFetch(bodyUrl);
    if (!bodyRes.ok) {
      logger.warn({ accession, file: bodyName, status: bodyRes.status }, "scan: body fetch failed");
      return null;
    }
    const html = await bodyRes.text();

    // Persist for future runs (download-bodies-to-disk per design).
    try {
      fs.mkdirSync(accDir, { recursive: true });
      fs.writeFileSync(path.join(accDir, bodyName), html);
    } catch (e) {
      logger.warn({ accession, err: (e as Error).message }, "scan: could not persist body");
    }

    return htmlToText(html);
  } catch (e) {
    logger.warn({ accession, err: (e as Error).message }, "scan: body fetch errored");
    return null;
  }
}

// Curated cyber/operational keywords. Multi-word phrases must appear verbatim
// (after whitespace collapse). Tune as false positives/negatives surface.
export const CYBER_KEYWORDS = [
  "cybersecurity incident",
  "cyberattack",
  "cyber attack",
  "security incident",
  "data breach",
  "unauthorized access",
  "unauthorized third party",
  "ransomware",
  "threat actor",
  "malicious",
  "compromised",
  "service disruption",
  "service outage",
  "outage",
  "system disruption",
  "denial of service",
];

export type ScanMatch = { matched: boolean; keywords: string[]; snippet: string | null };

/** Case-insensitive keyword scan. Returns matched keywords + a context snippet around the first hit. */
export function scanCyberKeywords(text: string): ScanMatch {
  const lower = text.toLowerCase();
  const keywords: string[] = [];
  let firstIdx = -1;
  for (const kw of CYBER_KEYWORDS) {
    const idx = lower.indexOf(kw);
    if (idx === -1) continue;
    keywords.push(kw);
    if (firstIdx === -1 || idx < firstIdx) firstIdx = idx;
  }
  if (keywords.length === 0) return { matched: false, keywords: [], snippet: null };

  const start = Math.max(0, firstIdx - 60);
  const snippet = text.slice(start, firstIdx + 100).trim();
  return { matched: true, keywords, snippet };
}
