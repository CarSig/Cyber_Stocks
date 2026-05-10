import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrumpPostsForTicker, getTrumpCorrelation, getTrumpLagImpact } from "../api.js";
import { useCorrelationQuery } from "./useCorrelationQuery.js";

export function useTrump(ticker) {
  const [lagDays, setLagDays] = useState(1);

  const { data: posts } = useQuery({
    queryKey: ["trump-posts", ticker],
    queryFn: () => getTrumpPostsForTicker(ticker),
  });

  const hasData = !!posts?.length;

  const correlation = useCorrelationQuery(
    ["correlate-trump", ticker, lagDays],
    () => getTrumpCorrelation(ticker, lagDays),
    hasData,
  );

  const { data: lagImpact } = useCorrelationQuery(
    ["trump-lag-impact", ticker, lagDays],
    () => getTrumpLagImpact(ticker, lagDays),
    hasData,
  );

  return { posts, correlation: correlation.data, correlationFetching: correlation.isFetching, lagImpact, hasData, lagDays, setLagDays };
}
