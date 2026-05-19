import type { Dispatch } from 'react';
import type { Action } from '@/utils/sim';
import type { BaseSimAction } from '../reducers/baseReducer';
import { useChartPopover } from './useChartPopover';
import ChartActionPopover from '../components/ChartActionPopover';

export function useActionPopovers(
  dispatch: Dispatch<BaseSimAction<Action>>,
  nextIdRef: React.MutableRefObject<number>,
  date: string,
  tradeMode: 'long' | 'short',
  fmtLabel: (iso: string) => string,
) {
  const popover = useChartPopover<Action>(
    dispatch,
    nextIdRef,
    date,
    tradeMode,
    fmtLabel,
    (id, iso, label, side, val) => ({ id, timestamp: iso, time: label, side, value: val }),
  );

  const nodes = (
    <>
      {popover.add && <ChartActionPopover popover={popover.add} tradeMode={tradeMode} />}
      {popover.edit && <ChartActionPopover mode="edit" popover={popover.edit} tradeMode={tradeMode} />}
    </>
  );

  return { popover, nodes };
}
