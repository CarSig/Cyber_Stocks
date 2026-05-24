import { useRef, useEffect } from 'react';

export function useSimRefs<A>(value: string, tradeMode: 'long' | 'short', actions: A[]) {
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
