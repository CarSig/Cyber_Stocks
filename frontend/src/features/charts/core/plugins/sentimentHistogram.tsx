import { sentimentToColor, sentimentScoreStyle } from '../../utils/colors';
import ModalItem from '@/components/common/ModalItem';
import type { ChartPlugin } from '../types';
import type { NewsArticle } from '@/types';

export type SentimentHistogramDatum = {
  time: `${number}-${number}-${number}`;
  value: number;
  color: string;
};

type ArticleEntry = { article: NewsArticle; sentiment: number | null };

type AggregateOpts = {
  articles: NewsArticle[] | undefined;
  getSentiment: (article: NewsArticle) => number | null;
  getDate: (article: NewsArticle) => string | null;
  quoteBounds?: { from: string; to: string } | null;
};

type AggregateResult = {
  countData: SentimentHistogramDatum[];
  articlesByDay: Map<string, ArticleEntry[]>;
};

/**
 * Build per-day article counts (with sentiment-weighted color) PLUS a map of
 * which articles fall on which day. The histogram data is fed to `ChartAuto`
 * as primary series; the map is used by `sentimentArticlesPlugin` to drive the
 * click modal.
 *
 * Fills gaps between `quoteBounds.from` and `quoteBounds.to` with zero-height
 * transparent bars so the time axis matches other charts on the page.
 */
export function aggregateSentimentByDay({
  articles,
  getSentiment,
  getDate,
  quoteBounds,
}: AggregateOpts): AggregateResult {
  const byDay = new Map<string, { sum: number; count: number }>();
  const articlesByDay = new Map<string, ArticleEntry[]>();

  for (const a of articles ?? []) {
    const dateStr = getDate(a);
    if (!dateStr) continue;
    const day = new Date(dateStr).toISOString().slice(0, 10);
    const sentiment = getSentiment(a);
    if (sentiment === null) continue;
    if (!byDay.has(day)) {
      byDay.set(day, { sum: 0, count: 0 });
      articlesByDay.set(day, []);
    }
    byDay.get(day)!.sum += sentiment;
    byDay.get(day)!.count++;
    articlesByDay.get(day)!.push({ article: a, sentiment });
  }

  const sorted = [...byDay.entries()].sort();
  const countData: SentimentHistogramDatum[] = [];

  const rangeFrom =
    quoteBounds?.from && (!sorted.length || quoteBounds.from < sorted[0][0]) ? quoteBounds.from : sorted[0]?.[0];
  const rangeTo =
    quoteBounds?.to && (!sorted.length || quoteBounds.to > sorted[sorted.length - 1]?.[0])
      ? quoteBounds.to
      : sorted[sorted.length - 1]?.[0];

  if (!rangeFrom) return { countData, articlesByDay };

  const cursor = new Date(rangeFrom);
  const end = new Date(rangeTo!);
  while (cursor <= end) {
    const time = cursor.toISOString().slice(0, 10) as SentimentHistogramDatum['time'];
    const d = byDay.get(time);
    countData.push(
      d ? { time, value: d.count, color: sentimentToColor(d.sum / d.count) } : { time, value: 0, color: 'transparent' },
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return { countData, articlesByDay };
}

type SentimentArticlesPluginOpts = {
  articlesByDay: Map<string, ArticleEntry[]>;
  /** Optional id override. Default: 'sentiment-articles'. */
  id?: string;
};

/**
 * Click-handler-only plugin for sentiment histograms. The histogram data
 * itself lives on the chart's primary series (passed as `data` to ChartAuto).
 * This plugin attaches `onMarkerClick` so clicking a bar opens a modal listing
 * the articles for that day.
 */
export function sentimentArticlesPlugin({
  articlesByDay,
  id = 'sentiment-articles',
}: SentimentArticlesPluginOpts): ChartPlugin {
  // version key so the plugin remounts if articles change for the same id
  const version = `${articlesByDay.size}|${[...articlesByDay.keys()].slice(0, 1).join('')}|${[...articlesByDay.keys()].slice(-1).join('')}`;
  return {
    id,
    // No label — this plugin has no toggle UI; it's a behavior-only plugin.
    version,
    mount: () => ({ unmount: () => undefined }),
    onMarkerClick: ({ date }) => {
      const items = articlesByDay.get(date);
      if (!items?.length) return null;
      return {
        title: date,
        body: items.map(({ article: a, sentiment }) => {
          const { color, icon } = sentimentScoreStyle(sentiment);
          return (
            <ModalItem
              key={a.link}
              href={a.link || undefined}
              icon={icon}
              iconColor={color}
              title={a.title}
              subtitle={a.publisher}
            />
          );
        }),
      };
    },
  };
}
