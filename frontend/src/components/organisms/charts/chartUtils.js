export const PERIODS = [
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "1Y", days: 365 },
  { label: "All", days: null },
];

function localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysAgoString(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
}

export function todayString() {
  return localDateString(new Date());
}

export function makeChartOptions(container, height = 400) {
  const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return {
    width: container.clientWidth,
    height,
    layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
    grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
    timeScale: { timeVisible: true },
  };
}

export function toSortedOHLC(quotes) {
  const seen = new Set();
  return quotes
    .filter((q) => q.close)
    .map((q) => ({ time: String(q.date).slice(0, 10), open: q.open, high: q.high, low: q.low, close: q.close, value: q.close }))
    .sort((a, b) => (a.time < b.time ? -1 : 1))
    .filter((q) => { if (seen.has(q.time)) return false; seen.add(q.time); return true; });
}

export function toSortedClose(quotes) {
  const seen = new Set();
  return quotes
    .filter((q) => q.close)
    .map((q) => ({ time: String(q.date).slice(0, 10), value: q.close }))
    .sort((a, b) => (a.time < b.time ? -1 : 1))
    .filter((q) => { if (seen.has(q.time)) return false; seen.add(q.time); return true; });
}
