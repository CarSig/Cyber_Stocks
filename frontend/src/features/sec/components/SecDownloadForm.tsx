import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSecTickers, useSecSync } from '../hooks/useSecData';
import type { SecSyncResult } from '../api';
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
  const [lastResult, setLastResult] = useState<SecSyncResult | null>(null);
  const { mutate, isPending, error } = useSecSync();

  function run(force: boolean) {
    if (!selectedTicker) return;
    setLastResult(null);
    mutate({ ticker: selectedTicker, dateFrom, dateTo, force }, { onSuccess: (res) => setLastResult(res) });
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
          <Button type="submit" disabled={!selectedTicker || isPending}>
            {isPending ? 'Downloading…' : 'Download'}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!selectedTicker || isPending}
            onClick={() => run(true)}
            title="Re-download all filings in range, even if already saved"
          >
            Re-download
          </Button>
        </div>
      </div>

      {error && <p className="sec-error">{(error as Error).message}</p>}

      {lastResult && (
        <p className="sec-result">
          Done — {lastResult.filesAdded} files saved, {lastResult.skippedFilings} filings skipped
        </p>
      )}
    </form>
  );
}
