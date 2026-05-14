import { useQuery } from "@tanstack/react-query";
import StateHandler from "@/components/organisms/shared/StateHandler.jsx";
import ThreatIntelCard from "@/components/organisms/cards/ThreatIntelCard.jsx";
import { getThreatIntelStatus } from "@/api.js";
import Page from "@/components/atoms/Page.jsx";

export default function ThreatIntel() {
  const { data, isPending, error } = useQuery({
    queryKey: ["threat-intel-status"],
    queryFn: getThreatIntelStatus,
    refetchInterval: 60_000,
  });

  return (
    <Page title="Threat Intelligence">
      <StateHandler isPending={isPending} error={error}>
        <div>
          <div className="ti-grid">
            <ThreatIntelCard to={data?.kev ? "/threat-intel/list/kev" : null} icon="🛡️" title="CISA KEV" data={data?.kev} type="kev" />
            <ThreatIntelCard to={data?.nvd ? "/threat-intel/list/nvd" : null} icon="🔍" title="NVD / NIST" data={data?.nvd} type="nvd" />
            <ThreatIntelCard
              to={data?.otx?.configured ? "/threat-intel/list/otx" : null}
              icon="👽"
              title="AlienVault OTX"
              data={data?.otx}
              type="otx"
              configured={data?.otx?.configured}
            />
            <ThreatIntelCard
              to={data?.misp?.configured ? "/threat-intel/list/misp" : null}
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
