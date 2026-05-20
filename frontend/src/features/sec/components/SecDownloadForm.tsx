import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSecTickers, useSecSync } from '../hooks/useSecData';
import type { SecSyncResult } from '../api';

type Props = {
  selectedTicker: string | null;
  onTickerChange: (t: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (v: string) => void;
  onDateToChange: (v: string) => void;
};

export default function SecDownloadForm({
  selectedTicker,
  onTickerChange,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: Props) {
  const { data: tickers = [] } = useSecTickers();
  const [lastResult, setLastResult] = useState<SecSyncResult | null>(null);
  const { mutate, isPending, error } = useSecSync();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicker) return;
    setLastResult(null);
    mutate({ ticker: selectedTicker, dateFrom, dateTo }, { onSuccess: (res) => setLastResult(res) });
  }

  return (
    <form onSubmit={handleSubmit} className="sec-download-form">
      <div className="sec-form-row">
        <div className="sec-form-field">
          <Label>Ticker</Label>
          <Select value={selectedTicker ?? ''} onValueChange={onTickerChange}>
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

        <Button type="submit" disabled={!selectedTicker || isPending} className="sec-submit-btn">
          {isPending ? 'Downloading…' : 'Download Filings'}
        </Button>
      </div>

      {error && <pre className="sec-error">{JSON.stringify({ message: (error as Error).message }, null, 2)}</pre>}

      {lastResult && (
        <p className="sec-result">
          Done — {lastResult.filesAdded} files saved, {lastResult.skippedFilings} filings skipped
        </p>
      )}
    </form>
  );
}
