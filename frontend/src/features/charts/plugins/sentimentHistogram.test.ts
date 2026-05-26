import { describe, it, expect } from 'vitest';
import { aggregateSentimentByDay } from './sentimentHistogram';
import type { NewsArticle } from '@/types';

const art = (link: string, date: string, sentiment: number): [NewsArticle, number] => [
  { link, providerPublishTime: date, title: 'T', publisher: 'P' } as unknown as NewsArticle,
  sentiment,
];

function buildOpts(pairs: [NewsArticle, number][], quoteBounds?: { from: string; to: string }) {
  const articles = pairs.map(([a]) => a);
  const sentimentMap = new Map(pairs.map(([a, s]) => [a.link, s]));
  return {
    articles,
    getSentiment: (a: NewsArticle) => sentimentMap.get(a.link) ?? null,
    getDate: (a: NewsArticle) => a.providerPublishTime?.toString() ?? null,
    quoteBounds,
  };
}

describe('aggregateSentimentByDay', () => {
  it('returns empty data for no articles', () => {
    const { countData, articlesByDay } = aggregateSentimentByDay(buildOpts([]));
    expect(countData).toEqual([]);
    expect(articlesByDay.size).toBe(0);
  });

  it('skips articles where getDate returns null', () => {
    const article = { link: 'http://x.com/1', title: 'T' } as unknown as NewsArticle;
    const { countData } = aggregateSentimentByDay({
      articles: [article],
      getSentiment: () => 0.5,
      getDate: () => null,
    });
    expect(countData).toEqual([]);
  });

  it('skips articles where getSentiment returns null', () => {
    const [a] = art('http://x.com/1', '2024-01-10', 0);
    const { countData } = aggregateSentimentByDay({
      articles: [a],
      getSentiment: () => null,
      getDate: (ar) => ar.providerPublishTime?.toString() ?? null,
    });
    expect(countData).toEqual([]);
  });

  it('counts articles per day', () => {
    const pairs = [
      art('http://a.com/1', '2024-01-10', 0.5),
      art('http://a.com/2', '2024-01-10', 0.3),
      art('http://a.com/3', '2024-01-11', -0.5),
    ];
    const { countData } = aggregateSentimentByDay(buildOpts(pairs));
    const jan10 = countData.find((d) => d.time === '2024-01-10');
    const jan11 = countData.find((d) => d.time === '2024-01-11');
    expect(jan10?.value).toBe(2);
    expect(jan11?.value).toBe(1);
  });

  it('maps articles to correct days in articlesByDay', () => {
    const pairs = [
      art('http://a.com/1', '2024-01-10', 0.5),
      art('http://a.com/2', '2024-01-11', -0.5),
    ];
    const { articlesByDay } = aggregateSentimentByDay(buildOpts(pairs));
    expect(articlesByDay.get('2024-01-10')).toHaveLength(1);
    expect(articlesByDay.get('2024-01-11')).toHaveLength(1);
  });

  it('fills gaps between quoteBounds dates with transparent zero-value bars', () => {
    const pairs = [art('http://a.com/1', '2024-01-10', 0.5)];
    const { countData } = aggregateSentimentByDay(
      buildOpts(pairs, { from: '2024-01-08', to: '2024-01-12' }),
    );
    // Should have bars for 2024-01-08 through 2024-01-12 (5 days)
    expect(countData).toHaveLength(5);
    const jan08 = countData.find((d) => d.time === '2024-01-08');
    expect(jan08?.value).toBe(0);
    expect(jan08?.color).toBe('transparent');
    const jan10 = countData.find((d) => d.time === '2024-01-10');
    expect(jan10?.value).toBe(1);
    expect(jan10?.color).not.toBe('transparent');
  });

  it('extends range to quoteBounds even when bounds are wider than article dates', () => {
    const pairs = [art('http://a.com/1', '2024-01-15', 0.5)];
    const { countData } = aggregateSentimentByDay(
      buildOpts(pairs, { from: '2024-01-10', to: '2024-01-20' }),
    );
    const times = countData.map((d) => d.time);
    expect(times[0]).toBe('2024-01-10');
    expect(times[times.length - 1]).toBe('2024-01-20');
  });

  it('uses article range when no quoteBounds provided', () => {
    const pairs = [
      art('http://a.com/1', '2024-02-01', 0.5),
      art('http://a.com/2', '2024-02-05', -0.5),
    ];
    const { countData } = aggregateSentimentByDay(buildOpts(pairs));
    const times = countData.map((d) => d.time);
    expect(times[0]).toBe('2024-02-01');
    expect(times[times.length - 1]).toBe('2024-02-05');
  });

  it('positive-average day gets a non-red, non-transparent color', () => {
    const pairs = [art('http://a.com/1', '2024-01-10', 0.8)];
    const { countData } = aggregateSentimentByDay(buildOpts(pairs));
    const day = countData.find((d) => d.time === '2024-01-10');
    expect(day?.color).toMatch(/^rgb\(/);
    // rgb(r,g,b): index 1 is green, which should be high for positive sentiment
    const [, g] = day!.color.match(/\d+/g)!.map(Number);
    expect(g).toBeGreaterThan(100);
  });

  it('negative-average day gets a reddish color', () => {
    const pairs = [art('http://a.com/1', '2024-01-10', -0.9)];
    const { countData } = aggregateSentimentByDay(buildOpts(pairs));
    const day = countData.find((d) => d.time === '2024-01-10');
    // rgb(r,g,b): index 0 is red, index 2 is blue
    const [r, , b] = day!.color.match(/\d+/g)!.map(Number);
    expect(r).toBeGreaterThan(b);
  });

  it('preserves article order within a day in articlesByDay', () => {
    const pairs = [
      art('http://a.com/first', '2024-01-10', 0.5),
      art('http://a.com/second', '2024-01-10', -0.2),
    ];
    const { articlesByDay } = aggregateSentimentByDay(buildOpts(pairs));
    const entries = articlesByDay.get('2024-01-10')!;
    expect(entries[0].article.link).toBe('http://a.com/first');
    expect(entries[1].article.link).toBe('http://a.com/second');
  });
});
