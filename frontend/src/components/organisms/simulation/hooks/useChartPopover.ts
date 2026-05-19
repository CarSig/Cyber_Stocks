import { useState, useCallback } from 'react';

import type { Dispatch } from 'react';
import type { BaseSimAction } from '../reducers/baseReducer';

type Side = 'buy' | 'sell' | 'short' | 'cover';

type AddPopoverState = {
  iso: string;
  x: number;
  y: number;
  side: Side;
  value: string;
};

type EditPopoverState<A> = {
  action: A;
  x: number;
  y: number;
};

export type PopoverAPI<A> = {
  /** The add-action popover state + methods, or null if closed */
  add:
    | (AddPopoverState & {
        confirm: (side: Side, rawValue: string) => void;
        dismiss: () => void;
      })
    | null;
  /** The edit-action popover state + methods, or null if closed */
  edit:
    | (EditPopoverState<A> & {
        confirm: (side: Side, rawValue: string) => void;
        dismiss: () => void;
        delete: () => void;
      })
    | null;
  /** Open the add popover (call from chart click handlers) */
  openAdd: (iso: string, x: number, y: number, side: Side, value: string) => void;
  /** Open the edit popover (call from chart click handlers) */
  openEdit: (action: A, x: number, y: number) => void;
};

/**
 * Manages the add-action popover and edit-action popover state.
 * Returns a single `popover` object with `.add` and `.edit` sub-objects,
 * each containing their own state + confirm/dismiss/delete methods,
 * plus `.openAdd()` and `.openEdit()` to trigger them.
 */
export function useChartPopover<A extends { id: number }>(
  dispatch: Dispatch<BaseSimAction<A>>,
  nextIdRef: React.MutableRefObject<number>,
  date: string,
  tradeMode: 'long' | 'short',
  /** Convert a timestamp/date string to the label used in the action */
  fmtLabel: (iso: string) => string,
  /** Create an action from popover data */
  createAction: (id: number, iso: string, label: string, side: Side, value: number) => A,
): PopoverAPI<A> {
  const [addState, setAddState] = useState<AddPopoverState | null>(null);
  const [editState, setEditState] = useState<EditPopoverState<A> | null>(null);

  const openAdd = useCallback((iso: string, x: number, y: number, side: Side, value: string) => {
    setAddState({ iso, x, y, side, value });
  }, []);

  const openEdit = useCallback((action: A, x: number, y: number) => {
    setEditState({ action, x, y });
  }, []);

  const confirmAdd = useCallback(
    (side: Side, rawValue: string) => {
      if (!addState) return;
      const isExit = side === 'sell' || side === 'cover';
      const val = isExit ? Math.min(100, Math.max(0.01, Number(rawValue))) : Math.max(0.01, Number(rawValue));
      if (!isFinite(val) || val <= 0) {
        setAddState(null);
        return;
      }
      const id = nextIdRef.current++;
      dispatch({
        type: 'ADD_ACTION',
        action: createAction(id, addState.iso, fmtLabel(addState.iso), side, val),
        date,
      });
      setAddState(null);
    },
    [addState, date, nextIdRef, fmtLabel, createAction],
  );

  const dismissAdd = useCallback(() => setAddState(null), []);

  const confirmEdit = useCallback(
    (side: Side, rawValue: string) => {
      if (!editState) return;
      const isExit = side === 'sell' || side === 'cover';
      const val = isExit ? Math.min(100, Math.max(0.01, Number(rawValue))) : Math.max(0.01, Number(rawValue));
      if (!isFinite(val) || val <= 0) {
        setEditState(null);
        return;
      }
      dispatch({ type: 'UPDATE_ACTION', id: editState.action.id, field: 'side', val: side, date });
      dispatch({ type: 'UPDATE_ACTION', id: editState.action.id, field: 'value', val: String(val), date });
      setEditState(null);
    },
    [editState, date],
  );

  const dismissEdit = useCallback(() => setEditState(null), []);
  const deleteEdit = useCallback(() => {
    if (!editState) return;
    dispatch({ type: 'REMOVE_ACTION', id: editState.action.id, date });
    setEditState(null);
  }, [editState, date]);

  return {
    add: addState ? { ...addState, confirm: confirmAdd, dismiss: dismissAdd } : null,
    edit: editState ? { ...editState, confirm: confirmEdit, dismiss: dismissEdit, delete: deleteEdit } : null,
    openAdd,
    openEdit,
  };
}
