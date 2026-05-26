import { useCallback } from 'react';
import type { Dispatch } from 'react';
import { parseIntradayText } from '../utils';
import type { BaseSimAction } from '../reducers/baseReducer';
import type { Action } from '@/features/simulations/utils/sim';

export function useTextChange(date: string, dispatch: Dispatch<BaseSimAction<Action>>) {
  return useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const raw = e.target.value;
      const { parsedDate, actions: parsed } = parseIntradayText(raw, date);
      dispatch({
        type: 'SET_TEXT',
        raw,
        parsedDate: parsedDate ?? undefined,
        parsedActions: parsed.length ? parsed : undefined,
      });
    },
    [date, dispatch],
  );
}
