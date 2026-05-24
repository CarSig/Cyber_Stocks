// --- Current framework hooks (used by ChartAuto / useChartShell) ---
export { useChartRange } from './useChartRange';
export { useChartResize } from './useChartResize';
export { useSyncRef } from './useSyncRef';

// --- Legacy hooks (kept for simulation flows + IntradayChart) ---
// New code should NOT import these. They drive the imperative
// useChartInstance pipeline that ChartAuto/useChart replaced.
export { useOverlayRefs } from './legacy/useOverlayRefs';
export type { OverlayRefs } from './legacy/useOverlayRefs';
export { useChartInstance } from './legacy/useChartInstance';
export type { ChartType } from './legacy/useChartInstance';
