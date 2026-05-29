import { describe, it, expect } from 'vitest';
import { getFormStyle, buildFilingMarkers, volumeSpikePct } from './utils';
import type { SecFileListing } from './api';
import type { FilingMetadata } from '@algo/shared';

function makeListing(overrides: Partial<FilingMetadata> & { accession?: string; files?: string[] }): SecFileListing {
  const { accession = 'test-acc', files = [], ...metaFields } = overrides;
  const meta: FilingMetadata = {
    accession,
    cik: '0001234567',
    form: '8-K',
    filingDate: '',
    primaryDocument: '',
    isXBRL: false,
    isInlineXBRL: false,
    size: 0,
    ...metaFields,
  };
  return { accession, files, meta };
}

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
      makeListing({ form: '10-K', filingDate: '' }),
      makeListing({ form: '10-Q', filingDate: '2024-01-15' }),
    ];
    const markers = buildFilingMarkers(filings);
    expect(markers).toHaveLength(1);
    expect(markers[0].time).toBe('2024-01-15');
  });

  it('sets position to aboveBar and shape to circle for all markers', () => {
    const filings = [makeListing({ form: '10-K', filingDate: '2024-01-15' })];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.position).toBe('aboveBar');
    expect(marker.shape).toBe('circle');
  });

  it('uses form label as marker text', () => {
    const filings = [makeListing({ form: '8-K', filingDate: '2024-02-01' })];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.text).toBe('8-K');
  });

  it('uses color from getFormStyle', () => {
    const filings = [makeListing({ form: '10-K', filingDate: '2024-02-01' })];
    const [marker] = buildFilingMarkers(filings);
    expect(marker.color).toBe(getFormStyle('10-K').color);
  });

  it('sorts markers by date ascending', () => {
    const filings = [
      makeListing({ form: '8-K', filingDate: '2024-03-01' }),
      makeListing({ form: '10-Q', filingDate: '2024-01-01' }),
      makeListing({ form: '10-K', filingDate: '2024-02-01' }),
    ];
    const markers = buildFilingMarkers(filings);
    const times = markers.map((m) => m.time as string);
    expect(times).toEqual(['2024-01-01', '2024-02-01', '2024-03-01']);
  });

  it('uses fallback color for unknown form types', () => {
    const filings: SecFileListing[] = [{ accession: 'x', files: [], meta: undefined }];
    const [marker] = buildFilingMarkers(filings);
    expect(marker).toBeUndefined();
  });

  it('collapses same-day same-form filings into one "N× LABEL" marker', () => {
    const filings = [
      makeListing({ accession: 'a', form: '8-K', filingDate: '2024-05-01' }),
      makeListing({ accession: 'b', form: '8-K', filingDate: '2024-05-01' }),
      makeListing({ accession: 'c', form: '8-K', filingDate: '2024-05-01' }),
    ];
    const markers = buildFilingMarkers(filings);
    expect(markers).toHaveLength(1);
    expect(markers[0].text).toBe('3× 8-K');
  });

  it('keeps different form types on the same day as separate markers', () => {
    const filings = [
      makeListing({ accession: 'a', form: '8-K', filingDate: '2024-05-01' }),
      makeListing({ accession: 'b', form: '10-Q', filingDate: '2024-05-01' }),
    ];
    const markers = buildFilingMarkers(filings);
    expect(markers).toHaveLength(2);
    expect(markers.map((m) => m.text).sort()).toEqual(['10-Q', '8-K']);
  });

  it('omits the count prefix for a single filing', () => {
    const filings = [makeListing({ form: '8-K', filingDate: '2024-05-01' })];
    expect(buildFilingMarkers(filings)[0].text).toBe('8-K');
  });
});

// ─── volumeSpikePct ───────────────────────────────────────────────────────────

describe('volumeSpikePct', () => {
  it('returns 0 when filing-day volume equals the prior average', () => {
    expect(volumeSpikePct(100, [100, 100, 100])).toBe(0);
  });

  it('returns positive % when filing-day volume is above the prior average', () => {
    // day 200 vs avg 100 → +100%
    expect(volumeSpikePct(200, [100, 100, 100])).toBe(100);
  });

  it('returns negative % when filing-day volume is below the prior average', () => {
    expect(volumeSpikePct(50, [100, 100])).toBe(-50);
  });

  // Regression: pg returns bigint `volume` as a STRING. Raw arithmetic on the
  // strings concatenated instead of summing, collapsing the ratio to ~ -100%.
  it('coerces string volumes (pg bigint) instead of concatenating them', () => {
    // Strings that, if concatenated, would blow up the average toward Infinity
    // and drive the result to ~ -100%. Numeric mean of these is 1_500_000.
    const prior = ['1000000', '2000000', '1500000'];
    expect(volumeSpikePct('1500000', prior)).toBeCloseTo(0, 5);
  });

  it('matches numeric and string inputs', () => {
    expect(volumeSpikePct('300', ['100', '100', '100'])).toBe(volumeSpikePct(300, [100, 100, 100]));
  });

  it('returns null when there are no prior volumes', () => {
    expect(volumeSpikePct(100, [])).toBeNull();
    expect(volumeSpikePct(100, [null, undefined])).toBeNull();
  });

  it('returns null when filing-day volume is missing or non-numeric', () => {
    expect(volumeSpikePct(null, [100, 100])).toBeNull();
    expect(volumeSpikePct(undefined, [100, 100])).toBeNull();
  });

  it('returns null when the prior average is zero', () => {
    expect(volumeSpikePct(100, [0, 0])).toBeNull();
  });
});
