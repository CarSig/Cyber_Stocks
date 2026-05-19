import type { IChartApi, Time } from 'lightweight-charts';
import type { AlpacaBar } from '@/types';
import { DateUtils } from '@/utils/date';

type DayBoundary = { time: number; weekend: boolean };

function buildDayBoundaries(bars: AlpacaBar[], offset: number): DayBoundary[] {
  const boundaries: DayBoundary[] = [];
  let prevEtDate: string | null = null;
  for (const b of bars) {
    const etDate = DateUtils.fmtDateEt(b.t);
    if (prevEtDate !== null && etDate !== prevEtDate) {
      const prevD = new Date(prevEtDate + 'T12:00:00Z');
      const curD = new Date(etDate + 'T12:00:00Z');
      const dayDiff = Math.round((curD.getTime() - prevD.getTime()) / 86_400_000);
      boundaries.push({ time: Math.floor(new Date(b.t).getTime() / 1000) + offset, weekend: dayDiff > 1 });
    }
    prevEtDate = etDate;
  }
  return boundaries;
}

export function setupDayLines(
  chart: IChartApi,
  overlayEl: HTMLElement,
  containerEl: HTMLElement,
  bars: AlpacaBar[],
  offset: number,
): () => void {
  const boundaries = buildDayBoundaries(bars, offset);

  const draw = () => {
    const ts = chart.timeScale();
    const html: string[] = [];
    for (const b of boundaries) {
      const x = ts.timeToCoordinate(b.time as unknown as Time);
      if (x == null) continue;
      html.push(`<span class="${b.weekend ? 'weekend' : ''}" style="left:${x}px"></span>`);
    }
    overlayEl.innerHTML = html.join('');
  };

  draw();
  const ts = chart.timeScale();
  ts.subscribeVisibleTimeRangeChange(draw);

  let disposed = false;
  const ro = new ResizeObserver(() => {
    if (!disposed) {
      chart.applyOptions({ width: containerEl.clientWidth });
      draw();
    }
  });
  ro.observe(containerEl);

  return () => {
    disposed = true;
    ts.unsubscribeVisibleTimeRangeChange(draw);
    ro.disconnect();
    overlayEl.innerHTML = '';
  };
}
