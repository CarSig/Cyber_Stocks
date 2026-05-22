import { useCallback, useEffect, useRef, useState } from 'react';
import type { IChartApi } from 'lightweight-charts';

type ResizeConfig = {
  enabled?: boolean;
  minHeight?: number;
  defaultHeight?: number;
  maxHeight?: number;
};

const RESIZE_DEFAULTS = {
  minHeight: 120,
  defaultHeight: 320,
  maxHeight: 700,
} as const;

export function useChartResize(
  resize: ResizeConfig | undefined,
  chartRef: React.RefObject<IChartApi | null>,
  containerRef: React.RefObject<HTMLDivElement | null>,
) {
  const resizeEnabled = resize?.enabled ?? false;
  const { minHeight, defaultHeight, maxHeight } = { ...RESIZE_DEFAULTS, ...resize };

  const [height, setHeight] = useState(resizeEnabled ? defaultHeight : 0);
  const dragStartY = useRef<number | null>(null);
  const dragStartH = useRef<number>(defaultHeight);

  const clamp = useCallback((h: number) => Math.min(maxHeight, Math.max(minHeight, h)), [minHeight, maxHeight]);

  const onHandleWheel = useCallback(
    (e: React.WheelEvent) => {
      if (!resizeEnabled) return;
      e.preventDefault();
      setHeight((h) => clamp(h - e.deltaY * 0.5));
    },
    [clamp, resizeEnabled],
  );

  const onHandleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (!resizeEnabled) return;
      dragStartY.current = e.clientY;
      dragStartH.current = height;
      e.preventDefault();
    },
    [height, resizeEnabled],
  );

  useEffect(() => {
    if (!resizeEnabled) return;
    function onMouseMove(e: MouseEvent) {
      if (dragStartY.current === null) return;
      const delta = e.clientY - dragStartY.current;
      setHeight(clamp(dragStartH.current + delta));
    }
    function onMouseUp() {
      dragStartY.current = null;
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [clamp, resizeEnabled]);

  // Apply height to chart
  useEffect(() => {
    if (!resizeEnabled) return;
    if (chartRef.current && containerRef.current) {
      chartRef.current.applyOptions({ height, width: containerRef.current.clientWidth });
    }
  }, [height, resizeEnabled, chartRef, containerRef]);

  return { height, onHandleWheel, onHandleMouseDown };
}
