import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CombinationRow, EntryStrategy, ExitStrategy } from '../../reducers/intradayReducer';

const EXIT_LABELS: Record<ExitStrategy, string> = {
  '15:45': 'Exit 15:45',
  '15:59': 'Exit 15:59',
  'vol-same-day': 'Vol same day',
  'vol-next-day': 'Vol next day',
  'vol-hold': 'Vol 2× spike',
  'vol-hold-3x': 'Vol 3× spike',
  'vol-hold-eod': 'Vol EOD spike',
  'vol-hold-vwap': 'Vol VWAP cross',
  'vol-hold-confirm': 'Vol price+vol',
  'vol-trail': 'Vol trailing ATR',
  'vol-staged': 'Vol staged scale-out',
};

type Props = {
  open: boolean;
  onClose: () => void;
  running: boolean;
  results: CombinationRow[] | null;
  onSelectCombo: (entry: EntryStrategy, exit: ExitStrategy) => void;
};

export default function CombinationsDialog({ open, onClose, running, results, onSelectCombo }: Props) {
  const fmt = (v: number | null) => (v == null ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2) + '%');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
        <DialogHeader>
          <DialogTitle>All Combinations</DialogTitle>
        </DialogHeader>

        {running && <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>Running all combinations…</p>}

        {results && (
          <>
            <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '0 0 0.5rem' }}>
              {results.length} exit strategies — click a row to apply it
            </p>
            <table className="sim-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left' }}>Exit strategy</th>
                  <th style={{ textAlign: 'right' }}>Wins</th>
                  <th style={{ textAlign: 'right' }}>Losses</th>
                  <th style={{ textAlign: 'right' }}>Total</th>
                  <th style={{ textAlign: 'right' }}>Avg Win</th>
                  <th style={{ textAlign: 'right' }}>Avg Loss</th>
                  <th style={{ textAlign: 'right' }}>Avg Total</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row, i) => {
                  const totalColor =
                    row.avgTotal == null
                      ? 'var(--text-faint)'
                      : row.avgTotal >= 0
                        ? 'var(--color-green)'
                        : 'var(--color-red)';
                  return (
                    <tr
                      key={i}
                      style={{ cursor: 'pointer' }}
                      onClick={() => {
                        onSelectCombo(row.entryStrategy, row.exitStrategy);
                        onClose();
                      }}
                    >
                      <td style={{ fontSize: 12 }}>{EXIT_LABELS[row.exitStrategy]}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-green)', fontWeight: 600 }}>{row.wins}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-red)', fontWeight: 600 }}>{row.losses}</td>
                      <td style={{ textAlign: 'right', color: 'var(--text-faint)', fontSize: 12 }}>{row.total}</td>
                      <td style={{ textAlign: 'right', color: 'var(--color-green)', fontSize: 12 }}>
                        {fmt(row.avgWin)}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--color-red)', fontSize: 12 }}>
                        {fmt(row.avgLoss)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: totalColor }}>{fmt(row.avgTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
