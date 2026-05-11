import { fmtCompact, fmtVol, fmtPct, changePctOverBars } from "./tickerUtils.js";

export default function TickerKPI({ summary, quotes }) {
  const ks = summary?.defaultKeyStatistics;
  const fd = summary?.financialData;
  const sp = summary?.summaryProfile;

  const sorted = quotes?.length ? [...quotes].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const lastQuote = sorted.at(-1);
  const cutoff52 = lastQuote ? new Date(new Date(lastQuote.date).getTime() - 365 * 86400000) : null;
  const yearQuotes = cutoff52 ? sorted.filter((q) => new Date(q.date) >= cutoff52) : sorted;
  const high52 = yearQuotes.length ? Math.max(...yearQuotes.map((q) => q.high ?? q.close)) : null;
  const low52 = yearQuotes.length ? Math.min(...yearQuotes.map((q) => q.low ?? q.close)) : null;
  const volume = lastQuote?.volume ?? null;

  const price = fd?.currentPrice;
  const shares = ks?.sharesOutstanding;
  const mcap = price != null && shares != null ? price * shares : null;
  const peg = ks?.pegRatio;

  const items = [
    { k: "Market Cap", v: fmtCompact(mcap) },
    { k: "Volume", v: fmtVol(volume) },
    { k: "52w High", v: high52 != null ? `$${high52.toFixed(2)}` : "—" },
    { k: "52w Low", v: low52 != null ? `$${low52.toFixed(2)}` : "—" },
    { k: "Day", v: fmtPct(changePctOverBars(sorted, 1)), pct: true },
    { k: "Week", v: fmtPct(changePctOverBars(sorted, 5)), pct: true },
    { k: "Month", v: fmtPct(changePctOverBars(sorted, 21)), pct: true },
    { k: "Year", v: fmtPct(ks?.["52WeekChange"] ?? changePctOverBars(sorted, 252)), pct: true },
    { k: "PEG", v: peg != null ? peg.toFixed(2) : "—" },
    { k: "Sector", v: sp?.sector ?? "—" },
  ];

  return (
    <div className="ticker-kpi-strip">
      {items.map(({ k, v, pct }) => {
        let cls = "";
        if (pct && v !== "—") {
          const n = parseFloat(v);
          cls = n > 0 ? "ticker-kpi-pos" : n < 0 ? "ticker-kpi-neg" : "";
        }
        return (
          <div className="ticker-kpi" key={k}>
            <div className="ticker-kpi-k">{k}</div>
            <div className={`ticker-kpi-v ${cls}`}>{v}</div>
          </div>
        );
      })}
    </div>
  );
}
