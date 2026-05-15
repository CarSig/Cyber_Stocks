function fmt(value) {
  return value != null ? `$${Number(value).toFixed(2)}` : '—';
}

function date(value) {
  return value ? new Date(value).toLocaleDateString() : '—';
}

export default function Analysis({ analysis }) {
  if (!analysis) return null;
  const { biggestSameDayDiff: same, biggestNextDayDiff: next } = analysis;

  return (
    <div className="analysis-grid">
      <div className="card">
        <h3 className="card-title">Biggest Same-Day Swing</h3>
        <div className="field-list">
          <Row label="Date" value={date(same.date)} />
          <Row label="Open" value={fmt(same.open)} />
          <Row label="Close" value={fmt(same.close)} />
          <Row label="Difference" value={same.difference} highlight />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Biggest Day-Over-Day Move</h3>
        <div className="field-list">
          <Row label="Day 1" value={`${date(next[0]?.date)} — ${fmt(next[0]?.close)}`} />
          <Row label="Day 2" value={`${date(next[1]?.date)} — ${fmt(next[1]?.close)}`} />
          <Row label="Difference" value={next[2]} highlight />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }) {
  return (
    <div className="analysis-row">
      <span className="analysis-row-label">{label}</span>
      <span className={highlight ? 'analysis-row-value analysis-row-value--highlight' : 'analysis-row-value'}>
        {value}
      </span>
    </div>
  );
}
