import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBars } from '@/features/charts/api';
import { runLongSimulation } from '@/features/simulations/utils/sim';
import { DateUtils } from '@/utils/date';

type ExitTime = '15:45' | '15:59';

const EXIT_OPTIONS: { value: ExitTime; label: string }[] = [
  { value: '15:45', label: 'EOD 15:45' },
  { value: '15:59', label: 'EOD 15:59' },
];

type SimResult = { profitPct: number; entryPrice: number; exitPrice: number } | null;

type Props = {
  open: boolean;
  onClose: () => void;
  filing: { accession: string; form: string; filingDate: string; ticker: string };
};

export default function FilingSimModal({ open, onClose, filing }: Props) {
  const [exitTime, setExitTime] = useState<ExitTime>('15:45');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<SimResult>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  async function run() {
    setRunning(true);
    setResult(null);
    setError(null);
    try {
      const { bars } = await queryClient.fetchQuery({
        queryKey: ['alpaca-bars', filing.ticker, filing.filingDate, '1Min'],
        queryFn: () => getBars(filing.ticker, filing.filingDate, '1Min'),
        staleTime: Infinity,
      });

      if (!bars.length) {
        setError('No intraday data for this date');
        return;
      }

      const datePrefix = filing.filingDate;
      const entryIso = DateUtils.timeToIso('09:30', datePrefix);
      const exitIso = DateUtils.timeToIso(exitTime, datePrefix);

      const actions = [
        { id: 1, timestamp: entryIso, time: '09:30', side: 'buy' as const, value: 100 },
        { id: 2, timestamp: exitIso, time: exitTime, side: 'sell' as const, value: 100 },
      ];

      const sim = runLongSimulation(bars, actions, (iso) => iso.slice(11, 16));

      const entryTx = sim.transactions.find((t) => t.side === 'buy');
      const exitTx = sim.transactions.find((t) => t.side === 'sell');

      if (!entryTx || !exitTx) {
        setError('Could not match entry/exit to bars — market may have been closed');
        return;
      }

      setResult({ profitPct: sim.profitPct, entryPrice: entryTx.price, exitPrice: exitTx.price });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setRunning(false);
    }
  }

  const profitColor = result
    ? result.profitPct >= 0 ? 'var(--color-green)' : 'var(--color-red)'
    : undefined;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent style={{ maxWidth: 420 }}>
        <DialogHeader>
          <DialogTitle>Buy simulation — {filing.form}</DialogTitle>
        </DialogHeader>

        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 12 }}>
          {filing.ticker} · {filing.filingDate} · {filing.accession}
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 16 }}>
          Entry: market open 09:30 · Exit: same day
        </div>

        <div>
          <Label style={{ marginBottom: 6, display: 'block' }}>Exit time</Label>
          <Select value={exitTime} onValueChange={(v) => { setExitTime(v as ExitTime); setResult(null); }}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXIT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 18 }}>
          <Button disabled={running} onClick={run}>
            {running ? 'Running…' : 'Run'}
          </Button>

          {result && (
            <div style={{ fontSize: 13, display: 'flex', gap: 12 }}>
              <span>
                Entry <strong>${result.entryPrice.toFixed(2)}</strong>
              </span>
              <span>
                Exit <strong>${result.exitPrice.toFixed(2)}</strong>
              </span>
              <span style={{ color: profitColor, fontWeight: 600 }}>
                {result.profitPct >= 0 ? '+' : ''}{result.profitPct.toFixed(2)}%
              </span>
            </div>
          )}

          {error && <span style={{ fontSize: 13, color: 'var(--color-red)' }}>{error}</span>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
