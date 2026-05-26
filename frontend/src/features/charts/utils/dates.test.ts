import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getTzOffsetSeconds, toTzTime, daysAgoString } from './dates';

describe('getTzOffsetSeconds', () => {
  it('returns 0 for UTC', () => {
    expect(getTzOffsetSeconds('UTC')).toBe(0);
  });

  it('returns a positive offset for timezones east of UTC', () => {
    // Tokyo (Asia/Tokyo) is UTC+9, so offset is +9*3600 = 32400
    const offset = getTzOffsetSeconds('Asia/Tokyo');
    expect(offset).toBe(9 * 3600);
  });

  it('returns a negative offset for timezones west of UTC (outside DST)', () => {
    // During UTC reference date in winter, US/Eastern = UTC-5
    const winterDate = new Date('2024-01-15T12:00:00Z');
    const offset = getTzOffsetSeconds('America/New_York', winterDate);
    expect(offset).toBe(-5 * 3600);
  });

  it('accounts for DST (US/Eastern = UTC-4 in summer)', () => {
    const summerDate = new Date('2024-07-15T12:00:00Z');
    const offset = getTzOffsetSeconds('America/New_York', summerDate);
    expect(offset).toBe(-4 * 3600);
  });
});

describe('toTzTime', () => {
  it('converts ISO UTC string to unix timestamp adjusted by offset', () => {
    const iso = '2024-01-15T12:00:00Z';
    const utcSeconds = Math.floor(new Date(iso).getTime() / 1000);
    const offset = 3600; // +1h
    expect(toTzTime(iso, offset)).toBe(utcSeconds + 3600);
  });

  it('returns unix seconds with zero offset unchanged', () => {
    const iso = '2024-06-01T00:00:00Z';
    const expected = Math.floor(new Date(iso).getTime() / 1000);
    expect(toTzTime(iso, 0)).toBe(expected);
  });

  it('handles negative offsets', () => {
    const iso = '2024-01-15T12:00:00Z';
    const utcSeconds = Math.floor(new Date(iso).getTime() / 1000);
    expect(toTzTime(iso, -5 * 3600)).toBe(utcSeconds - 5 * 3600);
  });
});

describe('daysAgoString', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns today for 0 days ago', () => {
    expect(daysAgoString(0)).toBe('2024-06-15');
  });

  it('returns correct date for 30 days ago', () => {
    expect(daysAgoString(30)).toBe('2024-05-16');
  });

  it('returns correct date for 365 days ago', () => {
    // 2024 is a leap year: 365 days before 2024-06-15 lands on 2023-06-16
    expect(daysAgoString(365)).toBe('2023-06-16');
  });

  it('returns a YYYY-MM-DD formatted string', () => {
    expect(daysAgoString(10)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
