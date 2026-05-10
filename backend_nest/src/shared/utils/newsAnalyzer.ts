// eslint-disable-next-line @typescript-eslint/no-require-imports
const { SentimentIntensityAnalyzer } = require("vader-sentiment") as {
  SentimentIntensityAnalyzer: { polarity_scores(text: string): { pos: number; neg: number; neu: number; compound: number } };
};

type NewsArticle = {
  title?: string;
  relatedTickers?: string[];
}

const HIGH_IMPORTANCE = [
  "earnings", "revenue", "profit", "loss", "beat", "miss", "guidance",
  "acquisition", "acquires", "merger", "buyout", "takeover", "ipo",
  "breach", "hack", "cyberattack", "ransomware", "incident", "vulnerability",
  "sec", "lawsuit", "settlement", "investigation", "fraud",
  "ceo", "cfo", "cto", "resign", "appoint", "fired",
  "layoff", "layoffs", "cuts", "restructur",
  "partnership", "contract", "deal", "billion", "million",
  "bankruptcy", "default", "delisted",
];

const MED_IMPORTANCE = [
  "upgrade", "downgrade", "analyst", "target", "rating", "forecast",
  "product", "launch", "release", "update", "feature",
  "quarter", "annual", "report", "results",
  "growth", "decline", "market share", "competition",
];

export function analyzeArticle(article: NewsArticle, companyName: string, ticker: string) {
  const title      = article.title ?? "";
  const titleLower = title.toLowerCase();

  const scores    = SentimentIntensityAnalyzer.polarity_scores(title);
  const sentiment = parseFloat(scores.compound.toFixed(3));

  let importanceScore = 0;
  for (const kw of HIGH_IMPORTANCE) {
    if (titleLower.includes(kw)) { importanceScore += 2; break; }
  }
  for (const kw of MED_IMPORTANCE) {
    if (titleLower.includes(kw)) { importanceScore += 1; break; }
  }
  if (/\$[\d.]+[bm]/i.test(title) || /\d+\s*(?:billion|million)/i.test(title)) importanceScore += 1;
  if (/\d+%/.test(title)) importanceScore += 1;
  const importance = Math.min(10, Math.max(1, importanceScore + 3));

  const companyLower = companyName.toLowerCase();
  const companyShort = companyName.split(/\s+/)[0].toLowerCase();
  const tickerLower  = ticker.toLowerCase();

  let relevanceScore = 0;
  if (titleLower.includes(companyLower))      relevanceScore += 5;
  else if (titleLower.includes(companyShort)) relevanceScore += 4;
  if (titleLower.includes(tickerLower))       relevanceScore += 3;

  const related = article.relatedTickers ?? [];
  if (related[0] === ticker)         relevanceScore += 3;
  else if (related.includes(ticker)) relevanceScore += 2;

  return { sentiment, importance, relevance: Math.min(10, Math.max(1, relevanceScore + 2)) };
}
