import { cssVar } from "./theme.js";

export const SENTIMENT_COLORS = { positive: "#22c55e", negative: "#ef4444", neutral: "#eab308" };
const NVD_SEVERITY_PRIORITY = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };
export const NVD_SEVERITY_COLORS = { CRITICAL: "#ef4444", HIGH: "#f97316", MEDIUM: "#eab308", LOW: "#60a5fa", UNKNOWN: "#6b7280" };

export function dedupeMarkers(markers) {
  return [...new Map(markers.map((m) => [`${m.time}|${m.position}|${m.color}`, m])).values()];
}

export function buildMarkers(analysis, color) {
  if (!analysis) return [];
  const { biggestSameDayDiff: same, biggestNextDayDiff: next } = analysis;
  const amber = color ?? cssVar("--color-amber");
  const red   = color ?? cssVar("--color-red");
  return [
    same?.date     && { time: new Date(same.date).toISOString().slice(0, 10),     position: "aboveBar", color: amber, shape: "circle",  text: `Swing ${same.difference}` },
    next?.[0]?.date && { time: new Date(next[0].date).toISOString().slice(0, 10), position: "belowBar", color: red,   shape: "arrowUp", text: "Move D1" },
    next?.[1]?.date && { time: new Date(next[1].date).toISOString().slice(0, 10), position: "belowBar", color: red,   shape: "arrowUp", text: "Move D2" },
  ].filter(Boolean).sort((a, b) => (a.time < b.time ? -1 : 1));
}

export function buildCountMarkers(items, { dateField, position, color, shape, label }) {
  if (!items?.length) return [];
  const byDay = new Map();
  for (const item of items) {
    const time = item[dateField]?.slice(0, 10);
    if (!time) continue;
    byDay.set(time, (byDay.get(time) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([time, count]) => ({ time, position, color, shape, text: `${label} ×${count}` }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function buildNvdMarkers(nvdVulns) {
  if (!nvdVulns?.length) return [];
  const byDay = new Map();
  for (const v of nvdVulns) {
    if (!v.published) continue;
    const time = v.published.slice(0, 10);
    const sev = v.severity ?? "UNKNOWN";
    const ex = byDay.get(time);
    if (!ex) {
      byDay.set(time, { severity: sev, count: 1 });
    } else {
      if ((NVD_SEVERITY_PRIORITY[sev] ?? 0) > (NVD_SEVERITY_PRIORITY[ex.severity] ?? 0)) ex.severity = sev;
      ex.count++;
    }
  }
  return [...byDay.entries()]
    .map(([time, { severity, count }]) => ({
      time, position: "aboveBar",
      color: NVD_SEVERITY_COLORS[severity] ?? "#6b7280",
      shape: "circle",
      text: `${severity}${count > 1 ? ` ×${count}` : ""}`,
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function buildTrumpMarkers(posts, quotes) {
  if (!posts?.length) return [];
  const earliest = quotes.reduce((min, q) => {
    const d = new Date(q.date).toISOString().slice(0, 10);
    return d < min ? d : min;
  }, "9999-99-99");
  const seen = new Map();
  for (const post of posts) {
    const time = post.created_at?.slice(0, 10);
    if (!time || time < earliest) continue;
    if (!seen.has(time)) seen.set(time, post.analysis?.sentiment ?? "neutral");
  }
  return [...seen.entries()]
    .map(([time, s]) => ({ time, position: "aboveBar", color: SENTIMENT_COLORS[s], shape: "circle", text: "" }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

function nextTradingDate(dateStr, tradingDaySet) {
  const d = new Date(dateStr);
  for (let i = 0; i <= 7; i++) {
    const key = d.toISOString().slice(0, 10);
    if (tradingDaySet.has(key)) return key;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export function buildNewsMarkers(articles, analysis, quotes) {
  if (!articles?.length) return [];
  const tradingDaySet = new Set((quotes ?? []).map((q) => new Date(q.date).toISOString().slice(0, 10)));
  const byRawDay = new Map();
  const seen = new Set();

  for (const a of articles) {
    if (!a.providerPublishTime || !a.link || seen.has(a.link)) continue;
    seen.add(a.link);
    const ts = a.providerPublishTime;
    const rawDay = new Date(
      typeof ts === "number" || (typeof ts === "string" && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts
    ).toISOString().slice(0, 10);
    const score = analysis?.[a.link]?.sentiment ?? null;
    if (score === null) continue;
    if (!byRawDay.has(rawDay)) byRawDay.set(rawDay, { pos: 0, neg: 0, neu: 0 });
    const c = byRawDay.get(rawDay);
    if (score >= 0.1) c.pos++; else if (score <= -0.1) c.neg++; else c.neu++;
  }

  const byTrading = new Map();
  for (const [rawDay, counts] of byRawDay) {
    const target = tradingDaySet.size ? nextTradingDate(rawDay, tradingDaySet) : rawDay;
    if (!target) continue;
    if (!byTrading.has(target)) byTrading.set(target, { pos: 0, neg: 0, neu: 0, snapped: false });
    const t = byTrading.get(target);
    t.pos += counts.pos; t.neg += counts.neg; t.neu += counts.neu;
    if (target !== rawDay) t.snapped = true;
  }

  return [...byTrading.entries()]
    .flatMap(([time, { pos, neg, neu, snapped }]) => {
      const s = snapped ? "*" : "";
      return [
        ...(pos ? [{ time, position: "aboveBar", color: "#22c55e", shape: "arrowUp",   text: `${pos}${s}` }] : []),
        ...(neg ? [{ time, position: "belowBar", color: "#ef4444", shape: "arrowDown", text: `${neg}${s}` }] : []),
        ...(neu ? [{ time, position: neg ? "aboveBar" : "belowBar", color: "#eab308", shape: "circle", text: `${neu}${s}` }] : []),
      ];
    })
    .sort((a, b) => a.time.localeCompare(b.time));
}

export function buildOverlayMarkers(overlayRefs, quotes, analysis, showAnalysis) {
  const { trumpPostsRef, showTrumpRef, nvdVulnsRef, showNvdRef, otxPulsesRef, showOtxRef, kevItemsRef, showKevRef, newsArticlesRef, newsAnalysisRef, showNewsRef } = overlayRefs;
  return [
    ...(showAnalysis         ? buildMarkers(analysis) : []),
    ...(showTrumpRef.current  ? buildTrumpMarkers(trumpPostsRef.current, quotes) : []),
    ...(showNvdRef.current    ? buildNvdMarkers(nvdVulnsRef.current) : []),
    ...(showOtxRef.current    ? buildCountMarkers(otxPulsesRef.current, { dateField: "created",   position: "belowBar", color: "#a855f7", shape: "circle",    label: "OTX" }) : []),
    ...(showKevRef.current    ? buildCountMarkers(kevItemsRef.current,  { dateField: "dateAdded", position: "belowBar", color: "#f97316", shape: "arrowDown", label: "KEV" }) : []),
    ...(showNewsRef.current   ? buildNewsMarkers(newsArticlesRef.current, newsAnalysisRef.current, quotes) : []),
  ];
}
