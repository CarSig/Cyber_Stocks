import { Badge } from '@/components/ui/badge';
import { useSecSessions } from '../hooks/useSecData';

type Props = {
  ticker: string | null;
};

export default function SecSessionTable({ ticker }: Props) {
  const { data: sessions = [], isPending } = useSecSessions(ticker);

  if (!ticker) return null;
  if (isPending) return <p className="sec-loading">Loading sessions…</p>;
  if (sessions.length === 0) return <p className="sec-empty">No download sessions yet for {ticker}.</p>;

  return (
    <div className="sec-section">
      <h2 className="sec-section-title">Download Sessions — {ticker}</h2>
      <table className="sec-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Range</th>
            <th>Form types</th>
            <th>Files saved</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{new Date(s.session_date).toLocaleString()}</td>
              <td>
                {s.date_from} → {s.date_to}
              </td>
              <td>
                <div className="sec-badges">
                  {s.form_types.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              </td>
              <td>{s.files_saved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
