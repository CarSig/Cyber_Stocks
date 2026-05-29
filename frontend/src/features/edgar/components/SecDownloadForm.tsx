import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSecTickers, useSecSync, useSecSyncStatus } from '../hooks/useSecData';
import { useSecSyncProgress } from '../hooks/useSecSyncProgress';
import type { DownloadProps } from '../types';

export default function SecDownloadForm({
  selectedTicker,
  onTickerChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: DownloadProps) {
  const { data: tickers = [] } = useSecTickers();
  const { mutate, isPending: isStarting, error } = useSecSync();
  const { data: status } = useSecSyncStatus(selectedTicker);

  // A sync is "active" if the server says it's running, or we just kicked one off.
  const running = status?.running ?? false;
  const active = running || isStarting;
  const { progress, reset } = useSecSyncProgress(selectedTicker, active);

  function run(force: boolean) {
    if (!selectedTicker) return;
    reset();
    mutate({ ticker: selectedTicker, dateFrom, dateTo, force });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(false);
      }}
      className="sec-download-form"
    >
      <div className="sec-form-row">
        <div className="sec-form-field">
          <Label>Ticker</Label>
          <Select value={selectedTicker ?? ''} onValueChange={(v) => onTickerChange(v ?? '')}>
            <SelectTrigger className="sec-select">
              <SelectValue placeholder="Select ticker" />
            </SelectTrigger>
            <SelectContent>
              {tickers.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="sec-form-field">
          <Label>From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
        </div>

        <div className="sec-form-field">
          <Label>To</Label>
          <Input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>

        <div className="sec-form-buttons">
          <Button type="submit" disabled={!selectedTicker || active}>
            {active ? 'Downloading…' : 'Download'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedTicker || active}
            onClick={() => run(true)}
            title="Re-download all filings in range, even if already saved"
          >
            Re-download
          </Button>
        </div>
      </div>

      {active && progress && (
        <div className="sec-progress">
          <div className="sec-progress-bar-wrap">
            <div
              className="sec-progress-bar"
              style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }}
            />
          </div>
          <span className="sec-progress-label">
            {progress.current} / {progress.total} — {progress.form}
          </span>
        </div>
      )}

      {active && !progress && <p className="sec-progress-label">Fetching filing list…</p>}

      {error && <p className="sec-error">{(error as Error).message}</p>}
    </form>
  );
}
