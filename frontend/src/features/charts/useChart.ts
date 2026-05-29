import { useEffect, useRef, useState } from 'react';
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  BarSeries,
  LineSeries,
  AreaSeries,
  BaselineSeries,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type SeriesType,
  type Time,
  type SeriesMarker,
  type ISeriesMarkersPluginApi,
} from 'lightweight-charts';
import { makeChartOptions } from './utils/theme';
import type { ChartController, ChartPlugin, ChartType, PluginHandle, SeriesDefinition } from './types';

const SERIES_CTORS = {
  Candlestick: CandlestickSeries,
  Bar: BarSeries,
  Line: LineSeries,
  Area: AreaSeries,
  Baseline: BaselineSeries,
  Histogram: HistogramSeries,
} as const;

type PrimaryDatum = Parameters<ISeriesApi<SeriesType>['setData']>[0][number];

type UseChartOpts = {
  /** Primary series data. Re-applied via setData() when reference changes — no chart recreate. */
  data: PrimaryDatum[];
  /** Primary series type. Changing this swaps the series in place; chart is NOT recreated. */
  type: ChartType;
  /** Plugins. Identity matters: adding/removing entries mounts/unmounts.
   *
   *  Live data: when a plugin's data changes at runtime, set its `version`
   *  field (e.g. `quotes.length` or any hash that changes with the data).
   *  The engine includes `version` in the remount key, so the plugin will
   *  be unmounted and re-mounted with the new closure. See
   *  ChartPlugin.version in types.ts. */
  plugins?: ChartPlugin[];
  /** Optional enabled-state map keyed by plugin.id. If omitted, defaultEnabled is used. */
  enabled?: Record<string, boolean>;
  /** Fraction (0–1) of pane height reserved at the top of the primary series'
   *  price scale. Set this to leave constant headroom for `aboveBar` markers so
   *  toggling them on doesn't rescale (squeeze) the series. */
  topScaleMargin?: number;
  /** Custom formatter for the primary series' price-scale labels (e.g. abbreviate
   *  volume as `1.2M`). Applied via the series' `priceFormat: { type: 'custom' }`. */
  priceFormat?: (value: number) => string;
  /** Fixed minimum width (px) for the right price scale. Set the same value on
   *  stacked charts so their time axes align regardless of label content. */
  priceScaleMinWidth?: number;
};

type UseChartResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  chartRef: React.RefObject<IChartApi | null>;
  primarySeriesRef: React.RefObject<ISeriesApi<SeriesType> | null>;
  controllerRef: React.RefObject<ChartController | null>;
  /** True once the chart instance and primary series exist. */
  ready: boolean;
};

/**
 * Headless chart engine. Owns the imperative lightweight-charts lifecycle and
 * a plugin registry. Knows nothing about your domain (no Trump/NVD/News).
 *
 * Lifecycle is split across three effects:
 *   1. mount/unmount the chart       (deps: [])
 *   2. swap primary series           (deps: [type])
 *   3. push new data                 (deps: [data])
 *   4. mount/unmount plugins         (deps: [plugins identity + enabled])
 *
 * This keeps the chart from being recreated on every prop change.
 */
export function useChart({ data, type, plugins = [], enabled, topScaleMargin, priceFormat, priceScaleMinWidth }: UseChartOpts): UseChartResult {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const primaryRef = useRef<ISeriesApi<SeriesType> | null>(null);
  const controllerRef = useRef<ChartController | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const markerGroupsRef = useRef<Map<string, SeriesMarker<Time>[]>>(new Map());
  const clickSubsRef = useRef<Set<(p: Parameters<Parameters<IChartApi['subscribeClick']>[0]>[0]) => void>>(new Set());

  const [ready, setReady] = useState(false);
  // Latest data/type refs so the plugin-mount effect can rebuild the controller
  // without re-running on every data change.
  const dataRef = useRef(data);
  dataRef.current = data;

  // --- 1. Mount the chart (once) ---
  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, makeChartOptions(containerRef.current));
    chartRef.current = chart;

    const clickHandler = (p: Parameters<Parameters<IChartApi['subscribeClick']>[0]>[0]) => {
      clickSubsRef.current.forEach((cb) => cb(p));
    };
    chart.subscribeClick(clickHandler);

    let disposed = false;
    const observer = new ResizeObserver(() => {
      if (!disposed && containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      disposed = true;
      observer.disconnect();
      chart.unsubscribeClick(clickHandler);
      chart.remove();
      chartRef.current = null;
      primaryRef.current = null;
      controllerRef.current = null;
      markersRef.current = null;
      markerGroupsRef.current.clear();
      setReady(false);
    };
  }, []);

  // --- 2. Create / swap primary series on type change ---
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (primaryRef.current) {
      chart.removeSeries(primaryRef.current);
      primaryRef.current = null;
      markersRef.current = null;
    }

    const series = chart.addSeries(
      SERIES_CTORS[type],
      priceFormat ? { priceFormat: { type: 'custom', formatter: priceFormat, minMove: 1 } } : undefined,
    );
    primaryRef.current = series;
    series.setData(dataRef.current);

    // Rebuild controller — it captures `series`, so a new series means a new controller.
    controllerRef.current = buildController({
      chart,
      series,
      markersRef,
      markerGroupsRef,
      clickSubsRef,
    });

    setReady(true);
  }, [type, priceFormat]);

  // Pin the right price scale to a fixed width so stacked charts (e.g. price +
  // volume) keep their time axes aligned regardless of label content.
  useEffect(() => {
    if (!chartRef.current || priceScaleMinWidth == null) return;
    chartRef.current.applyOptions({ rightPriceScale: { minimumWidth: priceScaleMinWidth } });
  }, [priceScaleMinWidth, ready]);

  // --- 3. Push data updates without recreating the series ---
  useEffect(() => {
    if (!primaryRef.current) return;
    primaryRef.current.setData(data);
  }, [data]);

  // Reserve constant top headroom so aboveBar markers don't rescale (squeeze)
  // the series when toggled on. Re-applied after each series swap (`type`) since
  // a new series resets its price-scale options. bottom:0.1 = library default.
  useEffect(() => {
    if (!primaryRef.current || topScaleMargin == null) return;
    primaryRef.current.priceScale().applyOptions({ scaleMargins: { top: topScaleMargin, bottom: 0.1 } });
  }, [topScaleMargin, type, ready]);

  // --- 4. Mount plugins ---
  // Keyed on plugin identity array + enabled map. We compute a string key so
  // callers can pass a fresh array each render without thrash, as long as
  // contents are stable.
  // Fast path: join ids (and versions) into a string for cheap dep comparison.
  // TODO: if two plugins ever share an id, this silently treats them as one.
  // Add a dev-mode duplicate check (Set size !== array length) before this
  // ships to more consumers. Trusting callers for now.
  // `version` lets a plugin force a remount when its internal data changes —
  // see ChartPlugin.version in types.ts.
  const pluginsKey = plugins.map((p) => `${p.id}@${p.version ?? ''}`).join('|');
  const enabledKey = plugins.map((p) => `${p.id}:${enabled?.[p.id] ?? p.defaultEnabled ?? true}`).join('|');

  useEffect(() => {
    if (!ready || !controllerRef.current) return;
    const ctrl = controllerRef.current;
    const handles: Array<{ id: string; handle: PluginHandle }> = [];

    for (const plugin of plugins) {
      const isEnabled = enabled?.[plugin.id] ?? plugin.defaultEnabled ?? true;
      if (!isEnabled) continue;
      try {
        const handle = plugin.mount(ctrl);
        handles.push({ id: plugin.id, handle });
      } catch (err) {
        console.error(`[useChart] plugin "${plugin.id}" failed to mount:`, err);
      }
    }

    return () => {
      for (const { id, handle } of handles) {
        try {
          handle.unmount();
        } catch (err) {
          console.error(`[useChart] plugin "${id}" failed to unmount:`, err);
        }
      }
      // Plugins are responsible for clearing their own markers via setMarkers(id, []),
      // but we sweep anything they left behind to avoid leaks across remounts.
      markerGroupsRef.current.clear();
      if (markersRef.current) markersRef.current.setMarkers([]);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, pluginsKey, enabledKey]);

  return { containerRef, chartRef, primarySeriesRef: primaryRef, controllerRef, ready };
}

// --- Controller factory --------------------------------------------------

type BuildControllerArgs = {
  chart: IChartApi;
  series: ISeriesApi<SeriesType>;
  markersRef: React.RefObject<ISeriesMarkersPluginApi<Time> | null>;
  markerGroupsRef: React.RefObject<Map<string, SeriesMarker<Time>[]>>;
  clickSubsRef: React.RefObject<Set<(p: Parameters<Parameters<IChartApi['subscribeClick']>[0]>[0]) => void>>;
};

function buildController({
  chart,
  series,
  markersRef,
  markerGroupsRef,
  clickSubsRef,
}: BuildControllerArgs): ChartController {
  const addSeries: ChartController['addSeries'] = <T extends SeriesType>(
    def: SeriesDefinition<T>,
    data: Parameters<ISeriesApi<T>['setData']>[0],
  ): ISeriesApi<T> => {
    // SERIES_CTORS keys are narrower than `SeriesType` at the value level
    // (`Custom` is excluded) — TS can't narrow through the indexed access
    // here, so we cast. Safe because ChartType is a subset of SeriesType.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ctor = SERIES_CTORS[def.type as ChartType] as any;
    const s = chart.addSeries(ctor, def.options) as ISeriesApi<T>;
    s.setData(data);
    return s;
  };

  const setMarkers: ChartController['setMarkers'] = (groupId, markers) => {
    if (markers.length === 0) {
      markerGroupsRef.current!.delete(groupId);
    } else {
      markerGroupsRef.current!.set(groupId, markers);
    }
    const all = Array.from(markerGroupsRef.current!.values())
      .flat()
      .sort((a, b) => (a.time < b.time ? -1 : a.time > b.time ? 1 : 0));

    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(series, all);
    } else {
      markersRef.current.setMarkers(all);
    }
  };

  const onClick: ChartController['onClick'] = (cb) => {
    clickSubsRef.current!.add(cb);
    return () => {
      clickSubsRef.current!.delete(cb);
    };
  };

  return { chart, primarySeries: series, addSeries, setMarkers, onClick };
}
