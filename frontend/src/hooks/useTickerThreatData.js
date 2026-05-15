import { getNvd, getOtx, getKev } from '@/api/threat-intel.js';
import { useCachedQuery } from './useCachedQuery.js';

const HOUR = 60 * 60 * 1000;

export function useTickerThreatData(companyName) {
  const opts = { ttl: HOUR, enabled: !!companyName };

  const { data: nvdData } = useCachedQuery(
    ['nvd-ticker', companyName],
    () => getNvd({ limit: 500, company: companyName }),
    { ...opts, cacheKey: `nvd_${companyName}` },
  );
  const { data: otxData } = useCachedQuery(
    ['otx-ticker', companyName],
    () => getOtx({ limit: 500, company: companyName }),
    { ...opts, cacheKey: `otx_${companyName}` },
  );
  const { data: kevData } = useCachedQuery(
    ['kev-ticker', companyName],
    () => getKev({ limit: 500, company: companyName }),
    { ...opts, cacheKey: `kev_${companyName}` },
  );

  return { nvdData, otxData, kevData };
}
