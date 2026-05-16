// Canonical API contract types — defined once in @algo/shared, used by both sides.
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
  UrgencyKey,
  NewsArticle,
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
  CyberNewsTicker,
  CyberNewsSummary,
  CyberNewsTopic,
  RedditPost,
  RedditComment,
  AlpacaBar,
  AlpacaBarsResponse,
  ResearchSection,
  ChatMessage,
  AppNotification,
} from '@algo/shared';

// Backend-only type extensions (not needed by frontend)
export type History = {
  quotes: Quote[];
};

import type { Quote } from '@algo/shared';
