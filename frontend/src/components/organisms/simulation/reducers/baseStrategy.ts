import type { Side, Action } from '@/utils/sim';
import { DateUtils } from '@/utils/date';
import type { BaseSimState, BaseSimAction } from './baseReducer';

// Prop object shapes — kept here so strategies can build them without circular imports
export type ToolbarExtras = {
  presets: Record<string, unknown> | undefined;
  presetsLoading?: boolean;
  presetsError?: Error | null;
  onPreset: (name: string) => void;
  onExportPdf: () => void;
  onClear: () => void;
  ai?: {
    onAiSim: () => void;
    aiSimDisabled?: boolean;
    onSimulateAll?: () => void;
    simulateAllLabel?: string;
    aiDelay?: number;
    onAiDelayChange?: (v: number) => void;
    exitAtClose?: boolean;
    onExitAtCloseChange?: (v: boolean) => void;
  };
};

export type BuiltToolbar = ToolbarExtras & {
  textMode: boolean;
  onTextModeToggle: () => void;
};

export type ManualExtras = {
  inputType: 'time' | 'date';
  onAdd: () => void;
  minDate?: string;
  maxDate?: string;
};

export type BuiltManual = ManualExtras & {
  inputValue: string;
  onInputChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  nextSide: string;
  onNextSideChange: (s: string) => void;
};

export type OrderControlsExtras = {
  maxDate: string;
  onLoad: (e: React.FormEvent) => void;
  eventSlot?: React.ReactNode;
  showTradeControls: boolean;
};

export type BuiltOrderControls = OrderControlsExtras & {
  tradeMode: 'long' | 'short';
  onTradeModeChange: (mode: 'long' | 'short') => void;
  startShares: string;
  onStartSharesChange: (v: string) => void;
  value: string;
  onValueChange: (v: string) => void;
  date: string;
  onDateChange: (d: string) => void;
  timeframe: string;
  onTimeframeChange: (t: string) => void;
};

export type ActionsExtras<A> = {
  labelSlot?: (action: A, index: number) => React.ReactNode;
};

export type BuiltActions<A> = ActionsExtras<A> & {
  list: A[];
  onUpdate: (id: number, field: 'side' | 'value', val: string) => void;
  onRemove: (id: number) => void;
};

export type SimStrategy<A> = {
  toText: (date: string, actions: A[]) => string;
  createAction: (id: number, label: string, side: string, rawValue: string, date?: string) => A | null;
  updateAction: (action: A, field: 'side' | 'value', val: string) => A;
  getLabel: (action: A) => string;
  getSortKey: (action: A) => string;
  defaultSide: (tradeMode: 'long' | 'short') => string;
  getTextPlaceholder: () => string;
  getTextRows: (actionCount: number) => number;
  isIntraday: boolean;
  buildToolbar: <S extends BaseSimState<A>>(
    s: S,
    dispatch: React.Dispatch<BaseSimAction<A>>,
    extras: ToolbarExtras,
  ) => BuiltToolbar;
  buildManual: <S extends BaseSimState<A>>(
    s: S,
    dispatch: React.Dispatch<BaseSimAction<A>>,
    extras: ManualExtras,
  ) => BuiltManual;
  buildActions: <S extends BaseSimState<A>>(
    s: S,
    dispatch: React.Dispatch<BaseSimAction<A>>,
    extras?: ActionsExtras<A>,
  ) => BuiltActions<A>;
  buildOrderControls: <S extends BaseSimState<A>>(
    s: S,
    dispatch: React.Dispatch<BaseSimAction<A>>,
    extras: OrderControlsExtras,
  ) => BuiltOrderControls;
};

function stateDate<S>(s: S): string {
  const st = s as unknown as { query?: { date: string }; date?: string };
  return st.query?.date ?? st.date ?? '';
}

function stateTimeframe<S>(s: S): string {
  return (s as unknown as { timeframe?: string }).timeframe ?? '';
}

function buildOrderControlsImpl<A, S extends BaseSimState<A>>(
  s: S,
  dispatch: React.Dispatch<BaseSimAction<A>>,
  extras: OrderControlsExtras,
): BuiltOrderControls {
  const date = stateDate(s);
  return {
    ...extras,
    tradeMode: s.tradeMode,
    onTradeModeChange: (mode) => dispatch({ type: 'SET_TRADE_MODE', mode, date }),
    startShares: s.startShares,
    onStartSharesChange: (v) => dispatch({ type: 'SET_START_SHARES', startShares: v }),
    value: s.value,
    onValueChange: (v) => dispatch({ type: 'SET_VALUE', value: v }),
    date,
    onDateChange: (d) => dispatch({ type: 'SET_DATE', date: d }),
    timeframe: stateTimeframe(s),
    onTimeframeChange: (t) => dispatch({ type: 'SET_TIMEFRAME', timeframe: t }),
  };
}

function buildToolbarImpl<A, S extends BaseSimState<A>>(
  s: S,
  dispatch: React.Dispatch<BaseSimAction<A>>,
  extras: ToolbarExtras,
): BuiltToolbar {
  return {
    ...extras,
    textMode: s.textMode,
    onTextModeToggle: () => dispatch({ type: 'TOGGLE_TEXT_MODE', date: stateDate(s) }),
  };
}

function buildManualImpl<A, S extends BaseSimState<A>>(
  s: S,
  dispatch: React.Dispatch<BaseSimAction<A>>,
  extras: ManualExtras,
): BuiltManual {
  return {
    ...extras,
    inputValue: s.manualTime,
    onInputChange: (v: string) => dispatch({ type: 'SET_MANUAL_TIME', time: v }),
    value: s.value,
    onValueChange: (v: string) => dispatch({ type: 'SET_VALUE', value: v }),
    nextSide: s.nextSide,
    onNextSideChange: (side: string) => dispatch({ type: 'SET_NEXT_SIDE', side }),
  };
}

function buildActionsImpl<A extends { id: number }, S extends BaseSimState<A>>(
  s: S,
  dispatch: React.Dispatch<BaseSimAction<A>>,
  extras?: ActionsExtras<A>,
): BuiltActions<A> {
  const date = stateDate(s);
  return {
    list: s.actions,
    labelSlot: extras?.labelSlot,
    onUpdate: (id: number, field: 'side' | 'value', val: string) =>
      dispatch({ type: 'UPDATE_ACTION', id, field, val, date }),
    onRemove: (id: number) => dispatch({ type: 'REMOVE_ACTION', id, date }),
  };
}

// Shared by DayTradeSimulation and EventSimulation (same Action type)
export const intradayStrategy: SimStrategy<Action> = {
  toText: (date, actions) =>
    [
      date,
      ...actions.map((a) => {
        const isExit = a.side === 'sell' || a.side === 'cover';
        return `${a.time}, ${isExit ? -a.value : a.value}`;
      }),
    ].join('\n'),
  createAction: (id, time, side, rawValue, date = '') => {
    const val = Number(rawValue);
    if (!isFinite(val) || val <= 0) return null;
    const isExit = side === 'sell' || side === 'cover';
    return {
      id,
      timestamp: DateUtils.timeToIso(time, date),
      time,
      side: side as Side,
      value: isExit ? Math.min(100, val) : val,
    };
  },
  updateAction: (a, field, val) => {
    const isExit = (s: Side) => s === 'sell' || s === 'cover';
    if (field === 'value') return { ...a, value: isExit(a.side) ? Math.min(100, Number(val)) : Number(val) };
    const newSide = val as Side;
    return { ...a, side: newSide, value: isExit(newSide) ? Math.min(100, a.value) : a.value };
  },
  getLabel: (a) => a.time,
  getSortKey: (a) => a.timestamp,
  defaultSide: (mode) => (mode === 'short' ? 'short' : 'buy'),
  getTextPlaceholder: () => '09:30, 100\n10:15, -50',
  getTextRows: (count) => Math.max(3, count + 1),
  isIntraday: true,
  buildToolbar: buildToolbarImpl,
  buildManual: buildManualImpl,
  buildActions: buildActionsImpl,
  buildOrderControls: buildOrderControlsImpl,
};

type LongTermAction = { id: number; date: string; side: 'buy' | 'sell' | 'short' | 'cover'; value: string };

const isLongTermExit = (t: LongTermAction['side']) => t === 'sell' || t === 'cover';

export const longTermStrategy: SimStrategy<LongTermAction> = {
  toText: (_date, actions) =>
    actions
      .map((a) => `${a.date}, ${isLongTermExit(a.side) ? -Math.abs(Number(a.value)) : Math.abs(Number(a.value))}`)
      .join('\n'),
  createAction: (id, date, side, rawValue) => {
    const val = Number(rawValue);
    if (!isFinite(val) || val === 0 || !date) return null;
    return { id, date, side: side as LongTermAction['side'], value: String(Math.abs(val)) };
  },
  updateAction: (a, field, val) =>
    field === 'side' ? { ...a, side: val as LongTermAction['side'] } : { ...a, value: val },
  getLabel: (a) => a.date,
  getSortKey: (a) => a.date,
  defaultSide: (mode) => (mode === 'short' ? 'short' : 'buy'),
  getTextPlaceholder: () => '2025-01-15, 100\n2025-06-01, -50',
  getTextRows: (count) => Math.max(3, count + 1),
  isIntraday: false,
  buildToolbar: buildToolbarImpl,
  buildManual: buildManualImpl,
  buildActions: buildActionsImpl,
  buildOrderControls: buildOrderControlsImpl,
};
