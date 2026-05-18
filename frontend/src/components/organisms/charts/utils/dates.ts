export function getTzOffsetSeconds(ianaTimezone: string, referenceDate?: Date): number {
  const ref = referenceDate ?? new Date();
  const fmt = (tz: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(ref);
  const parse = (s: string) => {
    const [date, time] = s.split(', ');
    const [y, mo, d] = date.split('-');
    const [h, mi, se] = time.split(':');
    return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
  };
  return (parse(fmt(ianaTimezone)).getTime() - parse(fmt('UTC')).getTime()) / 1000;
}

export function toTzTime(isoUtc: string, tzOffsetSeconds: number): number {
  return Math.floor(new Date(isoUtc).getTime() / 1000) + tzOffsetSeconds;
}

import { DateUtils } from '@/utils/date';

export function daysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayString(): string {
  return DateUtils.todayStr();
}
