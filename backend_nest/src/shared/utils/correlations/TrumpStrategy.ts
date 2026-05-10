import type { Strategy, DayValue, DayBucket } from "./correlationCore";

type TrumpPost = {
  created_at?: string;
  analysis?: { sentiment?: string };
}

const SENTIMENT_SCORE: Record<string, number> = { positive: 1, neutral: 0, negative: -1 };

export class TrumpStrategy implements Strategy {
  get source() { return "Trump sentiment"; }
  get lagImpactMode(): "grouped" { return "grouped"; }

  toDayValues(posts: unknown): DayValue[] {
    const map = new Map<string, number[]>();
    for (const post of posts as TrumpPost[]) {
      const day = post.created_at?.slice(0, 10);
      if (!day) continue;
      const score = SENTIMENT_SCORE[post.analysis?.sentiment ?? "neutral"] ?? 0;
      const prev = map.get(day);
      map.set(day, prev == null ? [score] : [...prev, score]);
    }
    return [...map.entries()].map(([day, scores]) => ({
      day,
      value: scores.reduce((a, b) => a + b, 0) / scores.length,
    }));
  }

  toLagImpactInput(posts: unknown): DayBucket[] {
    return (posts as TrumpPost[])
      .map((post) => {
        const day = post.created_at?.slice(0, 10);
        const bucket = (post.analysis?.sentiment ?? "neutral") as DayBucket["bucket"];
        return day ? { day, bucket } : null;
      })
      .filter((x): x is DayBucket => x !== null);
  }
}
