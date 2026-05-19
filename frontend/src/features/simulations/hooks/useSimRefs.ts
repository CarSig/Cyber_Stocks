import { useRef, useEffect } from 'react';
import type { Action } from '@/utils/sim';

export function useSimRefs(value: string, tradeMode: 'long' | 'short', actions: Action[]) {
  const valueRef = useRef(value);
  const tradeModeRef = useRef(tradeMode);
  const actionsRef = useRef(actions);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);
  useEffect(() => {
    tradeModeRef.current = tradeMode;
  }, [tradeMode]);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  return { valueRef, tradeModeRef, actionsRef };
}
