function fmt(value) {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (value > 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (value > 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (value > 1_000) return value.toLocaleString();
    if (Math.abs(value) < 10) return value.toFixed(2);
    return value.toFixed(0);
  }
  return String(value);
}

function pct(value) {
  if (value == null) return "—";
  return `${(value * 100).toFixed(2)}%`;
}

function Field({ label, value }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value}</span>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <div className="card-fields">
        {children}
      </div>
    </div>
  );
}

export default function Summary({ summary }) {
  const { summaryProfile: p, financialData: f, defaultKeyStatistics: s } = summary;

  return (
    <div className="summary">
      {p && (
        <Card title="Profile">
          <Field label="Sector" value={p.sector} />
          <Field label="Industry" value={p.industry} />
          <Field label="Country" value={p.country} />
          <Field label="Employees" value={p.fullTimeEmployees?.toLocaleString()} />
          {p.website && (
            <div className="field field-full">
              <span className="field-label">Website</span>
              <a href={p.website} target="_blank" rel="noreferrer">{p.website}</a>
            </div>
          )}
          {p.longBusinessSummary && (
            <div className="field field-full">
              <span className="field-label">About</span>
              <span className="field-about">{p.longBusinessSummary}</span>
            </div>
          )}
        </Card>
      )}

      {f && (
        <Card title="Financials">
          <Field label="Current Price" value={fmt(f.currentPrice)} />
          <Field label="Target Low" value={fmt(f.targetLowPrice)} />
          <Field label="Target Mean" value={fmt(f.targetMeanPrice)} />
          <Field label="Target High" value={fmt(f.targetHighPrice)} />
          <Field label="Recommendation" value={f.recommendationKey} />
          <Field label="Revenue" value={fmt(f.totalRevenue)} />
          <Field label="Gross Profit" value={fmt(f.grossProfits)} />
          <Field label="Revenue Growth" value={pct(f.revenueGrowth)} />
          <Field label="Operating Margin" value={pct(f.operatingMargins)} />
          <Field label="Return on Equity" value={pct(f.returnOnEquity)} />
        </Card>
      )}

      {s && (
        <Card title="Key Statistics">
          <Field label="Market Cap" value={fmt(s.marketCap)} />
          <Field label="Trailing EPS" value={fmt(s.trailingEps)} />
          <Field label="Forward P/E" value={fmt(s.forwardPE)} />
          <Field label="Price / Book" value={fmt(s.priceToBook)} />
          <Field label="Beta" value={fmt(s.beta)} />
          <Field label="52W Change" value={pct(s["52WeekChange"])} />
          <Field label="Shares Out" value={fmt(s.sharesOutstanding)} />
          <Field label="Float Shares" value={fmt(s.floatShares)} />
        </Card>
      )}
    </div>
  );
}
