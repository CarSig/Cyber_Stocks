import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { SimStrategy } from '../reducers/baseStrategy';
import type { BaseSimAction } from '../reducers/baseReducer';

export function useAddManualAction<A extends { id: number }>(
  strategy: SimStrategy<A>,
  label: string,
  side: string,
  rawValue: string,
  date: string,
  dispatch: Dispatch<BaseSimAction<A>>,
  nextId: { current: number },
  onAdded?: () => void,
): () => void {
  return useCallback(() => {
    const action = strategy.createAction(nextId.current, label, side, rawValue, date);
    if (!action) return;
    nextId.current++;
    dispatch({ type: 'ADD_ACTION', action, date });
    onAdded?.();
  }, [strategy, label, side, rawValue, date]);
}
