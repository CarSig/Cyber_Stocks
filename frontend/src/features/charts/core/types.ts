import type { ReactNode } from 'react';
import type {
  IChartApi,
  ISeriesApi,
  SeriesType,
  Time,
  SeriesMarker,
  SeriesDataItemTypeMap,
  SeriesPartialOptionsMap,
  MouseEventParams,
} from 'lightweight-charts';

export type ChartType = 'Candlestick' | 'Bar' | 'Line' | 'Area' | 'Baseline' | 'Histogram';

export type SeriesDefinition<T extends SeriesType> = {
  type: T;
  options?: SeriesPartialOptionsMap[T];
};

export type ChartController = {
  chart: IChartApi;
  primarySeries: ISeriesApi<SeriesType>;
  /** Add a secondary series (overlay line, compare, HV/ATR, etc).
   *  Returns the raw ISeriesApi — plugin code captures this reference and
   *  calls .setData()/.update() directly when it needs to push new data.
   *
   *  NOTE: there is intentionally no controller-level `updateSeries` /
   *  series registry. Plugins manage their own series handles for now.
   *  Revisit if we get plugins that need to coordinate updates across
   *  each other's series. */
  addSeries: <T extends SeriesType>(
    def: SeriesDefinition<T>,
    data: SeriesDataItemTypeMap[T][],
  ) => ISeriesApi<T>;
  /** Replace markers for a logical group. Pass [] to clear. Multiple plugins
   *  can own different groups; the controller merges and applies them. */
  setMarkers: (groupId: string, markers: SeriesMarker<Time>[]) => void;
  /** Subscribe to chart clicks. Returns an unsubscribe function. */
  onClick: (cb: (params: MouseEventParams) => void) => () => void;
};

export type PluginHandle = {
  unmount: () => void;
  /** Optional — if provided, the chart can toggle the plugin without
   *  remount/unmount (cheaper). If absent, toggling re-mounts. */
  setEnabled?: (enabled: boolean) => void;
};

export type MarkerClickContext = {
  /** Normalized YYYY-MM-DD string derived from MouseEventParams.time. */
  date: string;
  /** Raw lightweight-charts Time value. */
  time: Time;
  /** Full click event from lightweight-charts. */
  params: MouseEventParams;
};

export type MarkerClickResult = {
  /** Optional header text. Defaults to the date if omitted. */
  title?: string;
  /** Modal body — rendered inside the shared modal shell. */
  body: ReactNode;
};

export type ChartPlugin = {
  /** Stable identifier. Used for marker groups, toggle state keys, React keys. */
  id: string;
  /** Optional label for auto-rendered toggle UI. If absent, no toggle is shown. */
  label?: string;
  /** Initial enabled state. Defaults to true. */
  defaultEnabled?: boolean;
  /** Called once the chart + primary series exist and plugin is enabled. */
  mount: (ctrl: ChartController) => PluginHandle;
  /** Called on every chart click. Return a MarkerClickResult to open a modal;
   *  return null/undefined if this plugin has nothing for that date.
   *
   *  PRECEDENCE: plugins are tested in array order, FIRST non-null wins.
   *  Mirrors the existing StockChart behavior (news → trump → nvd → otx → kev).
   *  Plugins whose toggle is OFF (`enabled[id] === false`) are skipped entirely. */
  onMarkerClick?: (ctx: MarkerClickContext) => MarkerClickResult | null | undefined;
};

export type ResizeConfig = {
  enabled?: boolean;
  minHeight?: number;
  defaultHeight?: number;
  maxHeight?: number;
  wheel?: boolean;
};
