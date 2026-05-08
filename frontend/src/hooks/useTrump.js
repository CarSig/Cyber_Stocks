import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrumpPostsForTicker, getTrumpCorrelation, getTrumpLagImpact } from "../api.js";

export function useTrump(ticker) {
  const [lagDays, setLagDays] = useState(1);

  const { data: posts } = useQuery({
    queryKey: ["trump-posts", ticker],
    queryFn: () => getTrumpPostsForTicker(ticker),
  });

  const hasData = !!posts?.length;

  const correlation = useQuery({
    queryKey: ["correlate-trump", ticker, lagDays],
    queryFn: () => getTrumpCorrelation(ticker, lagDays),
    enabled: hasData,
    placeholderData: (prev) => prev,
  });

  const { data: lagImpact } = useQuery({
    queryKey: ["trump-lag-impact", ticker, lagDays],
    queryFn: () => getTrumpLagImpact(ticker, lagDays),
    enabled: hasData,
    placeholderData: (prev) => prev,
  });

  return { posts, correlation: correlation.data, correlationFetching: correlation.isFetching, lagImpact, hasData, lagDays, setLagDays };
}
