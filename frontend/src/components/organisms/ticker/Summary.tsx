import type { TickerSummary } from '@/types';


type FieldProps = {
  label: string;
  value?: string | number | null;
};

function Field({ label, value }: FieldProps) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <span className="field-value">{value}</span>
    </div>
  );
}

type CardProps = {
  title: string;
  children: React.ReactNode;
};

function Card({ title, children }: CardProps) {
  return (
    <div className="card">
      <h3 className="card-title">{title}</h3>
      <div className="card-fields">{children}</div>
    </div>
  );
}

type SummaryProps = {
  summary: TickerSummary;
};

export default function Summary({ summary }: SummaryProps) {
  const { summaryProfile: p } = summary;

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
              <a href={p.website} target="_blank" rel="noreferrer">
                {p.website}
              </a>
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
    </div>
  );
}

