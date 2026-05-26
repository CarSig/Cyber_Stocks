import { describe, it, expect, vi } from 'vitest';
import {
  dedupeMarkers,
  buildMarkers,
  buildCountMarkers,
  buildNvdMarkers,
  buildTrumpMarkers,
  buildNewsMarkers,
  SENTIMENT_COLORS,
  NVD_SEVERITY_COLORS,
} from './markers';
import type { ThreatIntelItem, TrumpPost, NewsArticle, Quote } from '@/types';

// ─── helpers ─────────────────────────────────────────────────────────────────

const q = (date: string): Quote => ({ date, open: 100, high: 105, low: 95, close: 100 }) as Quote;

// mock cssVar to return something deterministic in jsdom
vi.mock('./theme', () => ({ cssVar: (v: string) => v }));

// ─── dedupeMarkers ────────────────────────────────────────────────────────────

describe('dedupeMarkers', () => {
  it('returns empty for empty input', () => {
    expect(dedupeMarkers([])).toEqual([]);
  });

  it('keeps unique markers unchanged', () => {
    const markers = [
      { time: '2024-01-01', position: 'aboveBar' as const, color: '#fff', shape: 'circle' as const, text: '' },
      { time: '2024-01-02', position: 'aboveBar' as const, color: '#fff', shape: 'circle' as const, text: '' },
    ];
    expect(dedupeMarkers(markers)).toHaveLength(2);
  });

  it('deduplicates markers with identical time|position|color keys', () => {
    const m = { time: '2024-01-01', position: 'aboveBar' as const, color: '#fff', shape: 'circle' as const, text: 'A' };
    expect(dedupeMarkers([m, { ...m, text: 'B' }])).toHaveLength(1);
  });

  it('keeps markers that share time but differ in position', () => {
    const base = { time: '2024-01-01', color: '#fff', shape: 'circle' as const, text: '' };
    const above = { ...base, position: 'aboveBar' as const };
    const below = { ...base, position: 'belowBar' as const };
    expect(dedupeMarkers([above, below])).toHaveLength(2);
  });
});

// ─── buildMarkers ─────────────────────────────────────────────────────────────

describe('buildMarkers', () => {
  it('returns empty array for null/undefined analysis', () => {
    expect(buildMarkers(null)).toEqual([]);
    expect(buildMarkers(undefined)).toEqual([]);
  });

  it('builds up to 3 markers from a full analysis', () => {
    const analysis = {
      biggestSameDayDiff: { open: 90, close: 110, date: '2024-03-01', difference: '+22%' },
      biggestNextDayDiff: [
        { open: 95, close: 105, date: '2024-01-10' },
        { open: 80, close: 100, date: '2024-01-11' },
        '+10%',
      ] as [{ open: number; close: number; date: string }, { open: number; close: number; date: string }, string],
    };
    const markers = buildMarkers(analysis);
    expect(markers).toHaveLength(3);
  });

  it('omits markers when dates are missing', () => {
    const analysis = {
      biggestSameDayDiff: { open: 90, close: 110, date: '', difference: '+10%' },
      biggestNextDayDiff: [
        { open: 95, close: 105, date: '' },
        { open: 80, close: 100, date: '' },
        '+5%',
      ] as [{ open: number; close: number; date: string }, { open: number; close: number; date: string }, string],
    };
    expect(buildMarkers(analysis)).toHaveLength(0);
  });

  it('swing marker uses aboveBar, move markers use belowBar', () => {
    const analysis = {
      biggestSameDayDiff: { open: 90, close: 110, date: '2024-01-05', difference: '+10%' },
      biggestNextDayDiff: [
        { open: 95, close: 105, date: '2024-01-10' },
        { open: 80, close: 100, date: '2024-01-11' },
        '+5%',
      ] as [{ open: number; close: number; date: string }, { open: number; close: number; date: string }, string],
    };
    const markers = buildMarkers(analysis);
    const swing = markers.find((m) => m.text.startsWith('Swing'));
    expect(swing?.position).toBe('aboveBar');
    const moves = markers.filter((m) => m.text.startsWith('Move'));
    moves.forEach((m) => expect(m.position).toBe('belowBar'));
  });

  it('sorts markers by time ascending', () => {
    const analysis = {
      biggestSameDayDiff: { open: 90, close: 110, date: '2024-03-15', difference: '+5%' },
      biggestNextDayDiff: [
        { open: 95, close: 105, date: '2024-01-10' },
        { open: 80, close: 100, date: '2024-01-11' },
        '+5%',
      ] as [{ open: number; close: number; date: string }, { open: number; close: number; date: string }, string],
    };
    const markers = buildMarkers(analysis);
    const times = markers.map((m) => m.time as string);
    expect(times).toEqual([...times].sort());
  });
});

// ─── buildCountMarkers ───────────────────────────────────────────────────────

describe('buildCountMarkers', () => {
  const opts = { dateField: 'created', position: 'belowBar' as const, color: '#3b82f6', shape: 'circle' as const, label: 'OTX' };

  it('returns empty for null/undefined/empty input', () => {
    expect(buildCountMarkers(null, opts)).toEqual([]);
    expect(buildCountMarkers(undefined, opts)).toEqual([]);
    expect(buildCountMarkers([], opts)).toEqual([]);
  });

  it('counts items per day and builds one marker per day', () => {
    const items = [
      { created: '2024-01-10T08:00:00Z' },
      { created: '2024-01-10T10:00:00Z' },
      { created: '2024-01-11T09:00:00Z' },
    ];
    const markers = buildCountMarkers(items, opts);
    expect(markers).toHaveLength(2);
    const jan10 = markers.find((m) => m.time === '2024-01-10');
    expect(jan10?.text).toBe('OTX ×2');
    const jan11 = markers.find((m) => m.time === '2024-01-11');
    expect(jan11?.text).toBe('OTX ×1');
  });

  it('skips items with missing dateField', () => {
    const items = [{ created: undefined }, { created: '2024-02-01T00:00:00Z' }];
    const markers = buildCountMarkers(items, opts);
    expect(markers).toHaveLength(1);
  });

  it('sorts markers by time ascending', () => {
    const items = [{ created: '2024-03-01' }, { created: '2024-01-01' }];
    const markers = buildCountMarkers(items, opts);
    expect(markers[0].time).toBe('2024-01-01');
    expect(markers[1].time).toBe('2024-03-01');
  });
});

// ─── buildNvdMarkers ─────────────────────────────────────────────────────────

describe('buildNvdMarkers', () => {
  it('returns empty for null/undefined/empty', () => {
    expect(buildNvdMarkers(null)).toEqual([]);
    expect(buildNvdMarkers(undefined)).toEqual([]);
    expect(buildNvdMarkers([])).toEqual([]);
  });

  it('groups by day and keeps highest-priority severity', () => {
    const vulns: ThreatIntelItem[] = [
      { severity: 'LOW', published: '2024-01-01' } as ThreatIntelItem & { published: string },
      { severity: 'CRITICAL', published: '2024-01-01' } as ThreatIntelItem & { published: string },
    ];
    const markers = buildNvdMarkers(vulns);
    expect(markers).toHaveLength(1);
    expect(markers[0].color).toBe(NVD_SEVERITY_COLORS['CRITICAL']);
    expect(markers[0].text).toBe('CRITICAL ×2');
  });

  it('shows count only when > 1', () => {
    const vulns: ThreatIntelItem[] = [
      { severity: 'HIGH', published: '2024-02-01' } as ThreatIntelItem & { published: string },
    ];
    const markers = buildNvdMarkers(vulns);
    expect(markers[0].text).toBe('HIGH');
  });

  it('uses UNKNOWN color for missing severity', () => {
    const vulns: ThreatIntelItem[] = [
      { published: '2024-02-10' } as ThreatIntelItem & { published: string },
    ];
    const markers = buildNvdMarkers(vulns);
    expect(markers[0].color).toBe(NVD_SEVERITY_COLORS['UNKNOWN']);
  });

  it('skips items with no published date', () => {
    const vulns: ThreatIntelItem[] = [{ severity: 'HIGH' } as ThreatIntelItem];
    expect(buildNvdMarkers(vulns)).toEqual([]);
  });

  it('sorts by time ascending', () => {
    const vulns: ThreatIntelItem[] = [
      { severity: 'HIGH', published: '2024-03-01' } as ThreatIntelItem & { published: string },
      { severity: 'HIGH', published: '2024-01-01' } as ThreatIntelItem & { published: string },
    ];
    const markers = buildNvdMarkers(vulns);
    expect(markers[0].time).toBe('2024-01-01');
    expect(markers[1].time).toBe('2024-03-01');
  });
});

// ─── buildTrumpMarkers ───────────────────────────────────────────────────────

describe('buildTrumpMarkers', () => {
  const quotes: Quote[] = [q('2024-01-05'), q('2024-01-10'), q('2024-01-15')];

  it('returns empty for null/undefined/empty posts', () => {
    expect(buildTrumpMarkers(null, quotes)).toEqual([]);
    expect(buildTrumpMarkers(undefined, quotes)).toEqual([]);
    expect(buildTrumpMarkers([], quotes)).toEqual([]);
  });

  it('filters posts earlier than the earliest quote date', () => {
    const posts: TrumpPost[] = [
      { id: '1', created_at: '2024-01-01', content: 'old', sentiment: 'positive' },
    ];
    // earliest quote date is 2024-01-05, so 2024-01-01 post is filtered
    expect(buildTrumpMarkers(posts, quotes)).toEqual([]);
  });

  it('builds one marker per day using first post sentiment', () => {
    const posts: TrumpPost[] = [
      { id: '1', created_at: '2024-01-10', content: 'good', sentiment: 'positive' },
      { id: '2', created_at: '2024-01-10', content: 'also good', sentiment: 'negative' },
    ];
    const markers = buildTrumpMarkers(posts, quotes);
    expect(markers).toHaveLength(1);
    expect(markers[0].color).toBe(SENTIMENT_COLORS['positive']);
  });

  it('uses neutral color as fallback for unknown sentiment', () => {
    const posts: TrumpPost[] = [
      { id: '1', created_at: '2024-01-10', content: 'hmm', sentiment: 'weird' },
    ];
    const markers = buildTrumpMarkers(posts, quotes);
    expect(markers[0].color).toBe('#eab308');
  });

  it('all markers use aboveBar position', () => {
    const posts: TrumpPost[] = [
      { id: '1', created_at: '2024-01-10', content: 'x', sentiment: 'positive' },
    ];
    const markers = buildTrumpMarkers(posts, quotes);
    markers.forEach((m) => expect(m.position).toBe('aboveBar'));
  });
});

// ─── buildNewsMarkers ────────────────────────────────────────────────────────

describe('buildNewsMarkers', () => {
  const quotes: Quote[] = [q('2024-01-10'), q('2024-01-11'), q('2024-01-12')];

  const article = (link: string, time: number, sentiment: number): [NewsArticle, Record<string, { sentiment: number }>] => [
    { link, providerPublishTime: time, title: 'T', publisher: 'P' } as NewsArticle,
    { [link]: { sentiment } },
  ];

  it('returns empty for null/undefined/empty articles', () => {
    expect(buildNewsMarkers(null, null, quotes)).toEqual([]);
    expect(buildNewsMarkers([], {}, quotes)).toEqual([]);
  });

  it('skips articles with no analysis (sentiment=null)', () => {
    const arts: NewsArticle[] = [{ link: 'http://x.com/1', providerPublishTime: 1704844800 } as NewsArticle];
    expect(buildNewsMarkers(arts, {}, quotes)).toEqual([]);
  });

  it('deduplicates articles by link', () => {
    const ts = Math.floor(new Date('2024-01-10T12:00:00Z').getTime() / 1000);
    const [art1, ana1] = article('http://x.com/a', ts, 0.5);
    // same link submitted twice
    const markers = buildNewsMarkers([art1, art1], ana1, quotes);
    const pos = markers.filter((m) => m.position === 'aboveBar' && m.shape === 'arrowUp');
    expect(pos).toHaveLength(1);
    expect(pos[0].text).toBe('1');
  });

  it('emits aboveBar arrowUp for positive articles', () => {
    const ts = Math.floor(new Date('2024-01-10T12:00:00Z').getTime() / 1000);
    const [art, ana] = article('http://x.com/pos', ts, 0.5);
    const markers = buildNewsMarkers([art], ana, quotes);
    expect(markers.some((m) => m.shape === 'arrowUp' && m.color === '#22c55e')).toBe(true);
  });

  it('emits belowBar arrowDown for negative articles', () => {
    const ts = Math.floor(new Date('2024-01-10T12:00:00Z').getTime() / 1000);
    const [art, ana] = article('http://x.com/neg', ts, -0.5);
    const markers = buildNewsMarkers([art], ana, quotes);
    expect(markers.some((m) => m.shape === 'arrowDown' && m.color === '#ef4444')).toBe(true);
  });

  it('emits circle for neutral articles', () => {
    const ts = Math.floor(new Date('2024-01-10T12:00:00Z').getTime() / 1000);
    const [art, ana] = article('http://x.com/neu', ts, 0);
    const markers = buildNewsMarkers([art], ana, quotes);
    expect(markers.some((m) => m.shape === 'circle' && m.color === '#eab308')).toBe(true);
  });

  it('snaps non-trading-day articles to next trading day and appends *', () => {
    // 2024-01-13 is Saturday — next trading day in quotes is 2024-01-15 (not in our small set, so snapped to closest)
    // Use a weekend date, quotes only have Mon-Wed
    const satTs = Math.floor(new Date('2024-01-06T12:00:00Z').getTime() / 1000); // Saturday
    const [art, ana] = article('http://x.com/sat', satTs, 0.5);
    const markers = buildNewsMarkers([art], ana, quotes);
    // Should be snapped to 2024-01-10 (first trading day in quotes after 2024-01-06)
    const pos = markers.find((m) => m.shape === 'arrowUp');
    expect(pos?.time).toBe('2024-01-10');
    expect(pos?.text).toContain('*');
  });
});
