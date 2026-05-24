import { useEffect, useRef, type RefObject } from 'react';

/**
 * Mirrors a render-time value into a ref so effects/closures can read the
 * latest value without re-subscribing. Useful for callbacks captured by
 * imperative chart subscriptions.
 */
export function useSyncRef<T>(value: T): RefObject<T> {
  const ref = useRef<T>(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}
