import type { Quote } from "../../types/index";

type SimAction = { date: string; type: "buy" | "sell"; value: number }
type Transaction = { date: string; type: "buy" | "sell"; shares: number; price: number; value: number; sharesAfter: number; portfolioValue: number }
type PortfolioPoint = { date: string; value: number }

type TrumpPost = { created_at?: string; analysis?: { sentiment?: string } }
type NewsArticle = { link?: string; providerPublishTime?: number | string }
type NewsAnalysis = Record<string, { sentiment?: number }>
type PresetContext = { trumpPosts?: TrumpPost[]; newsArticles?: NewsArticle[]; newsAnalysis?: NewsAnalysis }
type PresetFn = (dates: string[], ctx?: PresetContext) => { date: string; number: number }[];

const SIGNAL_THRESHOLD = 0.3; // minimum net weighted score to act

function newsSignalsByDay(newsArticles: NewsArticle[], newsAnalysis: NewsAnalysis): Record<string, { score: number }> {
  const byDay: Record<string, { score: number }> = {};
  for (const a of newsArticles) {
    if (!a.link || !a.providerPublishTime) continue;
    const ts = a.providerPublishTime;
    const day = new Date(
      typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts))
        ? Number(ts) * 1000
        : ts
    ).toISOString().slice(0, 10);
    const score = newsAnalysis[a.link]?.sentiment ?? null;
    if (score === null) continue;
    if (!byDay[day]) byDay[day] = { score: 0 };
    byDay[day].score += score;
  }
  return byDay;
}

function nextTradingDay(from: string, tradingDaySet: Set<string>): string | null {
  const d = new Date(from);
  for (let i = 1; i <= 7; i++) {
    d.setDate(d.getDate() + 1);
    const key = d.toISOString().slice(0, 10);
    if (tradingDaySet.has(key)) return key;
  }
  return null;
}

function tradingDayAfterN(from: string, n: number, tradingDaySet: Set<string>): string | null {
  const sorted = [...tradingDaySet].sort();
  const idx = sorted.indexOf(from);
  if (idx === -1) {
    // find next trading day first
    const d = new Date(from);
    for (let i = 1; i <= 7; i++) {
      d.setDate(d.getDate() + 1);
      const key = d.toISOString().slice(0, 10);
      const ki = sorted.indexOf(key);
      if (ki !== -1) return sorted[ki + n] ?? null;
    }
    return null;
  }
  return sorted[idx + n] ?? null;
}

export const simulationPresets: Record<string, PresetFn> = {
  "Simulation 1": (dates) => {
    const result: { date: string; number: number }[] = [];
    for (let i = 0; i < dates.length; i += 21) {
      result.push({ date: dates[i], number: 100 });
    }
    return result;
  },
  "Trump Signals": (dates, ctx = {}) => {
    const tradingDaySet = new Set(dates);
    const sentimentByDay: Record<string, string> = {};
    for (const post of ctx.trumpPosts ?? []) {
      const day = post.created_at?.slice(0, 10);
      if (!day || sentimentByDay[day]) continue;
      sentimentByDay[day] = post.analysis?.sentiment ?? "neutral";
    }
    const result: { date: string; number: number }[] = [];
    for (const [day, sentiment] of Object.entries(sentimentByDay)) {
      let target = day;
      if (!tradingDaySet.has(day)) {
        const d = new Date(day);
        for (let i = 1; i <= 4; i++) {
          d.setDate(d.getDate() + 1);
          const key = d.toISOString().slice(0, 10);
          if (tradingDaySet.has(key)) { target = key; break; }
        }
      }
      if (!tradingDaySet.has(target)) continue;
      if (sentiment === "positive") result.push({ date: target, number: 200 });
      if (sentiment === "negative") result.push({ date: target, number: -50 });
    }
    return result.sort((a, b) => (a.date < b.date ? -1 : 1));
  },
  "News Track 1D": (dates, ctx = {}) => {
    const { newsArticles = [], newsAnalysis = {} } = ctx;
    const tradingDaySet = new Set(dates);
    const signals = newsSignalsByDay(newsArticles, newsAnalysis);
    const byTarget = new Map<string, number>();
    for (const [day, { score }] of Object.entries(signals)) {
      const target = tradingDaySet.has(day) ? day : nextTradingDay(day, tradingDaySet);
      if (!target) continue;
      byTarget.set(target, (byTarget.get(target) ?? 0) + score);
    }
    const result: { date: string; number: number }[] = [];
    for (const [target, score] of byTarget) {
      if (score >= SIGNAL_THRESHOLD) result.push({ date: target, number: 200 });
      else if (score <= -SIGNAL_THRESHOLD) result.push({ date: target, number: -50 });
    }
    return result.sort((a, b) => (a.date < b.date ? -1 : 1));
  },
  "News Track 7D": (dates, ctx = {}) => {
    const { newsArticles = [], newsAnalysis = {} } = ctx;
    const tradingDaySet = new Set(dates);
    const signals = newsSignalsByDay(newsArticles, newsAnalysis);
    const byTarget = new Map<string, number>();
    for (const [day, { score }] of Object.entries(signals)) {
      const target = tradingDaySet.has(day) ? day : nextTradingDay(day, tradingDaySet);
      if (!target) continue;
      byTarget.set(target, (byTarget.get(target) ?? 0) + score);
    }
    const result: { date: string; number: number }[] = [];
    for (const [entry, score] of byTarget) {
      const exit = tradingDayAfterN(entry, 5, tradingDaySet);
      if (score >= SIGNAL_THRESHOLD) {
        result.push({ date: entry, number: 200 });
        if (exit) result.push({ date: exit, number: -100 });
      } else if (score <= -SIGNAL_THRESHOLD) {
        result.push({ date: entry, number: -50 });
      }
    }
    return result.sort((a, b) => (a.date < b.date ? -1 : 1));
  },
  "Simulation 2": (dates) => {
    const result: { date: string; number: number }[] = [];
    for (let i = 0; i < dates.length - 1; i += 63) {
      result.push({ date: dates[i], number: 100 });
    }
    if (dates.length > 0) result.push({ date: dates[dates.length - 1], number: -100 });
    return result;
  },
};

export function simulate(quotes: Quote[], actions: SimAction[]) {
  const seen = new Set<string>();
  const sorted = [...quotes]
    .filter((q) => q.close != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .filter((q) => {
      const day = new Date(q.date).toISOString().slice(0, 10);
      if (seen.has(day)) return false;
      seen.add(day);
      return true;
    });

  const tradingDays = new Set(sorted.map((q) => new Date(q.date).toISOString().slice(0, 10)));
  const actMap: Record<string, SimAction[]> = {};
  for (const a of actions) {
    if (!tradingDays.has(a.date)) continue;
    if (!actMap[a.date]) actMap[a.date] = [];
    actMap[a.date].push(a);
  }

  let cash = 0, shares = 0, totalInvested = 0, cashWithdrawn = 0;
  const transactions: Transaction[] = [];
  const portfolioHistory: PortfolioPoint[] = [];
  const priceHistory: PortfolioPoint[] = [];

  for (const q of sorted) {
    const day = new Date(q.date).toISOString().slice(0, 10);
    const price = q.close!;
    if (actMap[day]) {
      for (const act of actMap[day]) {
        if (act.type === "buy") {
          const bought = act.value / price;
          shares += bought; cash -= act.value; totalInvested += act.value;
          transactions.push({ date: day, type: "buy", shares: bought, price, value: act.value, sharesAfter: shares, portfolioValue: shares * price });
        } else {
          const pct = Math.min(act.value, 100) / 100;
          const sold = shares * pct;
          const proceeds = sold * price;
          shares -= sold; cash += proceeds; cashWithdrawn += proceeds;
          transactions.push({ date: day, type: "sell", shares: sold, price, value: proceeds, sharesAfter: shares, portfolioValue: shares * price });
        }
      }
    }
    portfolioHistory.push({ date: day, value: shares * price });
    priceHistory.push({ date: day, value: price });
  }

  const lastPrice = sorted.at(-1)?.close ?? 0;
  const sharesValue = shares * lastPrice;
  const finalPortfolioValue = sharesValue + cash;
  const profit = finalPortfolioValue - totalInvested;
  const profitPercent = totalInvested > 0 ? ((profit / totalInvested) * 100).toFixed(2) : "0.00";

  return { finalCash: cash, finalShares: shares, sharesValue, cashWithdrawn, finalPortfolioValue, totalInvested, profit, profitPercent, transactions, portfolioHistory, priceHistory };
}
