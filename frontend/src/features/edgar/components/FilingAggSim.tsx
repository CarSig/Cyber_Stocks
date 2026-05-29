/**
 * Shared aggregate-simulation primitives for SEC filing lists.
 *
 * useAggSim accepts filings that each carry their own `ticker`, so it works
 * for both single-ticker and cross-company contexts.
 */
import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getBars } from '@/features/charts/api';
import { runLongSimulation } from '@/features/simulations/utils/sim';
import { DateUtils } from '@/utils/date';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AggSimFiling = {
  date: string;
  accession: string;
  form: string;
  ticker: string;
};

export type AggSimRow = {
  date: string;
  accession: string;
  form: string;
  ticker: string;
  entryPrice: number;
  exitPrice: number;
  profitPct: number;
};

export type AggSimResult = {
  rows: AggSimRow[];
  avgPct: number;
  wins: number;
  losses: number;
  skipped: number;
};

export type AggSimState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number }
  | { status: 'done'; result: AggSimResult }
  | { status: 'error'; message: string };

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAggSim() {
  const queryClient = useQueryClient();
  const [states, setStates] = useState<Record<string, AggSimState>>({});

  const run = useCallback(
    async (key: string, filings: AggSimFiling[], exitTime: '15:45' | '15:59') => {
      setStates((s) => ({ ...s, [key]: { status: 'running', done: 0, total: filings.length } }));

      const rows: AggSimRow[] = [];
      let skipped = 0;

      for (let i = 0; i < filings.length; i++) {
        const { date: filingDate, accession, form, ticker } = filings[i];
        try {
          const { bars } = await queryClient.fetchQuery({
            queryKey: ['alpaca-bars', ticker, filingDate, '1Min'],
            queryFn: () => getBars(ticker, filingDate, '1Min'),
            staleTime: Infinity,
          });

          if (!bars.length) {
            skipped++;
            continue;
          }

          const entryIso = DateUtils.timeToIso('09:30', filingDate);
          const exitIso = DateUtils.timeToIso(exitTime, filingDate);
          const actions = [
            { id: 1, timestamp: entryIso, time: '09:30', side: 'buy' as const, value: 100 },
            { id: 2, timestamp: exitIso, time: exitTime, side: 'sell' as const, value: 100 },
          ];

          const sim = runLongSimulation(bars, actions, (iso) => iso.slice(11, 16));
          const entry = sim.transactions.find((t) => t.side === 'buy');
          const exit = sim.transactions.find((t) => t.side === 'sell');

          if (!entry || !exit) {
            skipped++;
            continue;
          }

          rows.push({ date: filingDate, accession, form, ticker, entryPrice: entry.price, exitPrice: exit.price, profitPct: sim.profitPct });
        } catch {
          skipped++;
        }

        setStates((s) => ({ ...s, [key]: { status: 'running', done: i + 1, total: filings.length } }));
      }

      if (!rows.length) {
        setStates((s) => ({ ...s, [key]: { status: 'error', message: 'No data for any filing' } }));
        return;
      }

      const avgPct = rows.reduce((a, r) => a + r.profitPct, 0) / rows.length;
      const wins = rows.filter((r) => r.profitPct > 0).length;
      setStates((s) => ({
        ...s,
        [key]: { status: 'done', result: { rows, avgPct, wins, losses: rows.length - wins, skipped } },
      }));
    },
    [queryClient],
  );

  return { states, run };
}

// ── AggSimResultsModal ────────────────────────────────────────────────────────

export function AggSimResultsModal({
  title,
  result,
  showTicker = false,
  onClose,
}: {
  title: string;
  result: AggSimResult;
  showTicker?: boolean;
  onClose: () => void;
}) {
  const avgColor = result.avgPct >= 0 ? 'var(--color-green)' : 'var(--color-red)';
  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent style={{ maxWidth: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10, display: 'flex', gap: 16 }}>
          <span style={{ color: avgColor, fontWeight: 600 }}>
            {result.avgPct >= 0 ? '+' : ''}{result.avgPct.toFixed(2)}% avg
          </span>
          <span>{result.wins}W / {result.losses}L</span>
          {result.skipped > 0 && <span>{result.skipped} skipped (no data)</span>}
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                <th style={{ padding: '4px 8px' }}>Date</th>
                {showTicker && <th style={{ padding: '4px 8px' }}>Ticker</th>}
                <th style={{ padding: '4px 8px' }}>Form</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Entry</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>Exit</th>
                <th style={{ padding: '4px 8px', textAlign: 'right' }}>P&L %</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => {
                const color = row.profitPct >= 0 ? 'var(--color-green)' : 'var(--color-red)';
                return (
                  <tr key={row.accession} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '4px 8px' }}>{row.date}</td>
                    {showTicker && <td style={{ padding: '4px 8px', fontWeight: 600 }}>{row.ticker}</td>}
                    <td style={{ padding: '4px 8px' }}>{row.form}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>${row.entryPrice.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>${row.exitPrice.toFixed(2)}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', color, fontWeight: 600 }}>
                      {row.profitPct >= 0 ? '+' : ''}{row.profitPct.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── AggResultBadge ────────────────────────────────────────────────────────────

export function AggResultBadge({
  label,
  state,
  showTicker = false,
  onRun,
}: {
  label: string;
  state: AggSimState | undefined;
  showTicker?: boolean;
  onRun: () => void;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  if (!state || state.status === 'idle') {
    return (
      <Button size="sm" variant="outline" style={{ fontSize: 11, padding: '2px 7px', height: 'auto' }} onClick={onRun}>
        Sim all
      </Button>
    );
  }
  if (state.status === 'running') {
    return <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{state.done}/{state.total}…</span>;
  }
  if (state.status === 'error') {
    return <span style={{ fontSize: 11, color: 'var(--color-red)' }}>{state.message}</span>;
  }

  const { result } = state;
  const color = result.avgPct >= 0 ? 'var(--color-green)' : 'var(--color-red)';
  return (
    <>
      <span
        style={{ fontSize: 11, display: 'inline-flex', gap: 6, alignItems: 'center', cursor: 'pointer', textDecoration: 'underline dotted' }}
        onClick={() => setModalOpen(true)}
        title="Click to see details"
      >
        <span style={{ color, fontWeight: 600 }}>{result.avgPct >= 0 ? '+' : ''}{result.avgPct.toFixed(2)}% avg</span>
        <span style={{ color: 'var(--muted-foreground)' }}>{result.wins}W/{result.losses}L</span>
        {result.skipped > 0 && <span style={{ color: 'var(--muted-foreground)' }}>({result.skipped} skip)</span>}
      </span>
      {modalOpen && (
        <AggSimResultsModal title={label} result={result} showTicker={showTicker} onClose={() => setModalOpen(false)} />
      )}
    </>
  );
}
