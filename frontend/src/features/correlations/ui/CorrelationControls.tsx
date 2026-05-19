import { LAG_SELECTOR_OPTS } from '../constants';

type CorrelationSelectorProps = {
  lagDays: number;
  setLagDays: (days: number) => void;
};

export function CorrelationSelector({ lagDays, setLagDays }: CorrelationSelectorProps) {
  return (
    <div className="correlation-selector">
      <h2 className="correlation-selector-label">Sentiment ↔ Price Correlation</h2>
      <select
        value={lagDays}
        onChange={(e) => setLagDays(Number(e.target.value))}
        className="correlation-selector-select"
      >
        {LAG_SELECTOR_OPTS.map((d) => (
          <option key={d} value={d}>{`${d}d lag`}</option>
        ))}
      </select>
    </div>
  );
}

type ViewToggleProps = {
  viewMode: string;
  setViewMode: (mode: string) => void;
};

export function ViewToggle({ viewMode, setViewMode }: ViewToggleProps) {
  return (
    <div className="view-toggle">
      <button
        onClick={() => setViewMode('grid')}
        className={`view-toggle-btn ${viewMode === 'grid' ? 'view-toggle-btn--active' : 'view-toggle-btn--inactive'}`}
      >
        Grid
      </button>
      <button
        onClick={() => setViewMode('list')}
        className={`view-toggle-btn ${viewMode === 'list' ? 'view-toggle-btn--active' : 'view-toggle-btn--inactive'}`}
      >
        List
      </button>
    </div>
  );
}
