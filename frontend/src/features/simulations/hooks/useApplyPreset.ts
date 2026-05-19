import { useCallback } from 'react';
import type { Dispatch } from 'react';
import type { SimStrategy } from '../reducers/baseStrategy';
import type { BaseSimAction } from '../reducers/baseReducer';

export function useApplyPreset<E, A extends { id: number }>(
  presets: Record<string, E[]>,
  mapEntry: (entry: E, id: number) => A,
  strategy: SimStrategy<A>,
  date: string,
  dispatch: Dispatch<BaseSimAction<A>>,
  nextId: { current: number },
): (name: string) => void {
  return useCallback(
    (name: string) => {
      const preset = presets[name];
      if (!preset) return;
      const actions = preset.map((e) => mapEntry(e, nextId.current++));
      dispatch({ type: 'SET_ACTIONS', actions, textValue: strategy.toText(date, actions) });
    },
    [presets, date],
  );
}
