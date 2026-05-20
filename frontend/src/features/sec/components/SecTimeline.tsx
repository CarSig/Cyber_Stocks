import { useState } from 'react';
import { useSecCoverage, useSecFiles } from '../hooks/useSecData';
import type { SecFileListing } from '../api';

const FORM_COLORS: { pattern: RegExp; color: string; label: string }[] = [
  { pattern: /^10-K/i, color: '#4f8ef7', label: '10-K' },
  { pattern: /^10-Q/i, color: '#7c6af7', label: '10-Q' },
  { pattern: /^8-K\/A/i, color: '#f7c44f', label: '8-K/A' },
  { pattern: /^8-K/i, color: '#f7a84f', label: '8-K' },
  { pattern: /^DEFA14A/i, color: '#4fc9f7', label: 'DEFA14A' },
  { pattern: /^DEF\s?14A/i, color: '#4fc9f7', label: 'DEF 14A' },
  { pattern: /^SC\s?13G/i, color: '#a0f74f', label: 'SC 13G' },
  { pattern: /^SC\s?13D/i, color: '#f74f4f', label: 'SC 13D' },
];

function formColor(form?: string): string | null {
  if (!form) return null;
  return FORM_COLORS.find((f) => f.pattern.test(form))?.color ?? null;
}

function formLabel(form?: string): string {
  if (!form) return '';
  return FORM_COLORS.find((f) => f.pattern.test(form))?.label ?? form;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function clamp(date: string, min: string, max: string): string {
  if (date < min) return min;
  if (date > max) return max;
  return date;
}

type Segment = {
  from: string;
  to: string;
  days: number;
  state: 'gap' | 'covered' | 'filing';
  form?: string;
  color: string;
};

function buildSegments(
  rangesRaw: { from: string; to: string }[],
  filings: SecFileListing[],
  windowFrom: string,
  windowTo: string,
): Segment[] {
  const totalDays = daysBetween(windowFrom, windowTo) + 1;
  if (totalDays <= 0) return [];

  const filingByDate = new Map<string, SecFileListing>();
  for (const f of filings) {
    if (f.date) filingByDate.set(f.date, f);
  }

  const coveredSet = new Set<string>();
  for (const r of rangesRaw) {
    const rFrom = clamp(r.from, windowFrom, windowTo);
    const rTo = clamp(r.to, windowFrom, windowTo);
    const span = daysBetween(rFrom, rTo) + 1;
    for (let i = 0; i < span; i++) coveredSet.add(addDays(rFrom, i));
  }

  const segments: Segment[] = [];
  let i = 0;
  while (i < totalDays) {
    const date = addDays(windowFrom, i);
    const filing = filingByDate.get(date);
    const covered = coveredSet.has(date);

    const state: Segment['state'] = filing ? 'filing' : covered ? 'covered' : 'gap';
    const color = filing ? (formColor(filing.form) ?? '#4f8ef7') : covered ? 'rgba(74,222,128,0.3)' : 'transparent';

    let j = i + 1;
    while (j < totalDays) {
      const next = addDays(windowFrom, j);
      const nextFiling = filingByDate.get(next);
      const nextCovered = coveredSet.has(next);
      const nextState: Segment['state'] = nextFiling ? 'filing' : nextCovered ? 'covered' : 'gap';
      const nextColor = nextFiling
        ? (formColor(nextFiling.form) ?? '#4f8ef7')
        : nextCovered
          ? 'rgba(74,222,128,0.3)'
          : 'transparent';
      if (nextState !== state || nextColor !== color) break;
      j++;
    }

    segments.push({ from: date, to: addDays(windowFrom, j - 1), days: j - i, state, form: filing?.form, color });
    i = j;
  }

  return segments;
}

type Tooltip = { x: number; seg: Segment } | null;

type Props = {
  ticker: string | null;
  visibleRange: { from: string; to: string } | null;
};

export default function SecTimeline({ ticker, visibleRange }: Props) {
  const { data: coverage } = useSecCoverage(ticker);
  const { data: files = [] } = useSecFiles(ticker);
  const [tooltip, setTooltip] = useState<Tooltip>(null);

  if (!ticker || !coverage || coverage.ranges.length === 0) return null;

  const coverageFrom = coverage.ranges[0].from;
  const coverageTo = coverage.ranges[coverage.ranges.length - 1].to;

  // Window shown = chart's visible range, clamped to coverage bounds.
  // If no chart range yet, show full coverage.
  const windowFrom = visibleRange ? clamp(visibleRange.from.slice(0, 10), coverageFrom, coverageTo) : coverageFrom;
  const windowTo = visibleRange ? clamp(visibleRange.to.slice(0, 10), coverageFrom, coverageTo) : coverageTo;

  const segments = buildSegments(coverage.ranges, files, windowFrom, windowTo);
  const totalDays = daysBetween(windowFrom, windowTo) + 1;

  // Year tick marks within the current window
  const yearTicks: { label: string; pct: number }[] = [];
  const startYear = new Date(windowFrom).getUTCFullYear();
  const endYear = new Date(windowTo).getUTCFullYear();
  for (let y = startYear; y <= endYear; y++) {
    const jan1 = `${y}-01-01`;
    if (jan1 <= windowFrom) continue;
    if (jan1 > windowTo) break;
    yearTicks.push({ label: String(y), pct: (daysBetween(windowFrom, jan1) / totalDays) * 100 });
  }

  return (
    <div className="sec-timeline-wrap">
      <div className="sec-timeline-header">
        <span className="sec-timeline-date">{windowFrom}</span>
        <span className="sec-section-title" style={{ flex: 1, textAlign: 'center', margin: 0 }}>
          Coverage Timeline — {ticker}
        </span>
        <span className="sec-timeline-date">{windowTo}</span>
      </div>

      <div className="sec-timeline-legend">
        <span className="sec-timeline-legend-item">
          <span
            className="sec-timeline-swatch"
            style={{ background: 'rgba(74,222,128,0.3)', border: '1px solid rgba(74,222,128,0.4)' }}
          />
          Covered
        </span>
        <span className="sec-timeline-legend-item">
          <span
            className="sec-timeline-swatch"
            style={{ background: 'transparent', border: '1px solid var(--border)' }}
          />
          Gap
        </span>
        {FORM_COLORS.map((f) => (
          <span key={f.label} className="sec-timeline-legend-item">
            <span className="sec-timeline-swatch" style={{ background: f.color }} />
            {f.label}
          </span>
        ))}
      </div>

      <div className="sec-timeline-bar" onMouseLeave={() => setTooltip(null)}>
        {segments.map((seg) => (
          <div
            key={seg.from}
            className="sec-timeline-seg"
            style={{
              flex: seg.days,
              background: seg.color,
              border: seg.state === 'gap' ? '1px solid var(--border)' : 'none',
            }}
            onMouseEnter={(e) => {
              const rect = (e.currentTarget.closest('.sec-timeline-bar') as HTMLElement).getBoundingClientRect();
              setTooltip({ x: e.clientX - rect.left, seg });
            }}
          />
        ))}

        {tooltip && (
          <div className="sec-timeline-tooltip" style={{ left: Math.min(tooltip.x + 8, 9999) }}>
            {tooltip.seg.from === tooltip.seg.to ? tooltip.seg.from : `${tooltip.seg.from} → ${tooltip.seg.to}`}
            {tooltip.seg.state === 'filing' && (
              <span className="sec-timeline-tooltip-form" style={{ color: tooltip.seg.color }}>
                {' '}
                {formLabel(tooltip.seg.form)}
              </span>
            )}
            {tooltip.seg.state === 'gap' && <span className="sec-timeline-tooltip-gap"> (not downloaded)</span>}
            {tooltip.seg.state === 'covered' && <span> ({tooltip.seg.days}d covered)</span>}
          </div>
        )}
      </div>

      {yearTicks.length > 0 && (
        <div className="sec-timeline-ticks">
          {yearTicks.map((t) => (
            <span key={t.label} className="sec-timeline-tick" style={{ left: `${t.pct}%` }}>
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
