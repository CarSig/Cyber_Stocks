// All shared API contract types come from @algo/shared.
// Only frontend-local types (UI helpers, label configs) are defined here.
export type {
  User,
  AuthResponse,
  Quote,
  SparklineEntry,
  SparklineMap,
  CorrelationMatrixData,
  RollingCorrelation,
  CorrelationResult,
  LagBucket,
  LagImpactResult,
  CorrelationWithImpact,
  SimulationAction,
  SimulationPresetEntry,
  SimulationPresets,
  SimulationTransaction,
  PortfolioDataPoint,
  SimulationResult,
  SentimentAnalysis,
  NewsAnalysisMap,
  NewsArticle,
  NewsAnalyzeQueuedResponse,
  StockAnalysis,
  TickerSummary,
  TickerData,
  TrumpPost,
  ThreatIntelItem,
  ThreatIntelListResponse,
  KevStatus,
  NvdStatus,
  OtxStatus,
  ThreatIntelStatus,
  AuditEntry,
  PaginatedAudit,
  IntelligenceArticle,
  IntelligenceEntity,
  IntelligenceSignal,
  IntelligenceEntitySummary,
  SentimentCorrelationEntry,
  CyberNewsTicker,
  CyberNewsSummary,
  CyberNewsTopic,
  CyberNewsCorrelationEntry,
  RedditPost,
  RedditComment,
  AlpacaBar,
  AlpacaBarsResponse,
  ResearchSection,
  ChatMessage,
  AppNotification,
} from '@algo/shared';

// ─── Frontend-local types ────────────────────────────────────────────────────

export type SentimentLabel = {
  label: string;
  color: string;
};

/**
 * Legacy alias kept for components that haven't migrated to SimulationPresets.
 * Maps to SimulationPresetEntry from @algo/shared.
 */
export type { SimulationPresetEntry as SimulationPreset } from '@algo/shared';

/** Deprecated loose alias — components should use SimulationPresets instead */
export type SparklineData = import('@algo/shared').SparklineMap;

/** AuthUser alias matching legacy frontend usage */
export type { User as AuthUser } from '@algo/shared';
