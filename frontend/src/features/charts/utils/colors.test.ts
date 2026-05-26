import { describe, it, expect } from 'vitest';
import { sentimentScoreStyle, sentimentToColor } from './colors';

describe('sentimentScoreStyle', () => {
  it('returns muted/? for null', () => {
    expect(sentimentScoreStyle(null)).toEqual({ color: 'var(--text-muted)', icon: '?' });
  });

  it('returns muted/? for undefined', () => {
    expect(sentimentScoreStyle(undefined)).toEqual({ color: 'var(--text-muted)', icon: '?' });
  });

  it('returns green/▲ for score >= 0.1', () => {
    expect(sentimentScoreStyle(0.1)).toEqual({ color: 'var(--color-green)', icon: '▲' });
    expect(sentimentScoreStyle(1)).toEqual({ color: 'var(--color-green)', icon: '▲' });
  });

  it('returns red/▼ for score <= -0.1', () => {
    expect(sentimentScoreStyle(-0.1)).toEqual({ color: 'var(--color-red)', icon: '▼' });
    expect(sentimentScoreStyle(-1)).toEqual({ color: 'var(--color-red)', icon: '▼' });
  });

  it('returns amber/● for score in (-0.1, 0.1)', () => {
    expect(sentimentScoreStyle(0)).toEqual({ color: 'var(--color-amber)', icon: '●' });
    expect(sentimentScoreStyle(0.09)).toEqual({ color: 'var(--color-amber)', icon: '●' });
    expect(sentimentScoreStyle(-0.09)).toEqual({ color: 'var(--color-amber)', icon: '●' });
  });
});

describe('sentimentToColor', () => {
  it('returns pure red for score = -1', () => {
    expect(sentimentToColor(-1)).toBe('rgb(239,68,68)');
  });

  it('returns pure green for score = 1', () => {
    expect(sentimentToColor(1)).toBe('rgb(34,197,94)');
  });

  it('returns amber for score = 0', () => {
    expect(sentimentToColor(0)).toBe('rgb(234,179,8)');
  });

  it('clamps values below -1 to -1 (red)', () => {
    expect(sentimentToColor(-2)).toBe(sentimentToColor(-1));
  });

  it('clamps values above 1 to 1 (green)', () => {
    expect(sentimentToColor(2)).toBe(sentimentToColor(1));
  });

  it('interpolates between red and amber for score -0.5', () => {
    const color = sentimentToColor(-0.5);
    // At t=0.5 between red=[239,68,68] and amber=[234,179,8]
    expect(color).toBe('rgb(237,124,38)');
  });

  it('interpolates between amber and green for score 0.5', () => {
    const color = sentimentToColor(0.5);
    // At t=0.5 between amber=[234,179,8] and green=[34,197,94]
    expect(color).toBe('rgb(134,188,51)');
  });

  it('returns a valid rgb(...) string', () => {
    expect(sentimentToColor(0.3)).toMatch(/^rgb\(\d+,\d+,\d+\)$/);
  });
});
