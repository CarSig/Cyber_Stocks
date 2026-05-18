import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { aiButtonStyle } from '../../utils/styles';

type AllRow = {
  rank: number;
  ticker: string;
  event: string;
  trade_idea: string;
  action: 'buy' | 'short';
  chartTime: string;
  preMarket: boolean;
  entryTime: string;
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
};

export default function AllDialog({
  open,
  onClose,
  running,
  results,
  aiDelay,
  onAiDelayChange,
  onReload,
}: SimAllDialogProps) {
  const fmt = (v: number) => (v >= 0 ? '+' : '') + v.toFixed(2) + '%';

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
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
                <th>Idea</th>
                <th>Action</th>
                <th>Event time</th>
                <th>Entry</th>
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
                return (
                  <tr key={row.rank}>
                    <td style={{ color: 'var(--text-faint)', fontSize: 11 }}>{row.rank}</td>
                    <td style={{ fontWeight: 600 }}>{row.ticker}</td>
                    <td
                      style={{
                        fontSize: 12,
                        maxWidth: 260,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {row.event}
                    </td>
                    <td
                      style={{
                        fontSize: 11,
                        color: 'var(--text-faint)',
                        maxWidth: 160,
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
                    <td
                      style={{
                        fontSize: 12,
                        whiteSpace: 'nowrap',
                        color: row.preMarket ? '#f59e0b' : 'var(--text-faint)',
                      }}
                    >
                      {row.chartTime}
                      {row.preMarket && ' ⚡'}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: 'nowrap', color: 'var(--text-faint)' }}>{row.entryTime}</td>
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
