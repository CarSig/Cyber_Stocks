export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function makeChartOptions(container, height = 400) {
  const cv = cssVar;
  return {
    width: container.clientWidth,
    height,
    layout: { background: { color: cv('--surface-0') }, textColor: cv('--text-primary') },
    grid: { vertLines: { color: cv('--surface-3') }, horzLines: { color: cv('--surface-3') } },
    timeScale: { timeVisible: true },
  };
}
