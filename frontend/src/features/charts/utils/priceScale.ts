/**
 * Shared right-price-scale width (px) for stacked charts. Setting the same
 * value on a price chart and the volume chart below it keeps their time axes
 * aligned regardless of label content (e.g. `412.50` vs `1.2M`).
 */
export const PRICE_SCALE_MIN_WIDTH = 88;

/**
 * Abbreviates large values for volume/count price-scale labels: `1.2M`, `350K`,
 * `2.4B`. Used as a `ChartAuto`/`useChart` `priceFormat`. Always receives a
 * number from lightweight-charts.
 */
export function formatVolumeAxis(value: number): string {
  const n = Math.abs(value);
  if (n >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return String(Math.round(value));
}
