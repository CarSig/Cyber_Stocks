import { describe, it, expect } from 'vitest';
import { getFormStyle, buildFilingMarkers } from './utils';
import type { SecFileListing } from './api';

// ─── getFormStyle ─────────────────────────────────────────────────────────────

describe('getFormStyle', () => {
  it('returns fallback for undefined form', () => {
    const result = getFormStyle(undefined);
    expect(result.color).toBe('#888');
  });

  it('returns fallback for empty string', () => {
    const result = getFormStyle('');
    expect(result.color).toBe('#888');
    expect(result.label).toBe('');
  });

  it('returns fallback label = form string for unknown forms', () => {
    const result = getFormStyle('UNKNOWN-XYZ');
    expect(result.label).toBe('UNKNOWN-XYZ');
    expect(result.color).toBe('#888');
  });

  it('matches 10-K', () => {
    const result = getFormStyle('10-K');
    expect(result.label).toBe('10-K');
    expect(result.color).not.toBe('#888');
  });

  it('matches 10-K/A as 10-K (prefix match)', () => {
    const result = getFormStyle('10-K/A');
    expect(result.label).toBe('10-K');
  });

  it('matches 10-Q', () => {
    expect(getFormStyle('10-Q').label).toBe('10-Q');
  });

  it('matches 8-K', () => {
    expect(getFormStyle('8-K').label).toBe('8-K');
  });

  it('matches 8-K/A before 8-K (order matters)', () => {
    // 8-K/A pattern must come before 8-K or both match; whichever is first wins
    expect(getFormStyle('8-K/A').label).toBe('8-K/A');
  });

  it('matches Form 4 exactly (not Form 40 or Form 4F)', () => {
    expect(getFormStyle('4').label).toBe('Form 4');
    expect(getFormStyle('40').label).not.toBe('Form 4');
  });

  it('matches SC 13G', () => {
    expect(getFormStyle('SC 13G').label).toBe('SC 13G');
  });

  it('matches SC13G without space', () => {
    expect(getFormStyle('SC13G').label).toBe('SC 13G');
  });

  it('is case-insensitive', () => {
    expect(getFormStyle('10-k').label).toBe('10-K');
    expect(getFormStyle('8-k').label).toBe('8-K');
  });

  it('matches S-1', () => {
    expect(getFormStyle('S-1').label).toBe('S-1');
  });

  it('matches DEF 14A', () => {
    expect(getFormStyle('DEF 14A').label).toBe('DEF 14A');
  });

  it('matches DEF14A without space', () => {
    expect(getFormStyle('DEF14A').label).toBe('DEF 14A');
  });
});

// ─── buildFilingMarkers ───────────────────────────────────────────────────────

describe('buildFilingMarkers', () => {
  it('returns empty array for empty input', () => {
    expect(buildFilingMarkers([])).toEqual([]);
  });

  it('filters out filings without a date', () => {
    const filings: SecFileListing[] = [
      { form: '10-K', date: null } as unknown as SecFileListing,
      { form: '10-Q', date: '2024-01-15' } as SecFileListing,
    ];
    const markers = buildFilingMarkers(filings);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBe('2024-01-15');
  });

  it('sets position to aboveBar and shape to circle for all markers', () => {
    const filings: SecFileListing[] = [{ form: '10-K', date: '2024-01-15' } as SecFileListing];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.position).toBe('aboveBar');
    expect(marker.shape).toBe('circle');
  });

  it('uses form label as marker text', () => {
    const filings: SecFileListing[] = [{ form: '8-K', date: '2024-02-01' } as SecFileListing];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.text).toBe('8-K');
  });

  it('uses color from getFormStyle', () => {
    const filings: SecFileListing[] = [{ form: '10-K', date: '2024-02-01' } as SecFileListing];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.color).toBe(getFormStyle('10-K').color);
  });

  it('sorts markers by date ascending', () => {
    const filings: SecFileListing[] = [
      { form: '8-K', date: '2024-03-01' } as SecFileListing,
      { form: '10-Q', date: '2024-01-01' } as SecFileListing,
      { form: '10-K', date: '2024-02-01' } as SecFileListing,
    ];
    const markers = buildFilingMarkers(filings);
    const times = markers.map((m) => m.time as string);
    expect(times).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
  });

  it('uses fallback color for unknown form types', () => {
    const filings: SecFileListing[] = [{ form: 'UNKNOWN', date: '2024-01-01' } as SecFileListing];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.color).toBe('#888');
  });
});
