import { describe, it, expect } from 'vitest';
import { calcEntryDateTime, getExitTime, lastBarTime, detectShortDirection } from './intradaySimUtils';

// ─── calcEntryDateTime ────────────────────────────────────────────────────────

describe('calcEntryDateTime — pre-market', () => {
  it('entry is 15:59 on previous weekday with 1Min timeframe', () => {
    const r = calcEntryDateTime('07:00', '2024-07-24', 0, 'pre-market', '1Min');
    expect(r.entryTime).toBe('15:59');
    expect(r.entryDate).toBe('2024-07-23');
    expect(r.exitDate).toBe('2024-07-24');
  });

  it('entry is 15:55 on previous weekday with 5Min timeframe', () => {
    const r = calcEntryDateTime('07:00', '2024-07-24', 0, 'pre-market', '5Min');
    expect(r.entryTime).toBe('15:55');
  });

  it('entry is 15:00 on previous weekday with 1Hour timeframe', () => {
    const r = calcEntryDateTime('07:00', '2024-07-24', 0, 'pre-market', '1Hour');
    expect(r.entryTime).toBe('15:00');
  });

  it('entry is 15:59 on previous weekday, exit is chart_date (default timeframe)', () => {
    // Wednesday event → entry Tuesday
    const r = calcEntryDateTime('07:00', '2024-07-24', 0, 'pre-market');
    expect(r.entryTime).toBe('15:59');
    expect(r.entryDate).toBe('2024-07-23'); // Tuesday
    expect(r.exitDate).toBe('2024-07-24');  // Wednesday
  });

  it('skips Sunday when stepping back from Monday', () => {
    // Monday event → entry must be Friday (skip Sunday, Saturday)
    const r = calcEntryDateTime('07:00', '2024-07-22', 0, 'pre-market'); // Monday
    expect(r.entryDate).toBe('2024-07-19'); // Friday
    expect(r.exitDate).toBe('2024-07-22');
  });

  it('skips Saturday and Sunday when stepping back from Monday after a long weekend', () => {
    // Same as above — two weekend days skipped
    const r = calcEntryDateTime('06:30', '2024-07-22', 0, 'pre-market');
    expect(r.entryDate).toBe('2024-07-19');
  });

  it('delay is ignored for pre-market', () => {
    const r1 = calcEntryDateTime('07:00', '2024-07-24', 0, 'pre-market');
    const r2 = calcEntryDateTime('07:00', '2024-07-24', 30, 'pre-market');
    expect(r1.entryTime).toBe(r2.entryTime);
    expect(r1.entryDate).toBe(r2.entryDate);
  });

  it('chart_time is ignored for pre-market', () => {
    const r1 = calcEntryDateTime('06:00', '2024-07-24', 0, 'pre-market');
    const r2 = calcEntryDateTime('09:00', '2024-07-24', 0, 'pre-market');
    expect(r1.entryTime).toBe('15:59');
    expect(r2.entryTime).toBe('15:59');
  });
});

describe('calcEntryDateTime — post-market', () => {
  it('entry is 15:59 on event day (prev weekday), exit is chart_date (reaction day) with 1Min', () => {
    // chart_date=2024-07-24 (Wednesday, reaction day); event was Tuesday
    const r = calcEntryDateTime('16:30', '2024-07-24', 0, 'post-market', '1Min');
    expect(r.entryTime).toBe('15:59');
    expect(r.entryDate).toBe('2024-07-23'); // Tuesday — event day close
    expect(r.exitDate).toBe('2024-07-24');  // Wednesday — reaction day
  });

  it('entry is 15:30 on chart_date with 30Min timeframe', () => {
    const r = calcEntryDateTime('16:30', '2024-07-24', 0, 'post-market', '30Min');
    expect(r.entryTime).toBe('15:30');
  });

  it('entry on event day close, exit on chart_date (default timeframe)', () => {
    // chart_date=Wednesday (reaction day); event was Tuesday
    const r = calcEntryDateTime('16:30', '2024-07-24', 0, 'post-market');
    expect(r.entryTime).toBe('15:59');
    expect(r.entryDate).toBe('2024-07-23'); // Tuesday — event day
    expect(r.exitDate).toBe('2024-07-24');  // Wednesday — reaction day
  });

  it('skips weekend: chart_date=Monday → entry Friday (event day)', () => {
    // chart_date=Monday (reaction day); event was Friday after-close
    const r = calcEntryDateTime('17:00', '2024-07-22', 0, 'post-market'); // Monday chart_date
    expect(r.entryDate).toBe('2024-07-19'); // Friday — event day
    expect(r.exitDate).toBe('2024-07-22');  // Monday — reaction day
  });

  it('delay is ignored for post-market', () => {
    const r1 = calcEntryDateTime('17:00', '2024-07-24', 0, 'post-market');
    const r2 = calcEntryDateTime('17:00', '2024-07-24', 60, 'post-market');
    expect(r1.entryTime).toBe(r2.entryTime);
    expect(r1.exitDate).toBe(r2.exitDate);
  });

  it('chart_time is ignored for post-market', () => {
    const r1 = calcEntryDateTime('16:00', '2024-07-24', 0, 'post-market');
    const r2 = calcEntryDateTime('20:00', '2024-07-24', 0, 'post-market');
    expect(r1.entryTime).toBe('15:59');
    expect(r2.entryTime).toBe('15:59');
  });
});

describe('calcEntryDateTime — during', () => {
  it('entry is chart_time + delay, exit same day', () => {
    const r = calcEntryDateTime('10:00', '2024-07-24', 5, 'during');
    expect(r.entryTime).toBe('10:05');
    expect(r.entryDate).toBe('2024-07-24');
    expect(r.exitDate).toBe('2024-07-24');
  });

  it('caps entry at last bar time when delay pushes past close (1Min → 15:59)', () => {
    const r = calcEntryDateTime('15:55', '2024-07-24', 30, 'during', '1Min');
    expect(r.entryTime).toBe('15:59');
  });

  it('caps entry at 15:30 with 30Min timeframe', () => {
    const r = calcEntryDateTime('15:20', '2024-07-24', 30, 'during', '30Min');
    expect(r.entryTime).toBe('15:30');
  });

  it('zero delay returns chart_time unchanged', () => {
    const r = calcEntryDateTime('11:30', '2024-07-24', 0, 'during');
    expect(r.entryTime).toBe('11:30');
  });

  it('pads single-digit minutes correctly', () => {
    const r = calcEntryDateTime('09:30', '2024-07-24', 5, 'during');
    expect(r.entryTime).toBe('09:35');
  });

  it('handles hour rollover from delay', () => {
    const r = calcEntryDateTime('09:55', '2024-07-24', 10, 'during');
    expect(r.entryTime).toBe('10:05');
  });

  it('entry at exactly 15:44 is not capped further', () => {
    const r = calcEntryDateTime('15:44', '2024-07-24', 0, 'during');
    expect(r.entryTime).toBe('15:44');
  });

  it('entry at 15:43 + 1 min delay = 15:44', () => {
    const r = calcEntryDateTime('15:43', '2024-07-24', 1, 'during');
    expect(r.entryTime).toBe('15:44');
  });
});

describe('calcEntryDateTime — weekend boundaries', () => {
  it('pre-market on Tuesday skips nothing', () => {
    const r = calcEntryDateTime('07:00', '2024-07-23', 0, 'pre-market'); // Tuesday
    expect(r.entryDate).toBe('2024-07-22'); // Monday
  });

  it('post-market chart_date=Thursday → entry Wednesday, exit Thursday', () => {
    const r = calcEntryDateTime('17:00', '2024-07-18', 0, 'post-market'); // Thursday chart_date
    expect(r.entryDate).toBe('2024-07-17'); // Wednesday
    expect(r.exitDate).toBe('2024-07-18');  // Thursday
  });

  it('post-market on Saturday chart_date → entry Friday, exit Saturday skipped to Monday (edge case)', () => {
    const r = calcEntryDateTime('17:00', '2024-07-20', 0, 'post-market'); // Saturday chart_date
    expect(r.entryDate).toBe('2024-07-19'); // Friday
    expect(r.exitDate).toBe('2024-07-20');  // Saturday (chart_date as-is)
  });

  it('pre-market on Sunday would go back to Friday (edge case)', () => {
    const r = calcEntryDateTime('07:00', '2024-07-21', 0, 'pre-market'); // Sunday
    expect(r.entryDate).toBe('2024-07-19'); // Friday
  });
});

// ─── lastBarTime ─────────────────────────────────────────────────────────────

describe('lastBarTime', () => {
  it('1Min → 15:59', () => expect(lastBarTime('1Min')).toBe('15:59'));
  it('5Min → 15:55', () => expect(lastBarTime('5Min')).toBe('15:55'));
  it('15Min → 15:45', () => expect(lastBarTime('15Min')).toBe('15:45'));
  it('30Min → 15:30', () => expect(lastBarTime('30Min')).toBe('15:30'));
  it('1Hour → 15:00', () => expect(lastBarTime('1Hour')).toBe('15:00'));
  it('unknown timeframe defaults to 1Min → 15:59', () => expect(lastBarTime('2Min')).toBe('15:59'));
});

// ─── getExitTime ──────────────────────────────────────────────────────────────

describe('getExitTime', () => {
  it('exitAtClose true + 1Min → 15:59', () => expect(getExitTime(true, '1Min')).toBe('15:59'));
  it('exitAtClose true + 5Min → 15:55', () => expect(getExitTime(true, '5Min')).toBe('15:55'));
  it('exitAtClose true + 15Min → 15:45', () => expect(getExitTime(true, '15Min')).toBe('15:45'));
  it('exitAtClose true + 30Min → 15:30', () => expect(getExitTime(true, '30Min')).toBe('15:30'));
  it('exitAtClose true + 1Hour → 15:00', () => expect(getExitTime(true, '1Hour')).toBe('15:00'));
  it('exitAtClose false always → 15:45', () => {
    expect(getExitTime(false, '1Min')).toBe('15:45');
    expect(getExitTime(false, '1Hour')).toBe('15:45');
  });
});

// ─── detectShortDirection ─────────────────────────────────────────────────────

describe('detectShortDirection', () => {
  it('returns true when "<ticker> short" appears', () => {
    expect(detectShortDirection('CRWD', 'CRWD short / S long')).toBe(true);
  });

  it('returns false when "<ticker> long" appears', () => {
    expect(detectShortDirection('CRWD', 'CRWD long play')).toBe(false);
  });

  it('ticker match takes priority over generic short word', () => {
    expect(detectShortDirection('CRWD', 'CRWD long, market short')).toBe(false);
  });

  it('returns true when only "short" appears without "long"', () => {
    expect(detectShortDirection('AAPL', 'bearish short idea')).toBe(true);
  });

  it('returns false when both "short" and "long" appear without ticker prefix', () => {
    expect(detectShortDirection('AAPL', 'short term long play')).toBe(false);
  });

  it('returns false when neither short nor long appears', () => {
    expect(detectShortDirection('AAPL', 'buy the dip')).toBe(false);
  });

  it('is case-insensitive', () => {
    expect(detectShortDirection('CRWD', 'CRWD SHORT position')).toBe(true);
    expect(detectShortDirection('crwd', 'CRWD short position')).toBe(true);
  });

  it('matches ticker with slash notation (primary ticker)', () => {
    // caller is expected to pass the primary ticker already split
    expect(detectShortDirection('CRWD', 'CRWD short / S long')).toBe(true);
  });
});
