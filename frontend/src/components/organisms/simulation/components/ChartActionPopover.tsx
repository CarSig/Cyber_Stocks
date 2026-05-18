import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Side = 'buy' | 'sell' | 'short' | 'cover';

type Props = {
  x: number;
  y: number;
  initialSide: Side;
  initialValue: string;
  tradeMode: 'long' | 'short';
  mode?: 'add' | 'edit';
  onConfirm: (side: Side, value: string) => void;
  onDelete?: () => void;
  onDismiss: () => void;
};

export default function ChartActionPopover({
  x,
  y,
  initialSide,
  initialValue,
  tradeMode,
  mode = 'add',
  onConfirm,
  onDelete,
  onDismiss,
}: Props) {
  const [side, setSide] = useState<Side>(initialSide);
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onDismiss();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [onDismiss]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onDismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onDismiss]);

  const sideOptions: Side[] = tradeMode === 'long' ? ['buy', 'sell'] : ['short', 'cover'];
  const isExit = side === 'sell' || side === 'cover';

  return createPortal(
    <div
      ref={ref}
      className={`chart-action-popover${mode === 'edit' ? ' chart-marker-edit-popover' : ''}`}
      style={{ position: 'fixed', left: x, top: y, zIndex: 9999 }}
    >
      <div className="chart-action-popover__sides">
        {sideOptions.map((s) => (
          <button
            key={s}
            type="button"
            className={`chart-action-popover__side${side === s ? ' active' : ''}`}
            onClick={() => setSide(s)}
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>
      <Input
        type="number"
        min="0.01"
        max={isExit ? 100 : undefined}
        step="any"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="chart-action-popover__input"
        autoFocus
      />
      <span className="chart-action-popover__unit">{isExit ? '%' : '$'}</span>
      <Button size="sm" onClick={() => onConfirm(side, value)} className="chart-action-popover__add">
        {mode === 'edit' ? 'Save' : 'Add'}
      </Button>
      {mode === 'edit' && onDelete && (
        <Button size="sm" variant="destructive" onClick={onDelete} className="chart-action-popover__delete">
          Delete
        </Button>
      )}
    </div>,
    document.body,
  );
}
