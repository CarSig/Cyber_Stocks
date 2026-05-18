import { Button } from '@/components/ui/button';

type ActionRow = {
  id: number;
  side: string;
  value: number | string;
};

type Props<A extends ActionRow> = {
  actions: A[];
  tradeMode: 'long' | 'short';
  labelSlot: (action: A, index: number) => React.ReactNode;
  onUpdate: (id: number, field: 'side' | 'value', val: string) => void;
  onRemove: (id: number) => void;
  sortKey?: (action: A) => string;
};

export default function ActionTable<A extends ActionRow>({
  actions,
  tradeMode,
  labelSlot,
  onUpdate,
  onRemove,
  sortKey,
}: Props<A>) {
  const rows = sortKey ? [...actions].sort((a, b) => sortKey(a).localeCompare(sortKey(b))) : actions;
  const isExit = (side: string) => side === 'sell' || side === 'cover';

  return (
    <div className="dtrade-orders">
      <div className="dtrade-section-title">Actions</div>
      <table className="sim-table">
        <thead>
          <tr>
            {['', 'Side', 'Value', ''].map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.id}>
              <td>{labelSlot(a, i)}</td>
              <td>
                <select
                  className="dtrade-inline-select"
                  value={a.side}
                  onChange={(e) => onUpdate(a.id, 'side', e.target.value)}
                >
                  {tradeMode === 'long' ? (
                    <>
                      <option value="buy">BUY</option>
                      <option value="sell">SELL</option>
                    </>
                  ) : (
                    <>
                      <option value="short">SHORT</option>
                      <option value="cover">COVER</option>
                    </>
                  )}
                </select>
              </td>
              <td>
                <input
                  className="dtrade-inline-input"
                  type="number"
                  min="0"
                  max={isExit(a.side) ? 100 : undefined}
                  step="any"
                  value={a.value}
                  onChange={(e) => onUpdate(a.id, 'value', e.target.value)}
                />
                <span className="dtrade-unit">{isExit(a.side) ? '%' : '$'}</span>
              </td>
              <td>
                <Button variant="ghost" onClick={() => onRemove(a.id)} className="dtrade-remove">
                  ✕
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
