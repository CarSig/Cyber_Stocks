import { useQuery } from '@tanstack/react-query';
import StateHandler from '@/components/common/StateHandler';
import ThreatIntelCard from '@/features/threat-intel/components/ThreatIntelCard';
import { getStatus } from '@/api/threat-intel';
import Page from '@/components/common/Page';
import type { ThreatIntelStatus } from '@/types';

export default function ThreatIntel() {
  const { data, isPending, error } = useQuery<ThreatIntelStatus>({
    queryKey: ['threat-intel-status'],
    queryFn: getStatus,
    refetchInterval: 60_000,
  });

  return (
    <Page title="Threat Intelligence">
      <StateHandler isPending={isPending} error={error}>
        <div>
          <div className="ti-grid">
            <ThreatIntelCard
              to={data?.kev ? '/threat-intel/list/kev' : undefined}
              icon="🛡️"
              title="CISA KEV"
              data={data?.kev}
              type="kev"
            />
            <ThreatIntelCard
              to={data?.nvd ? '/threat-intel/list/nvd' : undefined}
              icon="🔍"
              title="NVD / NIST"
              data={data?.nvd}
              type="nvd"
            />
            <ThreatIntelCard
              to={data?.otx?.configured ? '/threat-intel/list/otx' : undefined}
              icon="👽"
              title="AlienVault OTX"
              data={data?.otx}
              type="otx"
              configured={data?.otx?.configured}
            />
            <ThreatIntelCard
              to={data?.misp?.configured ? '/threat-intel/list/misp' : undefined}
              icon="🦠"
              title="MISP"
              data={data?.misp}
              type="misp"
              configured={data?.misp?.configured}
            />
          </div>
        </div>
      </StateHandler>
    </Page>
  );
}
