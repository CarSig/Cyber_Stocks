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

function toSorted(quotes, ...fields) {
  const seen = new Set();
  return quotes
    .filter((q) => q.close)
    .map((q) => {
      const base = { time: String(q.date).slice(0, 10) };
      for (const f of fields) base[f] = f === "value" ? (q.value ?? q.close) : q[f];
      return base;
    })
    .sort((a, b) => a.time.localeCompare(b.time))
    .filter((q) => !seen.has(q.time) && seen.add(q.time));
}

export const toSortedOHLC = (quotes) => toSorted(quotes, "open", "high", "low", "close", "value");
export const toSortedClose = (quotes) => toSorted(quotes, "value");
