import { Input } from '@/components/ui/input';
import { MarketUtils } from '@/utils/market';

type SimOrderControlsProps = {
  tradeMode: 'long' | 'short';
  onTradeModeChange: (mode: 'long' | 'short') => void;
  startShares: string;
  onStartSharesChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  maxDate: string;
  timeframe: string;
  onTimeframeChange: (t: string) => void;
  eventSlot?: React.ReactNode;
  onLoad: (e: React.FormEvent) => void;
  showTradeControls: boolean;
};

export default function SimOrderControls({
  tradeMode,
  onTradeModeChange,
  startShares,
  onStartSharesChange,
  value,
  onValueChange,
  date,
  onDateChange,
  maxDate,
  timeframe,
  onTimeframeChange,
  eventSlot,
  onLoad,
  showTradeControls,
}: SimOrderControlsProps) {
  return (
    <form className="dtrade-order-controls" onSubmit={onLoad}>
      {showTradeControls && (
        <>
          <div className="dtrade-next-side">
            <button
              className={`sim-chart-btn${tradeMode === 'long' ? ' active' : ''}`}
              onClick={() => onTradeModeChange('long')}
              type="button"
            >
              Long
            </button>
            <button
              className={`sim-chart-btn${tradeMode === 'short' ? ' active' : ''}`}
              onClick={() => onTradeModeChange('short')}
              type="button"
              style={tradeMode === 'short' ? { borderColor: '#f97316', color: '#f97316' } : undefined}
            >
              Short
            </button>
            <span style={{ width: '0.5rem' }} />
            {tradeMode === 'long' ? (
              <>
                <span className="dtrade-side-btn dtrade-side-btn--buy">▲ Left click = Buy ($)</span>
                <span className="dtrade-side-btn dtrade-side-btn--sell">▼ Right click = Sell (%)</span>
              </>
            ) : (
              <>
                <span className="dtrade-side-btn dtrade-side-btn--sell">▼ Left click = Short ($)</span>
                <span className="dtrade-side-btn dtrade-side-btn--buy">▲ Right click = Cover (%)</span>
              </>
            )}
          </div>
          <div className="dtrade-shares">
            <span className="dtrade-label">Start shares:</span>
            <Input
              type="number"
              min="0"
              step="any"
              value={startShares}
              onChange={(e) => onStartSharesChange(e.target.value)}
              className="dtrade-shares-input"
            />
          </div>
          <div className="dtrade-shares">
            <span className="dtrade-label">Value:</span>
            <Input
              type="number"
              min="0"
              step="any"
              value={value}
              onChange={(e) => onValueChange(e.target.value)}
              className="dtrade-shares-input"
            />
            <span className="dtrade-label">$ buy / % sell</span>
          </div>
        </>
      )}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {eventSlot}
        <input
          className="alpaca-input"
          type="date"
          value={date}
          max={maxDate}
          onChange={(e) => onDateChange(e.target.value)}
        />
        <select className="alpaca-input" value={timeframe} onChange={(e) => onTimeframeChange(e.target.value)}>
          {MarketUtils.TIMEFRAMES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <button className="alpaca-btn" type="submit">
          Load
        </button>
      </div>
    </form>
  );
}
