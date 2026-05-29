import { useState } from 'react';
import { OTHER_CATEGORIES, BASE_FORM_DESCRIPTIONS } from '../constants';

export default function FilingsLegendModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'base' | string>('base');
  const otherCategory = OTHER_CATEGORIES.find((c) => c.tab === tab);

  return (
    <div className="sec-legend-backdrop" onClick={onClose}>
      <div className="sec-legend-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sec-legend-header">
          <span className="sec-legend-title">Filing Types</span>
          <button type="button" className="sec-legend-close" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="sec-legend-tabs">
          <button
            type="button"
            className={`sec-legend-tab${tab === 'base' ? ' active' : ''}`}
            onClick={() => setTab('base')}
          >
            Base
          </button>
          {OTHER_CATEGORIES.map((c) => (
            <button
              key={c.tab}
              type="button"
              className={`sec-legend-tab${tab === c.tab ? ' active' : ''}`}
              onClick={() => setTab(c.tab)}
            >
              {c.tab}
            </button>
          ))}
        </div>

        {tab !== 'base' && (
          <div className="sec-legend-disclaimer">Greyed out filing types are not currently downloaded or analyzed.</div>
        )}

        <div className="sec-legend-rows">
          {tab === 'base'
            ? BASE_FORM_DESCRIPTIONS.map((f) => (
                <div key={f.label} className="sec-legend-row">
                  <span className="sec-legend-swatch" style={{ background: f.color }} />
                  <span className="sec-legend-label">{f.label}</span>
                  <span className="sec-legend-desc">{f.desc}</span>
                </div>
              ))
            : otherCategory?.forms.map((f) => (
                <div key={f.label} className="sec-legend-row">
                  {f.color ? (
                    <span className="sec-legend-swatch" style={{ background: f.color }} />
                  ) : (
                    <span className="sec-legend-swatch sec-legend-swatch--muted" />
                  )}
                  <span className={`sec-legend-label${f.color ? '' : ' sec-legend-label--muted'}`}>{f.label}</span>
                  <span className="sec-legend-desc">{f.desc}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
