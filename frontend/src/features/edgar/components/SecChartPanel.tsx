import { useState, type ReactNode } from 'react';

type Props = {
  title: ReactNode;
  /** Extra header controls, rendered before the Hide/Show button. */
  controls?: ReactNode;
  defaultVisible?: boolean;
  children: ReactNode;
};

/**
 * Collapsible chart panel for the EDGAR per-company view: title on the left,
 * a Hide/Show button on the right, chart body below. Shown by default.
 */
export default function SecChartPanel({ title, controls, defaultVisible = true, children }: Props) {
  const [visible, setVisible] = useState(defaultVisible);

  return (
    <div className="sec-price-chart-wrap">
      <div className="sec-price-chart-header">
        <span className="sec-section-title" style={{ margin: 0 }}>
          {title}
        </span>
        <div className="sec-price-chart-controls">
          {controls}
          <button type="button" className="btn btn-chart" onClick={() => setVisible((v) => !v)}>
            {visible ? 'Hide' : 'Show'} chart
          </button>
        </div>
      </div>
      {visible && children}
    </div>
  );
}
