import type { Strategy, DayValue, DayBucket } from "./correlationCore";

export class ThreatIntelStrategy implements Strategy {
  get source() { return "threat intel"; }
  get lagImpactMode(): "single" { return "single"; }

  toDayValues(dates: unknown): DayValue[] {
    const countMap = new Map<string, number>();
    for (const d of dates as string[]) countMap.set(d, (countMap.get(d) ?? 0) + 1);
    return [...countMap.entries()].sort().map(([day, value]) => ({ day, value }));
  }

  toLagImpactInput(dates: unknown): DayBucket[] | string[] {
    return dates as string[];
  }
}
