import { useRef, useState, useEffect, useMemo } from 'react';
import type { SeriesMarker, Time } from 'lightweight-charts';
import { useChartInstance } from '@/features/charts/hooks/useChartInstance';
import { useChartRange } from '@/features/charts/hooks/useChartRange';
import { useStock } from '@/features/tickers/hooks/useStock';
import { useOverlayRefs } from '@/features/charts/hooks/useOverlayRefs';
import { useSecFiles } from '../hooks/useSecData';
import type { ChartType } from '@/features/charts/hooks/useChartInstance';
import type { SecFileListing } from '../api';

const FORM_COLORS: { pattern: RegExp; color: string; label: string }[] = [
  // Earnings
  { pattern: /^10-K/i,       color: '#4f8ef7', label: '10-K' },
  { pattern: /^10-Q/i,       color: '#7c6af7', label: '10-Q' },
  { pattern: /^8-K\/A/i,     color: '#f7c44f', label: '8-K/A' },
  { pattern: /^8-K/i,        color: '#f7a84f', label: '8-K' },
  // Proxy
  { pattern: /^DEFM14A/i,    color: '#4fc9f7', label: 'DEFM14A' },
  { pattern: /^DEFA14A/i,    color: '#4fc9f7', label: 'DEFA14A' },
  { pattern: /^DEF\s?14A/i,  color: '#4fc9f7', label: 'DEF 14A' },
  // Insider
  { pattern: /^3$/,           color: '#e879f9', label: 'Form 3' },
  { pattern: /^4$/,           color: '#c026d3', label: 'Form 4' },
  { pattern: /^5$/,           color: '#a21caf', label: 'Form 5' },
  // Ownership
  { pattern: /^SC\s?13G/i,   color: '#a0f74f', label: 'SC 13G' },
  { pattern: /^SC\s?13D\/A/i, color: '#ef4444', label: 'SC 13D/A' },
  { pattern: /^SC\s?13D/i,   color: '#f74f4f', label: 'SC 13D' },
  // M&A
  { pattern: /^425$/i,       color: '#fb923c', label: '425' },
  { pattern: /^SC TO-T/i,    color: '#f97316', label: 'SC TO-T' },
  { pattern: /^SC TO-I/i,    color: '#ea580c', label: 'SC TO-I' },
  { pattern: /^S-4/i,        color: '#c2410c', label: 'S-4' },
  // Capital raises
  { pattern: /^S-3/i,        color: '#34d399', label: 'S-3' },
  { pattern: /^424B4/i,      color: '#10b981', label: '424B4' },
  { pattern: /^FWP/i,        color: '#059669', label: 'FWP' },
  { pattern: /^S-1/i,        color: '#047857', label: 'S-1' },
];

function filingColor(form?: string): string {
  return FORM_COLORS.find((f) => f.pattern.test(form ?? ''))?.color ?? '#888';
}

function filingLabel(form?: string): string {
  return FORM_COLORS.find((f) => f.pattern.test(form ?? ''))?.label ?? form ?? '?';
}

function buildFilingMarkers(filings: SecFileListing[]): SeriesMarker<Time>[] {
  return filings
    .filter((f) => f.date)
    .map((f) => ({
      time: f.date! as Time,
      position: 'aboveBar' as const,
      color: filingColor(f.form),
      shape: 'circle' as const,
      text: filingLabel(f.form),
    }))
    .sort((a, b) => (a.time < b.time ? -1 : 1));
}

type Props = {
  ticker: string | null;
  visibleRange: { from: string; to: string } | null;
  onRangeChange: (range: { from: string; to: string }) => void;
  defaultRange: { from: string; to: string } | null;
  showVolatility: boolean;
  onVolatilityToggle: () => void;
};

const MIN_HEIGHT = 120;
const DEFAULT_HEIGHT = 320;
const MAX_HEIGHT = 700;

// Original 8 base types shown on the "Base" tab
const BASE_FORM_DESCRIPTIONS: { label: string; color: string; desc: string }[] = [
  { label: '10-K',    color: '#4f8ef7', desc: 'Annual report — full year financials, business overview, risk factors' },
  { label: '10-Q',    color: '#7c6af7', desc: 'Quarterly report — unaudited financials for Q1/Q2/Q3' },
  { label: '8-K',     color: '#f7a84f', desc: 'Current report — material events (earnings, mergers, cyber incidents, leadership changes)' },
  { label: '8-K/A',   color: '#f7c44f', desc: 'Amendment to an 8-K filing' },
  { label: 'DEF 14A', color: '#4fc9f7', desc: 'Proxy statement — shareholder meeting agenda, executive compensation, board nominees' },
  { label: 'DEFA14A', color: '#4fc9f7', desc: 'Additional proxy soliciting materials' },
  { label: 'SC 13G',  color: '#a0f74f', desc: 'Passive ownership disclosure — entity acquired >5% without intent to control' },
  { label: 'SC 13D',  color: '#f74f4f', desc: 'Active ownership disclosure — entity acquired >5% with intent to influence or control' },
];

// color: null = greyed out (not downloaded)
type OtherForm = { label: string; color: string | null; desc: string };
type OtherCategory = { tab: string; forms: OtherForm[] };

const OTHER_CATEGORIES: OtherCategory[] = [
  {
    tab: 'Periodic',
    forms: [
      { label: '10-K/A',  color: null,      desc: 'Amendment to annual report — restated financials or corrected disclosures' },
      { label: '10-Q/A',  color: null,      desc: 'Amendment to quarterly report' },
      { label: '20-F',    color: null,      desc: 'Annual report for foreign private issuers (e.g. Check Point Software)' },
      { label: '20-F/A',  color: null,      desc: 'Amendment to foreign issuer annual report' },
      { label: '40-F',    color: null,      desc: 'Annual report for Canadian companies listed in the US' },
      { label: 'NT 10-K', color: null,      desc: 'Late filing notification for annual report — often a red flag' },
      { label: 'NT 10-Q', color: null,      desc: 'Late filing notification for quarterly report' },
      { label: 'NT 20-F', color: null,      desc: 'Late filing notification for foreign issuer annual report' },
      { label: '11-K',    color: null,      desc: 'Annual report for employee stock purchase or savings plans' },
      { label: 'ARS',     color: null,      desc: 'Annual report to shareholders — narrative version not in XBRL' },
    ],
  },
  {
    tab: 'Events',
    forms: [
      { label: '6-K',    color: null, desc: 'Foreign issuer current report — equivalent of 8-K for non-US companies' },
      { label: '8-K/A',  color: null, desc: 'Amendment to a previously filed 8-K' },
      { label: '1-U',    color: null, desc: 'Regulation A issuer current report — smaller companies' },
      { label: '15-12G', color: null, desc: 'Suspension of reporting obligations — company going dark' },
      { label: '25',     color: null, desc: 'Notification of delisting or withdrawal from trading' },
      { label: '8-A12B', color: null, desc: 'Registration of a class of securities on a national exchange' },
    ],
  },
  {
    tab: 'Proxy',
    forms: [
      { label: 'PRE 14A',  color: null,      desc: 'Preliminary proxy statement — before shareholder vote' },
      { label: 'DEFR14A',  color: null,      desc: 'Revised definitive proxy statement' },
      { label: 'PREM14A',  color: null,      desc: 'Preliminary proxy for a merger or acquisition vote' },
      { label: 'DEFM14A',  color: '#4fc9f7', desc: 'Proxy for a merger vote — deal is agreed, shareholder vote pending' },
      { label: 'DEF 14C',  color: null,      desc: 'Information statement — no shareholder vote required' },
      { label: 'PX14A6G',  color: null,      desc: 'Exempt proxy solicitation — activist or institutional communication' },
    ],
  },
  {
    tab: 'Insider',
    forms: [
      { label: 'Form 3',   color: '#e879f9', desc: 'New insider established — filed within 10 days, often before press release' },
      { label: 'Form 4',   color: '#c026d3', desc: 'Insider transaction — open-market buys (code P) are the signal; option grants (code A) are noise' },
      { label: 'Form 5',   color: '#a21caf', desc: 'Annual catch-up for transactions not reported on Form 4 — low signal but needed for completeness' },
      { label: 'SC 13D/A', color: '#ef4444', desc: 'Amendment to SC 13D — position increased or decreased; track direction' },
      { label: 'SC 13G/A', color: null,      desc: 'Amendment to passive ownership disclosure (>5% without control intent)' },
      { label: 'SC TO-T',  color: '#f97316', desc: 'Third-party tender offer — someone making a bid for the company' },
      { label: 'SC TO-I',  color: '#ea580c', desc: 'Issuer tender offer — company buying back its own shares via offer' },
      { label: 'SC 13E-3', color: null,      desc: 'Going private transaction — taking a public company private' },
    ],
  },
  {
    tab: 'Holdings',
    forms: [
      { label: '13F-HR',   color: null, desc: 'Quarterly institutional holdings — funds with >$100M AUM must disclose positions' },
      { label: '13F-HR/A', color: null, desc: 'Amendment to institutional holdings report' },
      { label: '13H',      color: null, desc: 'Large trader registration — entities executing large volumes must register' },
    ],
  },
  {
    tab: 'M&A',
    forms: [
      { label: '425',     color: '#fb923c', desc: 'Filed during merger discussions before public announcement — earliest M&A signal on EDGAR' },
      { label: 'SC TO-T', color: '#f97316', desc: 'Tender offer — someone is trying to buy the company' },
      { label: 'SC TO-I', color: '#ea580c', desc: 'Issuer tender offer — company buying back its own shares; strong management confidence signal' },
      { label: 'S-4',     color: '#c2410c', desc: 'Merger registration — acquiring company issuing new shares as consideration' },
      { label: 'SC 13D',  color: '#f74f4f', desc: 'Activist crossed 5% — distinct from passive 13G, this person has intent; often precedes M&A or board fight' },
      { label: 'SC 13D/A',color: '#ef4444', desc: 'Amendment to 13D — position increased or decreased; track direction' },
      { label: 'DEFM14A', color: '#4fc9f7', desc: 'Proxy for a merger vote — deal is already agreed, shareholder vote pending' },
    ],
  },
  {
    tab: 'Offerings',
    forms: [
      { label: 'S-1',    color: '#047857', desc: 'IPO registration — useful for tracking pre-IPO cybersecurity companies entering the universe' },
      { label: 'S-1/A',  color: null,      desc: 'Amendment to IPO registration — revised terms or updated financials' },
      { label: 'S-3',    color: '#34d399', desc: 'Shelf registration — company preparing to raise capital; secondary offering typically follows' },
      { label: 'S-3/A',  color: null,      desc: 'Amendment to shelf registration' },
      { label: 'S-4',    color: '#c2410c', desc: 'Registration for shares issued in a merger or acquisition' },
      { label: 'S-8',    color: null,      desc: 'Registration of shares for employee benefit or stock option plans' },
      { label: 'F-1',    color: null,      desc: 'Foreign issuer IPO registration' },
      { label: '424B1',  color: null,      desc: 'Prospectus not including a price range — early stage' },
      { label: '424B3',  color: null,      desc: 'Prospectus supplement — updates to an existing shelf offering' },
      { label: '424B4',  color: '#10b981', desc: 'Final prospectus — the offering just happened, dilution is confirmed' },
      { label: '424B5',  color: null,      desc: 'Prospectus supplement for a shelf takedown' },
      { label: 'FWP',    color: '#059669', desc: 'Free writing prospectus — marketing material used during roadshow' },
      { label: 'POS AM', color: null,      desc: 'Post-effective amendment to a registration statement' },
    ],
  },
  {
    tab: 'Admin',
    forms: [
      { label: 'CORRESP',  color: null, desc: 'SEC comment letter exchange — SEC questioning company disclosures' },
      { label: 'UPLOAD',   color: null, desc: 'SEC-uploaded correspondence — inbound letters from SEC staff' },
      { label: 'EFFECT',   color: null, desc: 'Notice of effectiveness — registration statement has gone effective' },
      { label: 'SD',       color: null, desc: 'Specialized disclosure — conflict minerals supply chain reporting' },
      { label: 'CB',       color: null, desc: 'Cross-border tender offer or rights offering notification' },
      { label: '15F-12G',  color: null, desc: 'Foreign private issuer deregistration from SEC reporting' },
    ],
  },
];

function FilingsLegendModal({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<'base' | string>('base');
  const otherCategory = OTHER_CATEGORIES.find((c) => c.tab === tab);

  return (
    <div className="sec-legend-backdrop" onClick={onClose}>
      <div className="sec-legend-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sec-legend-header">
          <span className="sec-legend-title">Filing Types</span>
          <button type="button" className="sec-legend-close" onClick={onClose}>✕</button>
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
                  {f.color
                    ? <span className="sec-legend-swatch" style={{ background: f.color }} />
                    : <span className="sec-legend-swatch sec-legend-swatch--muted" />
                  }
                  <span className={`sec-legend-label${f.color ? '' : ' sec-legend-label--muted'}`}>{f.label}</span>
                  <span className="sec-legend-desc">{f.desc}</span>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}

export default function SecPriceChart({
  ticker,
  visibleRange,
  onRangeChange,
  defaultRange,
  showVolatility,
  onVolatilityToggle,
}: Props) {
  const [visible, setVisible] = useState(true);
  const [showFilings, setShowFilings] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(DEFAULT_HEIGHT);

  const { allQuotes } = useStock(ticker ?? '', {});
  const { data: filings = [] } = useSecFiles(ticker);
  const overlayRefs = useOverlayRefs({});

  const extraMarkers = useMemo(() => (showFilings ? buildFilingMarkers(filings) : []), [showFilings, filings]);

  const chartRef = useChartInstance(containerRef, {
    quotes: ticker ? allQuotes : [],
    type: 'Area' as ChartType,
    analysis: null,
    showAnalysis: false,
    overlayRefs,
    extraMarkers,
  });

  const effectiveRange = visibleRange ?? defaultRange;
  useChartRange(chartRef, { visibleRange: effectiveRange, onRangeChange });

  function onHandleWheel(e: React.WheelEvent) {
    e.preventDefault();
    setHeight((h) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, h - e.deltaY * 0.5)));
  }

  function onHandleMouseDown(e: React.MouseEvent) {
    dragStartY.current = e.clientY;
    dragStartH.current = height;
    e.preventDefault();
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      setHeight(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, dragStartH.current + delta)));
    }
    function onMouseUp() {
      dragStartY.current = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  useEffect(() => {
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({ height, width: containerRef.current.clientWidth });
    }
  }, [height, chartRef]);

  if (!ticker) return null;

  return (
    <div className="sec-price-chart-wrap">
      <div className="sec-price-chart-header">
        <span className="sec-section-title" style={{ margin: 0 }}>
          Price — {ticker}
        </span>
        <div className="sec-price-chart-controls">
          <button
            type="button"
            className={`btn btn-chart${showFilings ? ' active' : ''}`}
            onClick={() => setShowFilings((v) => !v)}
          >
            Filings
          </button>
          <button type="button" className="btn btn-chart" onClick={() => setShowLegend(true)}>
            ?
          </button>
          <button
            type="button"
            className={`btn btn-chart${showVolatility ? ' active' : ''}`}
            onClick={onVolatilityToggle}
          >
            Volatility
          </button>
          <button type="button" className="btn btn-chart" onClick={() => setVisible((v) => !v)}>
            {visible ? 'Hide' : 'Show'} chart
          </button>
        </div>
      </div>

      {visible && (
        <>
          <div ref={containerRef} className="chart-container sec-price-chart-canvas" style={{ height }} />
          <div
            className="sec-price-chart-resize-handle"
            onMouseDown={onHandleMouseDown}
            onWheel={onHandleWheel}
            title="Drag or scroll to resize"
          />
        </>
      )}
      {showLegend && <FilingsLegendModal onClose={() => setShowLegend(false)} />}
    </div>
  );
}
