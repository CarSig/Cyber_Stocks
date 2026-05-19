import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type Side = 'buy' | 'sell' | 'short' | 'cover';

type AddPopover = {
  x: number;
  y: number;
  side: Side;
  value: string;
  confirm: (side: Side, rawValue: string) => void;
  dismiss: () => void;
};

type EditPopover = {
  x: number;
  y: number;
  action: { side: Side; value: number | string };
  confirm: (side: Side, rawValue: string) => void;
  dismiss: () => void;
  delete: () => void;
};

type Props = {
  popover: AddPopover | EditPopover;
  tradeMode: 'long' | 'short';
  mode?: 'add' | 'edit';
};

export default function ChartActionPopover({ popover, tradeMode, mode = 'add' }: Props) {
  const isEdit = mode === 'edit';
  const initialSide = isEdit ? (popover as EditPopover).action.side : (popover as AddPopover).side;
  const initialValue = isEdit ? String((popover as EditPopover).action.value) : (popover as AddPopover).value;

  const [side, setSide] = useState<Side>(initialSide);
  const [value, setValue] = useState(initialValue);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) popover.dismiss();
    }
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [popover.dismiss]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') popover.dismiss();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [popover.dismiss]);

  const sideOptions: Side[] = tradeMode === 'long' ? ['buy', 'sell'] : ['short', 'cover'];
  const isExit = side === 'sell' || side === 'cover';

  return createPortal(
    <div
      ref={ref}
      className={`chart-action-popover${isEdit ? ' chart-marker-edit-popover' : ''}`}
      style={{ position: 'fixed', left: popover.x, top: popover.y, zIndex: 9999 }}
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
      <Button size="sm" onClick={() => popover.confirm(side, value)} className="chart-action-popover__add">
        {isEdit ? 'Save' : 'Add'}
      </Button>
      {isEdit && (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => (popover as EditPopover).delete()}
          className="chart-action-popover__delete"
        >
          Delete
        </Button>
      )}
    </div>,
    document.body,
  );
}
