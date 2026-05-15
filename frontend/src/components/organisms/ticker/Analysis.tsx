function fmt(value: number | null | undefined): string {
  return value != null ? `$${Number(value).toFixed(2)}` : '—';
}

function date(value: string | null | undefined): string {
  return value ? new Date(value).toLocaleDateString() : '—';
}

type RowProps = {
  label: string;
  value: string | number | null | undefined;
  highlight?: boolean;
};

function Row({ label, value, highlight }: RowProps) {
  return (
    <div className="analysis-row">
      <span className="analysis-row-label">{label}</span>
      <span className={highlight ? 'analysis-row-value analysis-row-value--highlight' : 'analysis-row-value'}>
        {value}
      </span>
    </div>
  );
}

type DayEntry = {
  date?: string;
  open?: number;
  close?: number;
  difference?: number | string;
};

type AnalysisData = {
  biggestSameDayDiff?: DayEntry;
  biggestNextDayDiff?: [DayEntry | undefined, DayEntry | undefined, (number | string) | undefined];
};

type AnalysisProps = {
  analysis?: AnalysisData | null;
};

export default function Analysis({ analysis }: AnalysisProps) {
  if (!analysis) return null;
  const { biggestSameDayDiff: same, biggestNextDayDiff: next } = analysis;

  return (
    <div className="analysis-grid">
      <div className="card">
        <h3 className="card-title">Biggest Same-Day Swing</h3>
        <div className="field-list">
          <Row label="Date" value={date(same?.date)} />
          <Row label="Open" value={fmt(same?.open)} />
          <Row label="Close" value={fmt(same?.close)} />
          <Row label="Difference" value={same?.difference} highlight />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Biggest Day-Over-Day Move</h3>
        <div className="field-list">
          <Row label="Day 1" value={`${date(next?.[0]?.date)} — ${fmt(next?.[0]?.close)}`} />
          <Row label="Day 2" value={`${date(next?.[1]?.date)} — ${fmt(next?.[1]?.close)}`} />
          <Row label="Difference" value={next?.[2] as string | number | undefined} highlight />
        </div>
      </div>
    </div>
  );
}
