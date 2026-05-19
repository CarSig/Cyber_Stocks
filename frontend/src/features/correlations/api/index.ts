import { apiFetch, qs } from '@/api/core';
import type { CorrelationResult, CorrelationMatrixData } from '@algo/shared';

export function getCorrelationMatrix(
  opts: {
    lagDays?: number;
    windowDays?: number;
    startDate?: string;
    endDate?: string;
  } = {},
): Promise<CorrelationMatrixData> {
  const { lagDays = 0, windowDays = 90, startDate, endDate } = opts;
  return apiFetch<CorrelationMatrixData>(
    `/stocks/correlation-matrix${qs({ lagDays, windowDays, startDate, endDate })}`,
  );
}

export function getCorrelation(
  tickerA: string,
  tickerB: string,
  windowDays?: number,
  lagDays?: number,
): Promise<CorrelationResult> {
  return apiFetch<CorrelationResult>(`/stocks/correlate/${tickerA}/${tickerB}${qs({ windowDays, lagDays })}`);
}
