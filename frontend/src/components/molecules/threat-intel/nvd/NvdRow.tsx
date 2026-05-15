import { formatDate } from '@/utils/date';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--color-red)',
  HIGH: 'var(--color-amber)',
  MEDIUM: '#f59e0b',
  LOW: 'var(--color-blue-toggle)',
};

type NvdCve = {
  id: string;
  severity?: string;
  score?: number | null;
  description?: string;
  published?: string;
  status?: string;
};

type NvdRowProps = {
  cve: NvdCve;
};

export default function NvdRow({ cve }: NvdRowProps) {
  return (
    <tr key={cve.id}>
      <td>
        <a href={`https://nvd.nist.gov/vuln/detail/${cve.id}`} target="_blank" rel="noreferrer" className="ti-link">
          {cve.id}
        </a>
      </td>
      <td>
        <span className="ti-severity" style={{ color: cve.severity ? SEVERITY_COLORS[cve.severity] ?? 'var(--text-muted)' : undefined }}>
          {cve.severity}
        </span>
      </td>
      <td className="ti-score">{cve.score ?? '—'}</td>
      <td className="ti-desc">{cve.description}</td>
      <td className="ti-date">{formatDate(cve.published)}</td>
      <td className="ti-muted">{cve.status}</td>
    </tr>
  );
}
