import type { Strategy, DayValue, DayBucket } from "./correlationCore";

type NewsEvent = { date: string; score: number }

export class NewsStrategy implements Strategy {
  get source() { return "news sentiment"; }
  get lagImpactMode(): "grouped" { return "grouped"; }

  toDayValues(events: unknown): DayValue[] {
    return [...(events as NewsEvent[])]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map(({ date, score }) => ({ day: date, value: score }));
  }

  toLagImpactInput(events: unknown): DayBucket[] {
    return (events as NewsEvent[]).map(({ date, score }) => ({
      day: date,
      bucket: score > 0.05 ? "positive" : score < -0.05 ? "negative" : "neutral",
    }));
  }
}
