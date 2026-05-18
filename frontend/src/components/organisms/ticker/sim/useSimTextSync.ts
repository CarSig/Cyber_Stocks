import { useState, useRef, useEffect, useCallback } from 'react';
import type { Side } from '@/utils/sim';

type TextAction = {
  // The label shown in text (date string or HH:MM)
  label: string;
  side: Side;
  value: number;
};

type UseSimTextSyncOptions<TAction> = {
  actions: TAction[];
  // Extract the text fields from an action
  toTextAction: (a: TAction) => TextAction;
  // Parse a single label+num pair back into an action
  parseTextAction: (label: string, num: number) => TAction | null;
  onActionsChange: (actions: TAction[]) => void;
};

export function useSimTextSync<TAction>({
  actions,
  toTextAction,
  parseTextAction,
  onActionsChange,
}: UseSimTextSyncOptions<TAction>) {
  const fromTextRef = useRef(false);

  const actionsToText = useCallback(
    (acts: TAction[]) =>
      acts
        .map((a) => {
          const { label, side, value } = toTextAction(a);
          const n = side === 'sell' || side === 'cover' ? -Math.abs(value) : Math.abs(value);
          return `${label}, ${n}`;
        })
        .join('\n'),
    [toTextAction],
  );

  const [textValue, setTextValue] = useState(() => actionsToText(actions));

  // Sync actions → text (skip when text is the source of truth)
  useEffect(() => {
    if (fromTextRef.current) return;
    setTextValue(actionsToText(actions));
    // actionsToText is stable (useCallback with stable toTextAction)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      setTextValue(raw);
      fromTextRef.current = true;
      const parsed = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(',').map((s) => s.trim());
          if (parts.length !== 2) return null;
          const [label, numStr] = parts;
          const num = Number(numStr);
          if (isNaN(num) || num === 0) return null;
          return parseTextAction(label, num);
        })
        .filter((x): x is TAction => x !== null);
      if (parsed.length) onActionsChange(parsed);
      fromTextRef.current = false;
    },
    [parseTextAction, onActionsChange],
  );

  return { textValue, setTextValue, handleTextChange, actionsToText };
}
