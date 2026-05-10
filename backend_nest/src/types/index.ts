export type User = {
  id: string;
  username: string;
  role: "user" | "admin";
  email?: string;
  googleId?: string;
}

export type Quote = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjclose?: number;
  volume?: number;
}

export type History = {
  quotes: Quote[];
}

export type CorrelationResult = {
  r: number;
  pValue: number;
  significant: boolean;
  ci: [number, number];
  n: number;
  lagDays: number;
  source: string;
  interpretation: string;
}

export type LagBucket = {
  n: number;
  avgChangePct: number | null;
}

export type LagImpactResult = {
  windowDays: number;
  positive: LagBucket;
  negative: LagBucket;
  neutral: LagBucket;
}
