export const DateUtils = {
  formatDate: (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleDateString() : '—'),

  formatDateTime: (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleString() : '—'),

  todayStr(): string {
    return new Date().toISOString().slice(0, 10);
  },

  lastWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    while (d.getUTCDay() === 0 || d.getUTCDay() === 6) {
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return d.toISOString().slice(0, 10);
  },

  prevWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    do { d.setUTCDate(d.getUTCDate() - 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    return d.toISOString().slice(0, 10);
  },

  nextWeekday(dateStr: string): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    do { d.setUTCDate(d.getUTCDate() + 1); } while (d.getUTCDay() === 0 || d.getUTCDay() === 6);
    return d.toISOString().slice(0, 10);
  },

  /** Format an ISO UTC timestamp as HH:MM in US Eastern time. */
  fmtTime(isoUtc: string): string {
    return new Date(isoUtc).toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/New_York',
    });
  },

  /** Convert a HH:MM ET time string + YYYY-MM-DD date to an ISO UTC string. */
  timeToIso(time: string, date: string): string {
    const [h, m] = time.split(':').map(Number);
    return new Date(`${date}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00-05:00`).toISOString();
  },

  /** Compute the ET UTC offset in seconds for a given reference date. Used to shift bar timestamps so lightweight-charts displays ET labels. */
  etOffsetSeconds(referenceDate: Date): number {
    const ET = 'America/New_York';
    const fmt = (tz: string) =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      }).format(referenceDate);
    const parse = (s: string) => {
      const [date, time] = s.split(', ');
      const [y, mo, d] = date.split('-');
      const [h, mi, se] = time.split(':');
      return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +se));
    };
    return (parse(fmt(ET)).getTime() - parse(fmt('UTC')).getTime()) / 1000;
  },

  /** Convert an ISO UTC bar timestamp to a lightweight-charts Time value shifted to ET. */
  toEtChartTime(isoUtc: string, offset: number): import('lightweight-charts').Time {
    return (Math.floor(new Date(isoUtc).getTime() / 1000) + offset) as unknown as import('lightweight-charts').Time;
  },
} as const;
