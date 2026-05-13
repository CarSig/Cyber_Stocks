import { correlationStrength, sentimentLabel } from "@/utils/sentimentUtils.js";

export default function useCorrelationMetrics(correlation, summary) {
  const corrResult = correlation?.result;
  const hasCorrelation = corrResult && !("error" in corrResult);
  const strength = hasCorrelation ? correlationStrength(corrResult.r) : null;
  const sentimentInfo = summary ? sentimentLabel(summary.avgSentiment) : null;
  return { corrResult, hasCorrelation, strength, sentimentInfo };
}
