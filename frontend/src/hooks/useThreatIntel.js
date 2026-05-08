import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getThreatIntelCorrelation } from "../api.js";

export function useThreatIntel(ticker) {
  const [lagDays, setLagDays] = useState(1);

  const nvd = useQuery({
    queryKey: ["threat-intel-correlate", "nvd", ticker, lagDays],
    queryFn: () => getThreatIntelCorrelation("nvd", ticker, lagDays),
    enabled: !!ticker,
    retry: false,
    placeholderData: (prev) => prev,
  });
  const kev = useQuery({
    queryKey: ["threat-intel-correlate", "kev", ticker, lagDays],
    queryFn: () => getThreatIntelCorrelation("kev", ticker, lagDays),
    enabled: !!ticker,
    retry: false,
    placeholderData: (prev) => prev,
  });
  const otx = useQuery({
    queryKey: ["threat-intel-correlate", "otx", ticker, lagDays],
    queryFn: () => getThreatIntelCorrelation("otx", ticker, lagDays),
    enabled: !!ticker,
    retry: false,
    placeholderData: (prev) => prev,
  });
  return { nvd, kev, otx, lagDays, setLagDays };
}
