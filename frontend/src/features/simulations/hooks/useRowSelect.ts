import { useCallback } from 'react';
import type { Dispatch, MutableRefObject } from 'react';
import type { IntradayEvent } from '@/features/charts/api';
import type { Action } from '@/utils/sim';
import { DateUtils } from '@/utils/date';
import { getExitTime } from '../utils';
import { intradayStrategy } from '../reducers/baseStrategy';
import type { IntradaySimAction, SimAllRow, ExitStrategy } from '../reducers/intradayReducer';

type Opts = {
  eventsData: IntradayEvent[] | undefined;
  timeframe: string;
  exitStrategy: ExitStrategy;
  dispatch: Dispatch<IntradaySimAction>;
  nextActionId: MutableRefObject<number>;
};

export function useRowSelect({ eventsData, timeframe, exitStrategy, dispatch, nextActionId }: Opts) {
  return useCallback(
    (row: SimAllRow) => {
      const ev = eventsData?.find((e) => e.rank === row.rank);
      if (!ev) return;
      dispatch({ type: 'LOAD_EVENT', event: ev, timeframe });
      const fixedExitTime = getExitTime(exitStrategy, timeframe);
      const exitTime = fixedExitTime ?? '15:45';
      const entryIso = DateUtils.timeToIso(row.entryTime, row.entryDate);
      const exitIso = DateUtils.timeToIso(exitTime, row.exitDate);
      const newActions: Action[] = [
        {
          id: nextActionId.current++,
          timestamp: entryIso,
          time: row.entryTime,
          side: row.action === 'short' ? 'short' : 'buy',
          value: 100,
        },
        {
          id: nextActionId.current++,
          timestamp: exitIso,
          time: exitTime,
          side: row.action === 'short' ? 'cover' : 'sell',
          value: 100,
        },
      ];
      const mode = row.action === 'short' ? 'short' : 'long';
      dispatch({ type: 'SET_TRADE_MODE', mode, date: row.entryDate });
      dispatch({
        type: 'SET_ACTIONS',
        actions: newActions,
        textValue: intradayStrategy.toText(row.entryDate, newActions),
      });
    },
    [eventsData, timeframe, exitStrategy, dispatch, nextActionId],
  );
}
