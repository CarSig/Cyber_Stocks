import { MarketUtils } from '@/features/simulations/utils/market';
import TradeModeControls from './TradeModeControls';

type OrderControlsProps = {
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

export default function OrderControls({
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
}: OrderControlsProps) {
  return (
    <form className="dtrade-order-controls" onSubmit={onLoad}>
      {showTradeControls && (
        <TradeModeControls
          tradeMode={tradeMode}
          onTradeModeChange={onTradeModeChange}
          startShares={startShares}
          onStartSharesChange={onStartSharesChange}
          value={value}
          onValueChange={onValueChange}
        />
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
