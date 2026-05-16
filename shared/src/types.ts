// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export type User = {
  id: string;
  username: string;
  role: 'user' | 'admin';
  email?: string;
};

export type AuthResponse = {
  token: string;
  user: User;
};

// ─────────────────────────────────────────────────────────────────────────────
// Stocks
// ─────────────────────────────────────────────────────────────────────────────

export type Quote = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjclose?: number;
  volume?: number;
};

export type SparklineEntry = {
  closes: number[];
  dates: string[];
  latestPrice: number | null;
  changePct: number | null;
};

export type SparklineMap = Record<string, SparklineEntry>;

export type CorrelationMatrixData = {
  tickers: string[];
  names: string[];
  matrix: Record<string, Record<string, number>>;
  lagDays: number;
};

export type RollingCorrelation = {
  index: number;
  date: string | null;
  r: number;
  pValue: number;
};

export type CorrelationResult = {
  r: number;
  pValue: number;
  significant: boolean;
  /** 95% confidence interval [lower, upper] — always present */
  ci: [number, number];
  n: number;
  lagDays: number;
  source: string;
  interpretation: string;
  rolling?: RollingCorrelation[];
};

export type LagBucket = {
  n: number;
  avgChangePct: number | null;
};

export type LagImpactResult = {
  windowDays: number;
  positive: LagBucket;
  negative: LagBucket;
  neutral: LagBucket;
};

export type CorrelationWithImpact = {
  correlation: CorrelationResult;
  lagImpact: LagImpactResult;
};

// ─────────────────────────────────────────────────────────────────────────────
// Simulation
// ─────────────────────────────────────────────────────────────────────────────

export type SimulationAction = {
  date: string;
  type: 'buy' | 'sell';
  value: number;
};

export type SimulationPresetEntry = {
  date: string;
  number: number;
};

/** Backend returns a map of strategy name → preset entries */
export type SimulationPresets = Record<string, SimulationPresetEntry[]>;

export type SimulationTransaction = {
  date: string;
  type: 'buy' | 'sell';
  shares: number;
  price: number;
  value: number;
  sharesAfter: number;
  portfolioValue: number;
};

export type PortfolioDataPoint = {
  date: string;
  value: number;
};

export type SimulationResult = {
  finalCash: number;
  finalShares: number;
  sharesValue: number;
  cashWithdrawn: number;
  finalPortfolioValue: number;
  totalInvested: number;
  profit: number;
  profitPercent: string;
  transactions: SimulationTransaction[];
  portfolioHistory: PortfolioDataPoint[];
  priceHistory: PortfolioDataPoint[];
};

// ─────────────────────────────────────────────────────────────────────────────
// News & Sentiment
// ─────────────────────────────────────────────────────────────────────────────

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

export type NewsAnalyzeQueuedResponse = {
  queued: number;
  total?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Ticker page
// ─────────────────────────────────────────────────────────────────────────────

export type StockAnalysis = {
  trend?: string;
  momentum?: string;
  volatility?: string;
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
  analysis?: StockAnalysis;
};

// ─────────────────────────────────────────────────────────────────────────────
// Trump
// ─────────────────────────────────────────────────────────────────────────────

export type TrumpPost = {
  id: string;
  created_at: string;
  content: string;
  url?: string;
  sentiment?: string;
  tags?: string[];
  analyzed_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Threat Intelligence
// ─────────────────────────────────────────────────────────────────────────────

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
  configured?: boolean;
};

export type KevStatus = {
  count: number;
  syncedAt: string | null;
  recentCount: number;
  ransomwareCount: number;
};

export type NvdStatus = {
  fetched: number;
  syncedAt: string | null;
  criticalCount: number;
  highCount: number;
};

export type OtxStatus = {
  configured: boolean;
  count: number | null;
  syncedAt: string | null;
};

export type ThreatIntelStatus = {
  kev: KevStatus;
  nvd: NvdStatus;
  otx: OtxStatus;
  misp: OtxStatus;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin / Audit
// ─────────────────────────────────────────────────────────────────────────────

export type AuditEntry = {
  id: string;
  userId: string;
  username: string;
  action: string;
  meta: Record<string, unknown>;
  timestamp: string;
};

export type PaginatedAudit = {
  total: number;
  entries: AuditEntry[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Intelligence
// ─────────────────────────────────────────────────────────────────────────────

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

export type SentimentCorrelationEntry = {
  ticker: string;
  correlation: CorrelationResult;
  lagImpact?: LagImpactResult;
};

// ─────────────────────────────────────────────────────────────────────────────
// Cyber News
// ─────────────────────────────────────────────────────────────────────────────

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
  [key: string]: unknown;
};

export type CyberNewsTopic = {
  topic: string;
  count?: number;
};

export type CyberNewsCorrelationEntry = {
  ticker: string;
  correlation: CorrelationResult;
  lagImpact?: LagImpactResult;
};

// ─────────────────────────────────────────────────────────────────────────────
// Reddit
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Alpaca
// ─────────────────────────────────────────────────────────────────────────────

export type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type AlpacaBarsResponse = {
  bars: AlpacaBar[];
  symbol: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Research / Chat
// ─────────────────────────────────────────────────────────────────────────────

export type ResearchSection = {
  title: string;
  text: string;
};

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Notifications
// ─────────────────────────────────────────────────────────────────────────────

export type AppNotification = {
  id: string;
  type: string;
  read: boolean;
  title?: string;
  message?: string;
  [key: string]: unknown;
};
