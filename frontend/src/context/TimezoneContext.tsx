import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { getTzOffsetSeconds, toTzTime } from '@/components/organisms/charts/utils/dates';
import type { Time } from 'lightweight-charts';

type TimezoneContextValue = {
  timezone: string;
  setTimezone: (tz: string) => void;
  /** Format an ISO UTC timestamp as HH:MM in the selected timezone. */
  fmtTime: (isoUtc: string) => string;
  /** Convert an ISO UTC bar timestamp to a lightweight-charts Time value shifted to the selected timezone. */
  toChartTime: (isoUtc: string, referenceDate?: Date) => Time;
};

const TimezoneContext = createContext<TimezoneContextValue | null>(null);

const DEFAULT_TZ = 'America/New_York';

export function TimezoneProvider({ children }: { children: ReactNode }) {
  const [timezone, setTimezoneState] = useState<string>(
    () => localStorage.getItem('timezone') ?? DEFAULT_TZ,
  );

  function setTimezone(tz: string) {
    localStorage.setItem('timezone', tz);
    setTimezoneState(tz);
  }

  function fmtTime(isoUtc: string): string {
    return new Date(isoUtc).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    });
  }

  function toChartTime(isoUtc: string, referenceDate?: Date): Time {
    const offset = getTzOffsetSeconds(timezone, referenceDate ?? new Date(isoUtc));
    return toTzTime(isoUtc, offset) as unknown as Time;
  }

  return (
    <TimezoneContext.Provider value={{ timezone, setTimezone, fmtTime, toChartTime }}>
      {children}
    </TimezoneContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTimezone(): TimezoneContextValue {
  const ctx = useContext(TimezoneContext);
  if (!ctx) throw new Error('useTimezone must be used inside TimezoneProvider');
  return ctx;
}
