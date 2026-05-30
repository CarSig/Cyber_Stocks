import { Input } from '@/components/ui/input';

type Props = {
  tradeMode: 'long' | 'short';
  onTradeModeChange: (mode: 'long' | 'short') => void;
  startShares: string;
  onStartSharesChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  valueLabel?: string;
};

export default function TradeModeControls({
  tradeMode,
  onTradeModeChange,
  startShares,
  onStartSharesChange,
  value,
  onValueChange,
  valueLabel = tradeMode === 'short' ? '$ short / % cover' : '$ buy / % sell',
}: Props) {
  return (
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
          <span className="dtrade-side-btn dtrade-side-btn--short">▼ Left click = Short ($)</span>
          <span className="dtrade-side-btn dtrade-side-btn--cover">▲ Right click = Cover (%)</span>
        </>
      )}
      <span style={{ width: '0.5rem' }} />
      {tradeMode === 'long' && (
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
      )}
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
        <span className="dtrade-label">{valueLabel}</span>
      </div>
    </div>
  );
}
