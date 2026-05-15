import { useState } from 'react';
import { getCorrelation } from '@/api/threat-intel';
import { useCorrelationQuery } from './useCorrelationQuery';

export function useThreatIntel(ticker: string) {
  const [lagDays, setLagDays] = useState(1);

  const nvd = useCorrelationQuery(
    ['threat-intel-correlate', 'nvd', ticker, lagDays],
    () => getCorrelation('nvd', ticker, lagDays),
    !!ticker,
  );
  const kev = useCorrelationQuery(
    ['threat-intel-correlate', 'kev', ticker, lagDays],
    () => getCorrelation('kev', ticker, lagDays),
    !!ticker,
  );
  const otx = useCorrelationQuery(
    ['threat-intel-correlate', 'otx', ticker, lagDays],
    () => getCorrelation('otx', ticker, lagDays),
    !!ticker,
  );

  return { nvd, kev, otx, lagDays, setLagDays };
}
