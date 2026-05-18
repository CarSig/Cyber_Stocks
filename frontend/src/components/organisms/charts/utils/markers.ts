import type { SeriesMarker, Time, ISeriesApi, SeriesType } from 'lightweight-charts';
import { createSeriesMarkers } from 'lightweight-charts';
import { cssVar } from './theme';
import type { Quote, TrumpPost, ThreatIntelItem, NewsArticle, NewsAnalysisMap } from '@/types';
import type { OverlayRefs } from '@/hooks/charts/useOverlayRefs';
import type { Action } from '@/utils/sim';
import { fmtMarkerText } from '@/utils/sim';
import { DateUtils } from '@/utils/date';
import type { IntradayEvent } from '@/api/alpaca';

type Marker = SeriesMarker<Time>;

export const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#eab308',
};

const NVD_SEVERITY_PRIORITY: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1, UNKNOWN: 0 };

export const NVD_SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#60a5fa',
  UNKNOWN: '#6b7280',
};

const byTime = (a: Marker, b: Marker) => (a.time < b.time ? -1 : 1);
const toDay = (date: string) => new Date(date).toISOString().slice(0, 10) as Time;

export function dedupeMarkers(markers: Marker[]): Marker[] {
  return [...new Map(markers.map((m) => [`${m.time}|${m.position}|${m.color}`, m])).values()];
}

type MiniQuote = { open: number; close: number; date: string };

type QuoteAnalysis = {
  biggestSameDayDiff: MiniQuote & { difference: string };
  biggestNextDayDiff: [MiniQuote, MiniQuote, string];
};

export function buildMarkers(analysis: QuoteAnalysis | null | undefined, color?: string): Marker[] {
  if (!analysis) return [];
  const { biggestSameDayDiff: same, biggestNextDayDiff: next } = analysis;
  const amber = color ?? cssVar('--color-amber');
  const red = color ?? cssVar('--color-red');
  return [
    same?.date && {
      time: toDay(same.date),
      position: 'aboveBar' as const,
      color: amber,
      shape: 'circle' as const,
      text: `Swing ${same.difference}`,
    },
    next?.[0]?.date && {
      time: toDay(next[0].date),
      position: 'belowBar' as const,
      color: red,
      shape: 'arrowUp' as const,
      text: 'Move D1',
    },
    next?.[1]?.date && {
      time: toDay(next[1].date),
      position: 'belowBar' as const,
      color: red,
      shape: 'arrowUp' as const,
      text: 'Move D2',
    },
  ]
    .filter(Boolean)
    .sort((a, b) => byTime(a as Marker, b as Marker)) as Marker[];
}

type CountMarkersOpts = {
  dateField: string;
  position: 'aboveBar' | 'belowBar' | 'inBar';
  color: string;
  shape: 'circle' | 'arrowUp' | 'arrowDown';
  label: string;
};

export function buildCountMarkers(
  items: Array<Record<string, unknown>> | null | undefined,
  { dateField, position, color, shape, label }: CountMarkersOpts,
): Marker[] {
  if (!items?.length) return [];
  const byDay = new Map<string, number>();
  for (const item of items) {
    const time = (item[dateField] as string | undefined)?.slice(0, 10);
    if (!time) continue;
    byDay.set(time, (byDay.get(time) ?? 0) + 1);
  }
  return [...byDay.entries()]
    .map(([time, count]) => ({ time: time as Time, position, color, shape, text: `${label} ×${count}` }))
    .sort(byTime);
}

export function buildNvdMarkers(nvdVulns: ThreatIntelItem[] | null | undefined): Marker[] {
  if (!nvdVulns?.length) return [];
  const byDay = new Map<string, { severity: string; count: number }>();
  for (const v of nvdVulns) {
    const published = (v as ThreatIntelItem & { published?: string }).published;
    if (!published) continue;
    const time = published.slice(0, 10);
    const sev = v.severity ?? 'UNKNOWN';
    const ex = byDay.get(time);
    if (!ex) {
      byDay.set(time, { severity: sev, count: 1 });
    } else {
      if ((NVD_SEVERITY_PRIORITY[sev] ?? 0) > (NVD_SEVERITY_PRIORITY[ex.severity] ?? 0)) ex.severity = sev;
      ex.count++;
    }
  }
  return [...byDay.entries()]
    .map(([time, { severity, count }]) => ({
      time: time as Time,
      position: 'aboveBar' as const,
      color: NVD_SEVERITY_COLORS[severity] ?? '#6b7280',
      shape: 'circle' as const,
      text: `${severity}${count > 1 ? ` ×${count}` : ''}`,
    }))
    .sort(byTime);
}

export function buildTrumpMarkers(posts: TrumpPost[] | null | undefined, quotes: Quote[]): Marker[] {
  if (!posts?.length) return [];
  const earliest = quotes.reduce((min, q) => {
    const d = new Date(q.date).toISOString().slice(0, 10);
    return d < min ? d : min;
  }, '9999-99-99');
  const seen = new Map<string, string>();
  for (const post of posts) {
    const time = post.created_at?.slice(0, 10);
    if (!time || time < earliest) continue;
    if (!seen.has(time)) seen.set(time, post.sentiment ?? 'neutral');
  }
  return [...seen.entries()]
    .map(([time, s]) => ({
      time: time as Time,
      position: 'aboveBar' as const,
      color: SENTIMENT_COLORS[s] ?? '#eab308',
      shape: 'circle' as const,
      text: '',
    }))
    .sort(byTime);
}

function nextTradingDate(dateStr: string, tradingDaySet: Set<string>): string | null {
  const d = new Date(dateStr);
  for (let i = 0; i <= 7; i++) {
    const key = d.toISOString().slice(0, 10);
    if (tradingDaySet.has(key)) return key;
    d.setDate(d.getDate() + 1);
  }
  return null;
}

export function buildNewsMarkers(
  articles: NewsArticle[] | null | undefined,
  analysis: NewsAnalysisMap | null | undefined,
  quotes: Quote[],
): Marker[] {
  if (!articles?.length) return [];
  const tradingDaySet = new Set((quotes ?? []).map((q) => new Date(q.date).toISOString().slice(0, 10)));
  const byRawDay = new Map<string, { pos: number; neg: number; neu: number }>();
  const seen = new Set<string>();

  for (const a of articles) {
    if (!a.providerPublishTime || !a.link || seen.has(a.link)) continue;
    seen.add(a.link);
    const ts = a.providerPublishTime;
    const rawDay = new Date(
      typeof ts === 'number' || (typeof ts === 'string' && /^\d{10}$/.test(ts)) ? Number(ts) * 1000 : ts,
    )
      .toISOString()
      .slice(0, 10);
    const score = analysis?.[a.link]?.sentiment ?? null;
    if (score === null) continue;
    if (!byRawDay.has(rawDay)) byRawDay.set(rawDay, { pos: 0, neg: 0, neu: 0 });
    const c = byRawDay.get(rawDay)!;
    if (score >= 0.1) c.pos++;
    else if (score <= -0.1) c.neg++;
    else c.neu++;
  }

  const byTrading = new Map<string, { pos: number; neg: number; neu: number; snapped: boolean }>();
  for (const [rawDay, counts] of byRawDay) {
    const target = tradingDaySet.size ? nextTradingDate(rawDay, tradingDaySet) : rawDay;
    if (!target) continue;
    if (!byTrading.has(target)) byTrading.set(target, { pos: 0, neg: 0, neu: 0, snapped: false });
    const t = byTrading.get(target)!;
    t.pos += counts.pos;
    t.neg += counts.neg;
    t.neu += counts.neu;
    if (target !== rawDay) t.snapped = true;
  }

  return [...byTrading.entries()]
    .flatMap(([time, { pos, neg, neu, snapped }]) => {
      const s = snapped ? '*' : '';
      return [
        ...(pos
          ? [
              {
                time: time as Time,
                position: 'aboveBar' as const,
                color: '#22c55e',
                shape: 'arrowUp' as const,
                text: `${pos}${s}`,
              },
            ]
          : []),
        ...(neg
          ? [
              {
                time: time as Time,
                position: 'belowBar' as const,
                color: '#ef4444',
                shape: 'arrowDown' as const,
                text: `${neg}${s}`,
              },
            ]
          : []),
        ...(neu
          ? [
              {
                time: time as Time,
                position: neg ? ('aboveBar' as const) : ('belowBar' as const),
                color: '#eab308',
                shape: 'circle' as const,
                text: `${neu}${s}`,
              },
            ]
          : []),
      ];
    })
    .sort(byTime);
}

export function buildOverlayMarkers(
  overlayRefs: OverlayRefs,
  quotes: Quote[],
  analysis: QuoteAnalysis | null | undefined,
  showAnalysis: boolean,
): Marker[] {
  const {
    trumpPostsRef,
    showTrumpRef,
    nvdVulnsRef,
    showNvdRef,
    otxPulsesRef,
    showOtxRef,
    kevItemsRef,
    showKevRef,
    newsArticlesRef,
    newsAnalysisRef,
    showNewsRef,
  } = overlayRefs;
  return [
    ...(showAnalysis ? buildMarkers(analysis) : []),
    ...(showTrumpRef.current ? buildTrumpMarkers(trumpPostsRef.current, quotes) : []),
    ...(showNvdRef.current ? buildNvdMarkers(nvdVulnsRef.current) : []),
    ...(showOtxRef.current
      ? buildCountMarkers(otxPulsesRef.current as Array<Record<string, unknown>> | undefined, {
          dateField: 'created',
          position: 'belowBar',
          color: '#3b82f6',
          shape: 'circle',
          label: 'OTX',
        })
      : []),
    ...(showKevRef.current
      ? buildCountMarkers(kevItemsRef.current as Array<Record<string, unknown>> | undefined, {
          dateField: 'dateAdded',
          position: 'belowBar',
          color: '#f97316',
          shape: 'arrowDown',
          label: 'KEV',
        })
      : []),
    ...(showNewsRef.current ? buildNewsMarkers(newsArticlesRef.current, newsAnalysisRef.current, quotes) : []),
  ];
}

function parseMarkerTime(timeStr: string): string | null {
  const m = timeStr.match(/(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${String(m[1]).padStart(2, '0')}:${m[2]}`;
}

export function syncIntradayMarkers(
  series: ISeriesApi<SeriesType>,
  actions: Action[],
  selectedEvent: IntradayEvent | null,
  queryDate: string,
  offset: number,
) {
  const t = (iso: string) => DateUtils.toEtChartTime(iso, offset);

  const actionMarkers = actions.map((a) => {
    const isEntry = a.side === 'buy' || a.side === 'short';
    return {
      time: t(a.timestamp),
      position: isEntry ? ('belowBar' as const) : ('aboveBar' as const),
      color: a.side === 'buy' ? '#22c55e' : a.side === 'sell' ? '#ef4444' : a.side === 'short' ? '#f97316' : '#60a5fa',
      shape: isEntry ? ('arrowUp' as const) : ('arrowDown' as const),
      text: fmtMarkerText(a.side, a.value),
    };
  });

  const eventMarkers: {
    time: Time;
    position: 'aboveBar';
    color: string;
    shape: 'circle';
    size: number;
    text: string;
  }[] = [];

  if (selectedEvent) {
    eventMarkers.push({
      time: t(DateUtils.timeToIso(selectedEvent.chart_time, queryDate)),
      position: 'aboveBar',
      color: '#3b82f6',
      shape: 'circle',
      size: 2,
      text: '',
    });
    const srcTime = parseMarkerTime(selectedEvent.source_time);
    const srcDate = selectedEvent.after_hours ? queryDate : selectedEvent.source_date;
    if (srcTime && srcDate === queryDate) {
      const yellowT = t(DateUtils.timeToIso(srcTime, queryDate));
      const blueT = t(DateUtils.timeToIso(selectedEvent.chart_time, queryDate));
      const validOrder = selectedEvent.after_hours || (yellowT as unknown as number) >= (blueT as unknown as number);
      if (validOrder) {
        eventMarkers.push({
          time: yellowT,
          position: 'aboveBar',
          color: '#eab308',
          shape: 'circle',
          size: 2,
          text: '',
        });
      }
    }
  }

  createSeriesMarkers(
    series,
    [...actionMarkers, ...eventMarkers].sort((a, b) => (a.time < b.time ? -1 : 1)),
  );
}
