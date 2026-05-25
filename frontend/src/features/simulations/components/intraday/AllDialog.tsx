import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { aiButtonStyle } from '../../utils/styles';
import type { ExitStrategy } from '../../reducers/intradayReducer';

type AllRow = {
  rank: number;
  ticker: string;
  event: string;
  trade_idea: string;
  action: 'buy' | 'short';
  chartDate: string;
  chartTime: string;
  firstDate: string;
  firstTime: string;
  preMarket: boolean;
  afterHours: boolean;
  entryDate: string;
  entryTime: string;
  exitDate: string;
  daysAfter: number | null;
  profitPct: number | null;
  error?: string;
};

type SimAllDialogProps = {
  open: boolean;
  onClose: () => void;
  running: boolean;
  results: AllRow[] | null;
  aiDelay: number;
  onAiDelayChange: (v: number) => void;
  onReload: () => void;
  onRowSelect: (row: AllRow) => void;
  exitStrategy: ExitStrategy;
};


const EXIT_DESCRIPTIONS: Record<ExitStrategy, { label: string; description: string }> = {
  '15:45': {
    label: 'Exit 15:45',
    description: 'Fixed exit at 15:45, avoiding the volatile final 15 minutes of the session.',
  },
  '15:59': {
    label: 'Exit 15:59',
    description: 'Fixed exit at the last bar of the session (16:00 minus one bar width). Captures the full trading day.',
  },
  'vol-same-day': {
    label: 'Vol same day (ATR)',
    description: 'Exits on the first bar where |close − entry| ≥ the entry bar\'s high-low range (ATR proxy). Falls back to 15:45 if the target is never hit intraday.',
  },
  'vol-next-day': {
    label: 'Vol next day (2% move)',
    description: 'Exits on the first bar where price moves ≥ 2% from entry, scanning same day through close of next trading day. Falls back to next day\'s last bar.',
  },
  'vol-hold': {
    label: 'Vol hold 2× spike',
    description: 'Holds until a bar\'s volume reaches 2× the average volume of all pre-entry bars (climactic move). Scans up to 5 trading days. Falls back to the last available bar.',
  },
  'vol-hold-3x': {
    label: 'Vol hold 3× spike',
    description: 'Stricter version of vol-hold — only exits on a 3× average-volume bar. Filters out minor spikes and waits for a decisive capitulation or euphoria bar.',
  },
  'vol-hold-eod': {
    label: 'Vol hold EOD spike',
    description: 'Checks volume only on the closing bar of each day. Exits when the day\'s closing bar volume exceeds 2× average. Ignores intrabar noise.',
  },
  'vol-hold-vwap': {
    label: 'Vol hold VWAP cross',
    description: 'Exits when price crosses VWAP. On a long trade, exits when close drops below VWAP (distribution signal). On a short, exits when close rises above VWAP. Scans up to 5 days.',
  },
  'vol-hold-confirm': {
    label: 'Vol hold price + vol confirm',
    description: 'Requires both a ≥ 2% price move AND ≥ 1.5× volume on the same bar. Higher conviction — avoids false signals from price alone or volume alone.',
  },
};

function getEventTiming(chartTime: string, afterHours: boolean): { label: string; color: string } {
  if (afterHours) return { label: 'post market', color: '#f97316' };

  const [h, m] = chartTime.split(':').map(Number);
  const minutes = h * 60 + m;
  if (minutes < 9 * 60 + 30) return { label: 'pre market', color: '#f59e0b' };
  if (minutes <= 15 * 60 + 45) return { label: 'during', color: '#22c55e' };
  return { label: 'post market', color: '#f97316' };
}

function fmtTime(raw: string): string {
  const m = raw.match(/\d{2}:\d{2}/);
  return m ? m[0] : raw;
}

export default function AllDialog({
  open,
  onClose,
  running,
  results,
  aiDelay,
  onAiDelayChange,
  onReload,
  onRowSelect,
  exitStrategy,
}: SimAllDialogProps) {
  const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-[calc(48rem+250px)]" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <DialogTitle>Simulate All Results</DialogTitle>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Input
                type="number"
                min={0}
                max={60}
                value={aiDelay}
                onChange={(e) => onAiDelayChange(Math.max(0, Number(e.target.value)))}
                style={{ width: 82, textAlign: 'center' }}
                className="dtrade-shares-input"
              />
              <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>min delay</span>
              <Button
                variant="ghost"
                onClick={onReload}
                disabled={running}
                style={{ ...aiButtonStyle, fontSize: 12, padding: '0 0.5rem' }}
              >
                ↺ Reload
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border)' }}>
          <StrategyCard label="Exit" info={EXIT_DESCRIPTIONS[exitStrategy]} />
        </div>

        {running && <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Running simulations…</p>}

        {results &&
          (() => {
            const valid = results.filter((r) => r.profitPct != null);
            const wins = valid.filter((r) => r.profitPct! >= 0);
            const losses = valid.filter((r) => r.profitPct! < 0);
            const avgWin = wins.length ? wins.reduce((s, r) => s + r.profitPct!, 0) / wins.length : null;
            const avgLoss = losses.length ? losses.reduce((s, r) => s + r.profitPct!, 0) / losses.length : null;
            const total = valid.length ? valid.reduce((s, r) => s + r.profitPct!, 0) / valid.length : null;
            return (
              <div
                style={{
                  display: 'flex',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  padding: '0.5rem 0',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <StatCell
                  label={`Wins (${wins.length})`}
                  value={avgWin != null ? fmt(avgWin) : '—'}
                  color="var(--color-green)"
                />
                <StatCell
                  label={`Losses (${losses.length})`}
                  value={avgLoss != null ? fmt(avgLoss) : '—'}
                  color="var(--color-red)"
                />
                <div style={{ marginLeft: 'auto' }}>
                  <StatCell
                    label={`Avg Total (${valid.length})`}
                    value={total != null ? fmt(total) : '—'}
                    color={total != null && total >= 0 ? 'var(--color-green)' : 'var(--color-red)'}
                  />
                </div>
              </div>
            );
          })()}

        {results && (
          <table className="sim-table" style={{ width: '100%', marginTop: '0.5rem' }}>
            <thead>
              <tr>
                <th>#</th>
                <th>Ticker</th>
                <th>Event</th>
                <th>Event date and time</th>
                <th>Event Timing</th>
                <th>Idea</th>
                <th>Action</th>
                <th>Entry Time</th>
                <th>Days After</th>
                <th style={{ textAlign: 'right' }}>P&L %</th>
              </tr>
            </thead>
            <tbody>
              {results.map((row) => {
                const color =
                  row.profitPct == null
                    ? 'var(--text-faint)'
                    : row.profitPct >= 0
                      ? 'var(--color-green)'
                      : 'var(--color-red)';
                const timing = getEventTiming(row.chartTime, row.afterHours);
                return (
                  <tr
                    key={row.rank}
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      onRowSelect(row);
                      onClose();
                    }}
                  >
                    <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>{row.rank}</td>
                    <td style={{ fontWeight: 600 }}>{row.ticker}</td>
                    <td
                      style={{
                        fontSize: 12,
                        maxWidth: 180,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.event}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-faint)' }}>
                      {row.firstDate} {fmtTime(row.firstTime)}
                    </td>
                    <td
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: timing.color,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {timing.label}
                    </td>
                    <td
                      style={{
                        fontSize: 11,
                        color: 'var(--text-faint)',
                        maxWidth: 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.trade_idea}
                    </td>
                    <td
                      style={{
                        fontWeight: 600,
                        color: row.action === 'short' ? '#f97316' : '#22c55e',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.action.toUpperCase()}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-faint)' }}>{row.entryTime}</td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-faint)' }}>
                      {row.daysAfter != null ? `+${row.daysAfter}d` : '—'}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 700, color }}>
                      {row.error
                        ? row.error
                        : row.profitPct == null
                          ? '—'
                          : (row.profitPct >= 0 ? '+' : '') + row.profitPct.toFixed(2) + '%'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StrategyCard({ label, info }: { label: string; info: { label: string; description: string } }) {
  return (
    <div style={{ flex: 1, padding: '0.4rem 0.6rem', borderRadius: 6, background: 'var(--muted)', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
          {label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {info.label}
        </span>
      </div>
      <p style={{ margin: 0, fontSize: 11, color: 'var(--text-faint)', lineHeight: 1.45 }}>{info.description}</p>
    </div>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <span style={{ fontSize: 11, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </span>
      <span style={{ fontWeight: 700, color, fontSize: 15 }}>{value}</span>
    </div>
  );
}
