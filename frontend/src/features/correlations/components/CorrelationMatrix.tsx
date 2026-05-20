import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCorrelationMatrix } from '../api';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CorrelationMatrixData } from '@/types';
import { corrColor } from '../utils';
import { LAG_WINDOW_OPTS, MATRIX_LAG_OPTS, MATRIX_DATA_START } from '../constants';

const today = new Date().toISOString().slice(0, 10);

type Props = {
  highlightTickers?: string[];
};

export default function CorrelationMatrix({ highlightTickers }: Props) {
  const highlightSet = highlightTickers && highlightTickers.length > 0 ? new Set(highlightTickers) : null;
  const [lagDays, setLagDays] = useState(0);
  const [windowDays, setWindowDays] = useState(90);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [draftStart, setDraftStart] = useState('');
  const [draftEnd, setDraftEnd] = useState('');
  const [dateError, setDateError] = useState('');

  const isCustom = Boolean(startDate || endDate);
  const params = { lagDays, windowDays, startDate: startDate || undefined, endDate: endDate || undefined };

  const { data, isPending, isFetching, error } = useQuery<
    CorrelationMatrixData & { startDate?: string; endDate?: string; windowDays?: number }
  >({
    queryKey: ['correlation-matrix', lagDays, windowDays, startDate, endDate],
    queryFn: () => getCorrelationMatrix(params),
    staleTime: isCustom ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000,
  });

  function openModal() {
    setDraftStart(startDate || '');
    setDraftEnd(endDate || '');
    setDateError('');
    setModalOpen(true);
  }

  function applyCustomDate() {
    if (!draftStart && !draftEnd) {
      setDateError('Set at least one date.');
      return;
    }
    if (draftStart && draftEnd && draftStart >= draftEnd) {
      setDateError('Start must be before end.');
      return;
    }
    setStartDate(draftStart);
    setEndDate(draftEnd);
    setModalOpen(false);
  }

  function clearCustomDate() {
    setStartDate('');
    setEndDate('');
    setDraftStart('');
    setDraftEnd('');
    setModalOpen(false);
  }

  const customLabel = (() => {
    if (!isCustom) return 'Custom';
    if (startDate && endDate) return `${startDate} → ${endDate}`;
    if (startDate) return `from ${startDate}`;
    return `to ${endDate}`;
  })();

  return (
    <section className="chart-card">
      <div className="chart-card-header">
        <span className="chart-card-title">
          Stock Correlation Matrix
          <span className="chart-card-subtitle" style={{ marginLeft: 8 }}>
            {isCustom ? customLabel : `${windowDays}d`} · log-returns
            {isFetching && !isPending ? ' · refreshing…' : ''}
          </span>
        </span>
      </div>

      <div className="corr-matrix-wrap">
        <div className="corr-matrix-toolbar" style={{ flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="corr-matrix-label">Window</span>
            {LAG_WINDOW_OPTS.map(({ label, value }) => (
              <button
                key={value}
                className={`corr-lag-btn${!isCustom && windowDays === value ? ' corr-lag-btn--active' : ''}`}
                onClick={() => {
                  setWindowDays(value);
                  setStartDate('');
                  setEndDate('');
                }}
              >
                {label}
              </button>
            ))}
            <button className={`corr-lag-btn${isCustom ? ' corr-lag-btn--active' : ''}`} onClick={openModal}>
              {customLabel}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span className="corr-matrix-label">Lag (b leads a)</span>
            {MATRIX_LAG_OPTS.map((d) => (
              <button
                key={d}
                className={`corr-lag-btn${lagDays === d ? ' corr-lag-btn--active' : ''}`}
                onClick={() => setLagDays(d)}
              >
                {d === 0 ? 'None' : `+${d}d`}
              </button>
            ))}
          </div>
        </div>

        {isPending && <p className="ti-muted">Loading matrix…</p>}
        {error && <p className="ti-muted">{(error as Error).message}</p>}

        {data &&
          (() => {
            const thinTickers = new Set(
              data.names.filter((a) => data.names.every((b) => a === b || data.matrix[a]?.[b] == null)),
            );

            const fromDate =
              data.startDate ??
              (() => {
                const d = new Date();
                d.setDate(d.getDate() - (data.windowDays ?? windowDays));
                return d.toISOString().slice(0, 10);
              })();
            const toDate = data.endDate ?? today;

            return (
              <>
                {thinTickers.size > 0 && (
                  <p className="corr-lag-note" style={{ color: 'var(--color-amber)' }}>
                    Not enough data for window:{' '}
                    {[...thinTickers].map((n) => data.tickers[data.names.indexOf(n)]).join(', ')}
                  </p>
                )}
                <div
                  className="corr-matrix"
                  style={{
                    gridTemplateColumns: `52px repeat(${data.tickers.length}, 1fr)`,
                    opacity: isFetching && !isPending ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                  }}
                >
                  <div className="corr-cell" />
                  {data.tickers.map((t, i) => {
                    const muted = highlightSet && !highlightSet.has(t);
                    return (
                      <div
                        key={t}
                        className={`corr-cell corr-head${muted ? ' corr-head--muted' : ''}`}
                        style={{ color: thinTickers.has(data.names[i]) ? 'var(--text-faint)' : undefined }}
                      >
                        {t}
                      </div>
                    );
                  })}
                  {data.names.map((a) => {
                    const ai = data.names.indexOf(a);
                    const rowTicker = data.tickers[ai];
                    return (
                      <>
                        <div
                          key={`lbl-${a}`}
                          className={`corr-cell corr-lbl${highlightSet && !highlightSet.has(rowTicker) ? ' corr-lbl--muted' : ''}`}
                          style={{ color: thinTickers.has(a) ? 'var(--text-faint)' : undefined }}
                        >
                          {rowTicker}
                        </div>
                        {data.names.map((b) => {
                          const bi = data.names.indexOf(b);
                          const colTicker = data.tickers[bi];
                          const muted = highlightSet && !highlightSet.has(rowTicker) && !highlightSet.has(colTicker);
                          const v = data.matrix[a]?.[b];
                          const isDiag = a === b;
                          return (
                            <div
                              key={b}
                              className={`corr-cell${muted ? ' corr-cell--muted' : ''}`}
                              style={{
                                background: isDiag ? 'transparent' : corrColor(v),
                                color: isDiag ? 'var(--text-faint)' : v == null ? 'var(--text-faint)' : 'white',
                              }}
                              title={
                                isDiag
                                  ? undefined
                                  : v != null
                                    ? `${data.tickers[ai]} vs ${data.tickers[data.names.indexOf(b)]}: ${v.toFixed(3)}`
                                    : 'Not enough data'
                              }
                            >
                              {isDiag ? '—' : v != null ? v.toFixed(2) : '—'}
                            </div>
                          );
                        })}
                      </>
                    );
                  })}
                </div>

                <div className="corr-lag-note" style={{ marginTop: 6 }}>
                  {`Period: ${fromDate} → ${toDate}${lagDays > 0 ? ` · lag ${lagDays}d (column leads row)` : ' · no lag'}`}
                </div>
              </>
            );
          })()}
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent style={{ maxWidth: 320 }}>
          <DialogHeader>
            <DialogTitle>Custom date range</DialogTitle>
          </DialogHeader>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 4 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="corr-matrix-label" style={{ fontSize: 12 }}>
                Start date
              </label>
              <input
                type="date"
                value={draftStart}
                min={MATRIX_DATA_START}
                max={draftEnd || today}
                onChange={(e) => {
                  setDraftStart(e.target.value);
                  setDateError('');
                }}
                className="corr-date-input"
                style={{ width: '100%', fontSize: 13, padding: '6px 10px' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="corr-matrix-label" style={{ fontSize: 12 }}>
                End date
              </label>
              <input
                type="date"
                value={draftEnd}
                min={draftStart || MATRIX_DATA_START}
                max={today}
                onChange={(e) => {
                  setDraftEnd(e.target.value);
                  setDateError('');
                }}
                className="corr-date-input"
                style={{ width: '100%', fontSize: 13, padding: '6px 10px' }}
              />
            </div>
            {dateError && (
              <p className="corr-lag-note" style={{ color: 'var(--color-amber)', margin: 0 }}>
                {dateError}
              </p>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              {isCustom && (
                <button className="corr-lag-btn" onClick={clearCustomDate}>
                  Clear
                </button>
              )}
              <button
                className="corr-lag-btn corr-lag-btn--active"
                onClick={applyCustomDate}
                disabled={!draftStart && !draftEnd}
              >
                Apply
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
