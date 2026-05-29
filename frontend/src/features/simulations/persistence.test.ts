import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { load, save, clear } from './persistence';

beforeEach(() => {
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('persistence', () => {
  it('save then load round-trips the value', () => {
    save('intraday', 'event', 'CRWD', { textValue: '2024-01-10\n09:30, 100' });
    const result = load('intraday', 'event', 'CRWD');
    expect(result).toEqual({ textValue: '2024-01-10\n09:30, 100' });
  });

  it('load returns null when no entry exists', () => {
    expect(load('intraday', 'daytrade', 'AAPL')).toBeNull();
  });

  it('load returns null and does not throw when JSON is corrupt', () => {
    sessionStorage.setItem('sim:v1:intraday:event:CRWD', 'NOT JSON{{{');
    expect(() => load('intraday', 'event', 'CRWD')).not.toThrow();
    expect(load('intraday', 'event', 'CRWD')).toBeNull();
  });

  it('save silently no-ops when sessionStorage throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    expect(() => save('intraday', 'event', 'CRWD', { textValue: 'x' })).not.toThrow();
  });

  it('different kinds, modes, and tickers are isolated', () => {
    save('intraday', 'event', 'CRWD', { textValue: 'intraday-event-crwd' });
    save('intraday', 'daytrade', 'CRWD', { textValue: 'intraday-daytrade-crwd' });
    save('long', 'default', 'CRWD', { textValue: 'long-default-crwd' });
    save('intraday', 'event', 'PANW', { textValue: 'intraday-event-panw' });

    expect(load('intraday', 'event', 'CRWD')).toEqual({ textValue: 'intraday-event-crwd' });
    expect(load('intraday', 'daytrade', 'CRWD')).toEqual({ textValue: 'intraday-daytrade-crwd' });
    expect(load('long', 'default', 'CRWD')).toEqual({ textValue: 'long-default-crwd' });
    expect(load('intraday', 'event', 'PANW')).toEqual({ textValue: 'intraday-event-panw' });
  });

  it('clear removes the stored entry', () => {
    save('intraday', 'event', 'CRWD', { textValue: 'hello' });
    clear('intraday', 'event', 'CRWD');
    expect(load('intraday', 'event', 'CRWD')).toBeNull();
  });
});
