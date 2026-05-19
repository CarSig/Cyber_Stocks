import { DateUtils } from '@/utils/date';

type OtxPulse = {
  id: string;
  name?: string;
  tags?: string[];
  indicators_count?: number;
  tlp?: string;
  created?: string;
};

type OtxPulseRowProps = {
  pulse: OtxPulse;
};

export default function OtxPulseRow({ pulse }: OtxPulseRowProps) {
  return (
    <tr key={pulse.id}>
      <td>
        <a
          href={`https://otx.alienvault.com/pulse/${pulse.id}`}
          target="_blank"
          rel="noreferrer"
          className="ti-link ti-pulse-name"
        >
          {pulse.name}
        </a>
      </td>
      <td>
        <div className="ti-tags">
          {(pulse.tags ?? []).slice(0, 4).map((t) => (
            <span key={t} className="ti-tag">
              {t}
            </span>
          ))}
        </div>
      </td>
      <td>{pulse.indicators_count ?? 0}</td>
      <td>
        <span className={`ti-badge ti-badge--tlp-${pulse.tlp ?? 'white'}`}>{pulse.tlp ?? 'white'}</span>
      </td>
      <td className="ti-date">{DateUtils.formatDate(pulse.created)}</td>
    </tr>
  );
}
