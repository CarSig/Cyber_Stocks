import { useState } from "react";
import { getThreatIntelCorrelation } from "../api.js";
import { useCorrelationQuery } from "./useCorrelationQuery.js";

export function useThreatIntel(ticker) {
  const [lagDays, setLagDays] = useState(1);

  const nvd = useCorrelationQuery(
    ["threat-intel-correlate", "nvd", ticker, lagDays],
    () => getThreatIntelCorrelation("nvd", ticker, lagDays),
    !!ticker,
  );
  const kev = useCorrelationQuery(
    ["threat-intel-correlate", "kev", ticker, lagDays],
    () => getThreatIntelCorrelation("kev", ticker, lagDays),
    !!ticker,
  );
  const otx = useCorrelationQuery(
    ["threat-intel-correlate", "otx", ticker, lagDays],
    () => getThreatIntelCorrelation("otx", ticker, lagDays),
    !!ticker,
  );

  return { nvd, kev, otx, lagDays, setLagDays };
}
