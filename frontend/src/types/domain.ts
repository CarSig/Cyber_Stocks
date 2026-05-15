export type Quote = {
  date: string;
  open: number;
  close: number;
  high?: number;
  low?: number;
  volume?: number;
};

export type CorrelationResult = {
  r: number;
  pValue: number;
  interpretation: string;
  ci?: [number, number];
  n: number;
  lagDays?: number;
  significant: boolean;
};

export type LagImpactBucket = {
  avgChangePct: number;
  n: number;
};

export type LagImpact = {
  positive?: LagImpactBucket;
  negative?: LagImpactBucket;
  neutral?: LagImpactBucket;
  windowDays?: number;
};

export type SentimentAnalysis = {
  sentiment: number;
  importance?: number;
  relevance?: number;
  catalyst?: boolean;
  timeframe?: string;
  topics?: string[];
  summary?: string;
  entities?: Array<{ name: string; [key: string]: unknown }>;
};

export type NewsAnalysisMap = Record<string, SentimentAnalysis>;

export type UrgencyKey = 'now' | 'today' | 'recent' | 'future_short' | 'future_long' | 'past';

export type UrgencyConfig = {
  label: string;
  color: string;
  bg: string;
  order: number;
};

export type NewsArticle = {
  id?: string;
  title?: string;
  link: string;
  publisher?: string;
  source?: string;
  providerPublishTime?: number | string;
  publishedAt?: string;
  timestamp?: string | number;
  urgency?: UrgencyKey;
  analysis?: SentimentAnalysis;
  allMatches?: Array<{ ticker: string; company: string }>;
  matchedTicker?: string;
  globalSignals?: string[];
  companySignals?: string[];
};

type IntelligenceArticleEntity = {
  entityId: string;
  name: string;
  role: string;
  score: number;
  sentiment: number;
};

export type IntelligenceArticle = NewsArticle & {
  entities: IntelligenceArticleEntity[];
  newsType: string;
};

export type TrumpPost = {
  content: string;
  created_at: string;
  analysis?: { sentiment: 'positive' | 'negative' | 'neutral' };
};

export type ThreatIntelItem = {
  cveId?: string;
  cveID?: string;
  cveURL?: string;
  description?: string;
  severity?: string;
  created?: string;
  vendorProject?: string;
  product?: string;
  vulnerabilityName?: string;
  name?: string;
  company?: string;
  ransomware?: string;
  [key: string]: unknown;
};

export type ThreatIntelListResponse = {
  items: ThreatIntelItem[];
  total: number;
  syncedAt?: string;
};

export type ThreatIntelStatus = {
  kev?: { syncedAt?: string; total?: number };
  nvd?: { syncedAt?: string; total?: number };
  otx?: { syncedAt?: string; configured?: boolean; total?: number };
  misp?: { syncedAt?: string; configured?: boolean; total?: number };
};

export type ResearchSection = {
  title: string;
  text: string;
};

export type SimulationAction = {
  date: string;
  type: 'buy' | 'sell';
  value: number;
};

export type SimulationResult = Record<string, unknown>;

export type SimulationPreset = {
  date: string;
  number: number | string;
};

export type AppNotification = {
  id: string;
  type: string;
  read: boolean;
  title?: string;
  message?: string;
  [key: string]: unknown;
};

export type AuthUser = {
  id: string;
  email: string;
  role?: string;
  [key: string]: unknown;
};

export type SentimentLabel = {
  label: string;
  color: string;
};

export type TickerSummary = {
  summaryProfile?: {
    sector?: string;
    industry?: string;
    country?: string;
    fullTimeEmployees?: number;
    website?: string;
    longBusinessSummary?: string;
  };
  financialData?: Record<string, unknown>;
  defaultKeyStatistics?: Record<string, unknown>;
  [key: string]: unknown;
};

export type TickerData = {
  history: { quotes: Quote[] };
  news?: NewsArticle[];
  summary?: TickerSummary;
};

export type SparklineData = Record<string, Quote[]>;

export type CorrelationMatrixData = {
  tickers: string[];
  names: string[];
  matrix: Record<string, Record<string, number>>;
};

export type RedditPost = {
  id: string;
  title: string;
  text?: string;
  score?: number;
  url?: string;
  createdAt?: string;
  author?: string;
  numComments?: number;
};

export type RedditComment = {
  id: string;
  body: string;
  score?: number;
  author?: string;
  created_utc?: number;
  replies?: RedditComment[];
};

export type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type IntelligenceEntity = {
  entityId: string;
  name: string;
  count?: number;
};

export type IntelligenceSignal = {
  signalType: string;
  count: number;
};

export type IntelligenceEntitySummary = {
  avgSentiment: number;
  articleCount?: number;
  positiveCount?: number;
  negativeCount?: number;
  neutralCount?: number;
  count?: number;
  [key: string]: unknown;
};

export type CyberNewsTicker = {
  ticker: string;
  company: string;
  count?: number;
};

export type CyberNewsSummary = {
  avgSentiment: number;
  articleCount?: number;
  positiveCount?: number;
  negativeCount?: number;
  neutralCount?: number;
  articlesCount?: number;
  [key: string]: unknown;
};

export type CyberNewsTopic = {
  topic: string;
  count?: number;
};

export type AuditLogEntry = {
  id: string;
  action: string;
  timestamp: string;
  userId?: string;
  [key: string]: unknown;
};
