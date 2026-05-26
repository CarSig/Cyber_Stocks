import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseYMD, safeOffsetDate, DateUtils } from './date';

// ─── DateUtils.formatDate ─────────────────────────────────────────────────────

describe('DateUtils.formatDate', () => {
  it('returns — for null', () => {
    expect(DateUtils.formatDate(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(DateUtils.formatDate(undefined)).toBe('—');
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = DateUtils.formatDate('2024-06-15T00:00:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });
});

// ─── DateUtils.formatDateTime ─────────────────────────────────────────────────

describe('DateUtils.formatDateTime', () => {
  it('returns — for null', () => {
    expect(DateUtils.formatDateTime(null)).toBe('—');
  });

  it('returns — for undefined', () => {
    expect(DateUtils.formatDateTime(undefined)).toBe('—');
  });

  it('returns a non-empty string for a valid ISO timestamp', () => {
    const result = DateUtils.formatDateTime('2024-06-15T14:30:00Z');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toBe('—');
  });
});

// ─── parseYMD ─────────────────────────────────────────────────────────────────

describe('parseYMD', () => {
  it('parses a standard date string', () => {
    const d = parseYMD('2024-06-15');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(5); // 0-indexed
    expect(d.getDate()).toBe(15);
  });

  it('returns a local Date (not UTC)', () => {
    // parseYMD uses new Date(y, m-1, day) — local time
    const d = parseYMD('2024-01-01');
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });
});

// ─── safeOffsetDate ───────────────────────────────────────────────────────────

describe('safeOffsetDate', () => {
  it('returns null for undefined input', () => {
    expect(safeOffsetDate(undefined, 0)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(safeOffsetDate('', 0)).toBeNull();
  });

  it('returns null for invalid date', () => {
    expect(safeOffsetDate('not-a-date', 0)).toBeNull();
  });

  it('returns same date for zero offset', () => {
    expect(safeOffsetDate('2024-06-15', 0)).toBe('2024-06-15');
  });

  it('adds positive offset (ms)', () => {
    // +1 day = 86400000 ms
    expect(safeOffsetDate('2024-06-15', 86400000)).toBe('2024-06-16');
  });

  it('subtracts negative offset', () => {
    expect(safeOffsetDate('2024-06-15', -86400000)).toBe('2024-06-14');
  });
});

// ─── DateUtils ────────────────────────────────────────────────────────────────

describe('DateUtils.todayStr', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('returns YYYY-MM-DD format', () => {
    expect(DateUtils.todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns today in UTC', () => {
    expect(DateUtils.todayStr()).toBe('2024-06-15');
  });
});

describe('DateUtils.lastWeekday', () => {
  it('returns same day for a weekday (Wednesday)', () => {
    expect(DateUtils.lastWeekday('2024-06-19')).toBe('2024-06-19');
  });

  it('returns Friday for Saturday', () => {
    expect(DateUtils.lastWeekday('2024-06-22')).toBe('2024-06-21');
  });

  it('returns Friday for Sunday', () => {
    expect(DateUtils.lastWeekday('2024-06-23')).toBe('2024-06-21');
  });
});

describe('DateUtils.prevWeekday', () => {
  it('returns previous day for a weekday (Wednesday → Tuesday)', () => {
    expect(DateUtils.prevWeekday('2024-06-19')).toBe('2024-06-18');
  });

  it('skips weekend going back from Monday', () => {
    expect(DateUtils.prevWeekday('2024-06-17')).toBe('2024-06-14'); // Mon → Fri
  });

  it('skips from Saturday back to Friday', () => {
    expect(DateUtils.prevWeekday('2024-06-22')).toBe('2024-06-21');
  });
});

describe('DateUtils.nextWeekday', () => {
  it('returns next day for a weekday (Wednesday → Thursday)', () => {
    expect(DateUtils.nextWeekday('2024-06-19')).toBe('2024-06-20');
  });

  it('skips weekend going forward from Friday', () => {
    expect(DateUtils.nextWeekday('2024-06-21')).toBe('2024-06-24'); // Fri → Mon
  });

  it('skips from Saturday forward to Monday', () => {
    expect(DateUtils.nextWeekday('2024-06-22')).toBe('2024-06-24');
  });
});

describe('DateUtils.snapToWeekday', () => {
  it('returns same day for weekday', () => {
    expect(DateUtils.snapToWeekday('2024-06-19')).toBe('2024-06-19');
  });

  it('snaps Saturday back to Friday', () => {
    expect(DateUtils.snapToWeekday('2024-06-22')).toBe('2024-06-21');
  });

  it('snaps Sunday forward to Monday', () => {
    expect(DateUtils.snapToWeekday('2024-06-23')).toBe('2024-06-24');
  });
});

describe('DateUtils.fmtDateEt', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(DateUtils.fmtDateEt('2024-06-15T14:00:00Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns ET date (UTC-4 in summer), not UTC date', () => {
    // 2024-06-15T03:00:00Z = 2024-06-14T23:00:00 ET (EDT = UTC-4)
    expect(DateUtils.fmtDateEt('2024-06-15T03:00:00Z')).toBe('2024-06-14');
  });
});

describe('DateUtils.fmtTime', () => {
  it('returns HH:MM format', () => {
    expect(DateUtils.fmtTime('2024-06-15T14:30:00Z')).toMatch(/^\d{2}:\d{2}$/);
  });

  it('converts UTC to ET (EDT = UTC-4 in summer)', () => {
    // 14:30 UTC = 10:30 EDT
    expect(DateUtils.fmtTime('2024-06-15T14:30:00Z')).toBe('10:30');
  });
});

describe('DateUtils.timeToIso', () => {
  it('returns empty string when date is empty', () => {
    expect(DateUtils.timeToIso('09:30', '')).toBe('');
  });

  it('returns a valid ISO string', () => {
    const result = DateUtils.timeToIso('09:30', '2024-06-15');
    expect(() => new Date(result).toISOString()).not.toThrow();
    expect(isNaN(new Date(result).getTime())).toBe(false);
  });

  it('produces a UTC timestamp adjusted for ET offset', () => {
    // 09:30 ET on 2024-06-15 (EDT = UTC-4) → 13:30 UTC
    const result = DateUtils.timeToIso('09:30', '2024-06-15');
    expect(result).toContain('13:30');
  });
});

describe('DateUtils.etOffsetSeconds', () => {
  it('returns -18000 (UTC-5) for EST (winter)', () => {
    const winterDate = new Date('2024-01-15T12:00:00Z');
    expect(DateUtils.etOffsetSeconds(winterDate)).toBe(-5 * 3600);
  });

  it('returns -14400 (UTC-4) for EDT (summer)', () => {
    const summerDate = new Date('2024-07-15T12:00:00Z');
    expect(DateUtils.etOffsetSeconds(summerDate)).toBe(-4 * 3600);
  });
});

describe('DateUtils.toEtChartTime', () => {
  it('returns unix seconds shifted by offset', () => {
    const iso = '2024-06-15T13:30:00Z';
    const offset = -4 * 3600;
    const expected = Math.floor(new Date(iso).getTime() / 1000) + offset;
    expect(DateUtils.toEtChartTime(iso, offset)).toBe(expected);
  });
});

describe('DateUtils.unixSecondsToIso', () => {
  it('converts unix seconds to ISO string', () => {
    const ts = Math.floor(new Date('2024-06-15T00:00:00Z').getTime() / 1000);
    expect(DateUtils.unixSecondsToIso(ts)).toBe('2024-06-15T00:00:00.000Z');
  });
});
