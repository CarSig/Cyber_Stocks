import { useState } from 'react';
import FilingsLegendModal from './FilingsLegendModal';
import type { PresentForm } from '../hooks/useSecFilings';

type Props = {
  presentForms: PresentForm[];
  enabledForms: Set<string>;
  allOn: boolean;
  anyOn: boolean;
  onToggleForm: (label: string) => void;
  onToggleAll: () => void;
};

/** Filings master toggle + per-form-type swatch buttons + legend. Drives the
 *  filing markers shown on every chart in the per-company view. */
export default function FilingsControls({
  presentForms,
  enabledForms,
  allOn,
  anyOn,
  onToggleForm,
  onToggleAll,
}: Props) {
  const [showLegend, setShowLegend] = useState(false);

  if (presentForms.length === 0) return null;

  return (
    <div className="edgar-filings-controls">
      <button
        type="button"
        className={`btn btn-chart${anyOn ? ' active' : ''}`}
        onClick={onToggleAll}
        title={allOn ? 'Hide all filing markers' : 'Show all filing markers'}
      >
        Filings
      </button>
      {presentForms.map((f) => {
        const on = enabledForms.has(f.label);
        return (
          <button
            key={f.label}
            type="button"
            className={`sec-filing-swatch-btn${on ? ' active' : ''}`}
            onClick={() => onToggleForm(f.label)}
            title={`${on ? 'Hide' : 'Show'} ${f.label} markers`}
          >
            <span className="sec-filing-swatch-dot" style={{ background: f.color }} />
            {f.label}
          </button>
        );
      })}
      <button type="button" className="btn btn-chart" onClick={() => setShowLegend(true)}>
        ?
      </button>
      {showLegend && <FilingsLegendModal onClose={() => setShowLegend(false)} />}
    </div>
  );
}
