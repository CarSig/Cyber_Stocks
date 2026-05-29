import { describe, it, expect } from 'vitest';
import { resolveVolatilityExit, resolveExitLegs, nextWeekday, calcEntryTime } from './intradaySimUtils';

// ─── helpers ──────────────────────────────────────────────────────────────────

type Bar = { t: string; o: number; h: number; l: number; c: number; v: number; vw: number };

function bar(isoUtc: string, c: number, h = c, l = c, v = 1000, vw = c): Bar {
  return { t: isoUtc, o: c, h, l, c, v, vw };
}

/** Build a series of bars starting at 09:30 on `date`, one per minute. */
function makeDayBars(date: string, count: number, close = 100, vol = 1000): Bar[] {
  const bars: Bar[] = [];
  for (let i = 0; i < count; i++) {
    const h = Math.floor((9 * 60 + 30 + i) / 60);
    const m = (9 * 60 + 30 + i) % 60;
    const t = `${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00.000Z`;
    bars.push(bar(t, close, close + 1, close - 1, vol));
  }
  return bars;
}

const ENTRY_DATE = '2024-01-10';
const ENTRY_ISO = `${ENTRY_DATE}T14:30:00.000Z`;

// ─── vol-same-day ─────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-same-day', () => {
  it('exits when price moves >= ATR from entry price', () => {
    const entryBar = bar(ENTRY_ISO, 100, 105, 95); // ATR = 10
    const next = bar(`${ENTRY_DATE}T14:31:00.000Z`, 111, 112, 110); // moves 11 from 100
    const bars = [entryBar, next];
    const result = resolveVolatilityExit('vol-same-day', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(next.t);
  });

  it('falls back to a 15:45 ISO timestamp when no bar reaches threshold', () => {
    const bars = makeDayBars(ENTRY_DATE, 30, 100); // all close at 100 ± 1
    const entryBar = bars.find((b) => b.t === ENTRY_ISO) ?? bars[0];
    entryBar.h = 102;
    entryBar.l = 98; // ATR = 4
    const result = resolveVolatilityExit('vol-same-day', bars, bars[0].t, ENTRY_DATE);
    // Returns a full ISO string corresponding to 15:45 ET on the entry date
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(result).getTime()).toBeGreaterThan(0);
  });

  it('does not exit on bars from a different day', () => {
    const nextDay = nextWeekday(ENTRY_DATE);
    const entryBar = bar(ENTRY_ISO, 100, 110, 90); // ATR = 20
    // Big move but on the next day
    const wrongDay = bar(`${nextDay}T09:30:00.000Z`, 130);
    const bars = [entryBar, wrongDay];
    const result = resolveVolatilityExit('vol-same-day', bars, ENTRY_ISO, ENTRY_DATE);
    // Should fall back, not return the next-day bar
    expect(result).not.toBe(wrongDay.t);
  });
});

// ─── vol-next-day ─────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-next-day', () => {
  it('exits when price moves >= 2% from entry price', () => {
    const entryBar = bar(ENTRY_ISO, 100);
    const nextDayBar = bar(`${nextWeekday(ENTRY_DATE)}T10:00:00.000Z`, 103); // 3% move
    const bars = [entryBar, nextDayBar];
    const result = resolveVolatilityExit('vol-next-day', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(nextDayBar.t);
  });

  it('does not exit for < 2% move', () => {
    const nextDay = nextWeekday(ENTRY_DATE);
    const entryBar = bar(ENTRY_ISO, 100);
    const smallMove = bar(`${nextDay}T10:00:00.000Z`, 101); // 1%
    const lastBar = bar(`${nextDay}T15:59:00.000Z`, 101);
    const bars = [entryBar, smallMove, lastBar];
    const result = resolveVolatilityExit('vol-next-day', bars, ENTRY_ISO, ENTRY_DATE);
    // Falls back to last bar on exit day
    expect(result).toBe(lastBar.t);
  });
});

// ─── vol-hold ────────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-hold', () => {
  it('exits on first bar with >= 2x avg pre-entry volume', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avg vol = 500
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 1001); // > 2 * 500
    const bars = [...preBars, entryBar, spike];
    const result = resolveVolatilityExit('vol-hold', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(spike.t);
  });

  it('falls back to last available bar when no volume spike', () => {
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const postBar = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 600); // < 2x
    const bars = [entryBar, postBar];
    const result = resolveVolatilityExit('vol-hold', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(postBar.t);
  });

  it('requires avgVol > 0 to trigger (no pre-entry bars → no exit on vol)', () => {
    const entryBar = bar(ENTRY_ISO, 100);
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 9999);
    const bars = [entryBar, spike]; // no pre-entry bars → avgVol = 0
    const result = resolveVolatilityExit('vol-hold', bars, ENTRY_ISO, ENTRY_DATE);
    // avgVol = 0, condition `avgVol > 0` is false → falls back
    expect(result).toBe(spike.t);
  });
});

// ─── vol-hold-3x ─────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-hold-3x', () => {
  it('requires 3x avg volume (2x is not enough)', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avg = 500
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const twoX = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 1001); // 2x — not enough
    const threeX = bar(`${ENTRY_DATE}T14:32:00.000Z`, 100, 100, 100, 1501); // 3x
    const bars = [...preBars, entryBar, twoX, threeX];
    const result = resolveVolatilityExit('vol-hold-3x', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(threeX.t);
  });
});

// ─── vol-hold-eod ────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-hold-eod', () => {
  it('only checks the closing bar (15:59) for volume spike', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avg = 500
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    // Intra-day spike — should be ignored (not 15:59)
    const intraSpike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 9999);
    // EOD bar with spike
    const eodBar = bar(`${ENTRY_DATE}T15:59:00.000Z`, 100, 100, 100, 1001);
    const bars = [...preBars, entryBar, intraSpike, eodBar];
    const result = resolveVolatilityExit('vol-hold-eod', bars, ENTRY_ISO, ENTRY_DATE, '1Min');
    expect(result).toBe(eodBar.t);
  });
});

// ─── vol-hold-vwap ───────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-hold-vwap', () => {
  it('exits long when close drops below VWAP', () => {
    // entry price 105 > entry vwap 100 → long direction
    const entryBar = bar(ENTRY_ISO, 105, 106, 104, 1000, 100);
    // post bar: close 98 < vwap 100 → exit
    const crossBar = bar(`${ENTRY_DATE}T14:31:00.000Z`, 98, 99, 97, 1000, 100);
    const bars = [entryBar, crossBar];
    const result = resolveVolatilityExit('vol-hold-vwap', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(crossBar.t);
  });

  it('exits short when close rises above VWAP', () => {
    // entry price 95 < entry vwap 100 → short direction
    const entryBar = bar(ENTRY_ISO, 95, 96, 94, 1000, 100);
    // post bar: close 102 > vwap 100 → exit
    const crossBar = bar(`${ENTRY_DATE}T14:31:00.000Z`, 102, 103, 101, 1000, 100);
    const bars = [entryBar, crossBar];
    const result = resolveVolatilityExit('vol-hold-vwap', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(crossBar.t);
  });

  it('falls back when VWAP never crossed', () => {
    const entryBar = bar(ENTRY_ISO, 105, 106, 104, 1000, 100);
    // Stays above vwap
    const stayBar = bar(`${ENTRY_DATE}T14:31:00.000Z`, 106, 107, 105, 1000, 100);
    const bars = [entryBar, stayBar];
    const result = resolveVolatilityExit('vol-hold-vwap', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(stayBar.t);
  });
});

// ─── vol-hold-confirm ────────────────────────────────────────────────────────

describe('resolveVolatilityExit — vol-hold-confirm', () => {
  it('exits when both 2% price move AND 1.5x volume met on same bar', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avgVol = 500
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    // 3% move + 1.6x volume
    const confirmBar = bar(`${ENTRY_DATE}T14:31:00.000Z`, 103, 104, 102, 800);
    const bars = [...preBars, entryBar, confirmBar];
    const result = resolveVolatilityExit('vol-hold-confirm', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(confirmBar.t);
  });

  it('does not exit when only price condition is met', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500);
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const priceOnly = bar(`${ENTRY_DATE}T14:31:00.000Z`, 103, 104, 102, 600); // < 1.5x vol
    const lastBar = bar(`${ENTRY_DATE}T15:59:00.000Z`, 103);
    const bars = [...preBars, entryBar, priceOnly, lastBar];
    const result = resolveVolatilityExit('vol-hold-confirm', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(lastBar.t);
  });

  it('does not exit when only volume condition is met', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500);
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const volOnly = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 900); // 1% move, > 1.5x vol
    const lastBar = bar(`${ENTRY_DATE}T15:59:00.000Z`, 101);
    const bars = [...preBars, entryBar, volOnly, lastBar];
    const result = resolveVolatilityExit('vol-hold-confirm', bars, ENTRY_ISO, ENTRY_DATE);
    expect(result).toBe(lastBar.t);
  });
});

// ─── edge cases ──────────────────────────────────────────────────────────────

describe('resolveVolatilityExit — edge cases', () => {
  it('returns a valid ISO fallback when entry bar not found in series', () => {
    const bars = makeDayBars(ENTRY_DATE, 10, 100);
    const futureIso = '2099-01-01T14:30:00.000Z';
    const result = resolveVolatilityExit('vol-same-day', bars, futureIso, ENTRY_DATE);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(new Date(result).getTime()).toBeGreaterThan(0);
  });
});

// ─── resolveExitLegs: back-compat ─────────────────────────────────────────────

describe('resolveExitLegs — back-compat with single-exit strategies', () => {
  it('returns one full-close leg equal to resolveVolatilityExit for vol-hold', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500);
    const entryBar = bar(ENTRY_ISO, 100, 100, 100, 500);
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 100, 100, 100, 1001);
    const bars = [...preBars, entryBar, spike];
    const legs = resolveExitLegs('vol-hold', bars, ENTRY_ISO, ENTRY_DATE);
    const single = resolveVolatilityExit('vol-hold', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs).toEqual([{ t: single, fraction: 1 }]);
  });
});

// ─── resolveExitLegs: vol-trail ───────────────────────────────────────────────

describe('resolveExitLegs — vol-trail', () => {
  // Entry bar range 10 (h-l) → with few bars calcATR returns nothing, so ATR=10.
  it('exits long fully on a 2x ATR pullback from the high-water mark', () => {
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 1000, 90); // long (100 >= vwap 90), ATR=10
    const up = bar(`${ENTRY_DATE}T14:31:00.000Z`, 130, 131, 129, 1000, 90); // HWM = 130
    const pull = bar(`${ENTRY_DATE}T14:32:00.000Z`, 109, 110, 108, 1000, 90); // 130-109=21 >= 2*10
    const bars = [entryBar, up, pull];
    const legs = resolveExitLegs('vol-trail', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs).toEqual([{ t: pull.t, fraction: 1 }]);
  });

  it('exits on a 3x average-volume climax bar', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avgVol = 500
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 500, 90); // long, ATR=10
    const climax = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 1600, 90); // 3.2x vol, no big pullback
    const bars = [...preBars, entryBar, climax];
    const legs = resolveExitLegs('vol-trail', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs).toEqual([{ t: climax.t, fraction: 1 }]);
  });

  it('falls back to the last available bar when neither condition triggers', () => {
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 1000, 90); // ATR=10
    const calm = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 1100, 90); // tiny move, < 2x vol
    const bars = [entryBar, calm];
    const legs = resolveExitLegs('vol-trail', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs).toEqual([{ t: calm.t, fraction: 1 }]);
  });
});

// ─── resolveExitLegs: vol-staged ──────────────────────────────────────────────

describe('resolveExitLegs — vol-staged', () => {
  it('scales out 50/25/25 across spike, ATR-target, and pullback bars', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avgVol = 500
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 500, 90); // long, ATR = 10
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 1001, 90); // 2x vol → 50%
    const target = bar(`${ENTRY_DATE}T14:32:00.000Z`, 111, 112, 110, 600, 90); // |111-100|>=10 ATR → 25% ; HWM=111
    const pull = bar(`${ENTRY_DATE}T14:33:00.000Z`, 90, 91, 89, 600, 90); // 111-90=21 >= 2*10 → final 25%
    const bars = [...preBars, entryBar, spike, target, pull];
    const legs = resolveExitLegs('vol-staged', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs).toEqual([
      { t: spike.t, fraction: 0.5 },
      { t: target.t, fraction: 0.25 },
      { t: pull.t, fraction: 0.25 },
    ]);
  });

  it('flushes the remaining position at the time stop when later legs never trigger', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avgVol = 500
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 500, 90); // long, ATR = 10
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 1001, 90); // 50%
    const calm = bar(`${ENTRY_DATE}T14:32:00.000Z`, 102, 103, 101, 600, 90); // no target, no pullback
    const bars = [...preBars, entryBar, spike, calm];
    const legs = resolveExitLegs('vol-staged', bars, ENTRY_ISO, ENTRY_DATE);
    // 50% on the spike, remaining 50% flushed at the last available bar
    expect(legs).toEqual([
      { t: spike.t, fraction: 0.5 },
      { t: calm.t, fraction: 0.5 },
    ]);
    expect(legs.reduce((s, l) => s + l.fraction, 0)).toBeCloseTo(1);
  });

  it('merges fractions when multiple conditions hit the same bar', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500); // avgVol = 500
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 500, 90); // long, ATR = 10
    // One bar that is both a 2x volume spike AND a >=1 ATR move from entry.
    const combo = bar(`${ENTRY_DATE}T14:31:00.000Z`, 111, 112, 110, 1001, 90);
    const lastBar = bar(`${ENTRY_DATE}T15:59:00.000Z`, 111, 112, 110, 600, 90);
    const bars = [...preBars, entryBar, combo, lastBar];
    const legs = resolveExitLegs('vol-staged', bars, ENTRY_ISO, ENTRY_DATE);
    // spike 50% + target 25% merge on the same bar → 75%, remaining 25% at time stop
    expect(legs[0]).toEqual({ t: combo.t, fraction: 0.75 });
    expect(legs.reduce((s, l) => s + l.fraction, 0)).toBeCloseTo(1);
  });

  it('fractions never exceed 100% total', () => {
    const preBars = makeDayBars(ENTRY_DATE, 5, 100, 500);
    const entryBar = bar(ENTRY_ISO, 100, 105, 95, 500, 90);
    const spike = bar(`${ENTRY_DATE}T14:31:00.000Z`, 101, 102, 100, 1001, 90);
    const target = bar(`${ENTRY_DATE}T14:32:00.000Z`, 111, 112, 110, 600, 90);
    const pull = bar(`${ENTRY_DATE}T14:33:00.000Z`, 90, 91, 89, 600, 90);
    const bars = [...preBars, entryBar, spike, target, pull];
    const legs = resolveExitLegs('vol-staged', bars, ENTRY_ISO, ENTRY_DATE);
    expect(legs.reduce((s, l) => s + l.fraction, 0)).toBeLessThanOrEqual(1);
  });
});

// ─── calcEntryTime ────────────────────────────────────────────────────────────

describe('calcEntryTime', () => {
  it('returns event time + delay for a regular market bar', () => {
    // 10:00 + 5 min delay = 10:05
    expect(calcEntryTime('10:00', 5, false)).toBe('10:05');
  });

  it('returns 09:30 for pre-market events regardless of chart time', () => {
    // isPreMarket = true → always clamp to 09:30
    expect(calcEntryTime('07:00', 0, true)).toBe('09:30');
  });

  it('clamps to 15:44 when delay would exceed market close', () => {
    // 15:40 + 10 min = 15:50 → clamp to 15:44
    expect(calcEntryTime('15:40', 10, false)).toBe('15:44');
  });

  it('returns exact time for zero delay', () => {
    expect(calcEntryTime('14:30', 0, false)).toBe('14:30');
  });

  it('pads single-digit hours and minutes', () => {
    // 09:00 + 1 min = 09:01
    expect(calcEntryTime('09:00', 1, false)).toBe('09:01');
  });
});
