import { IsString, IsNumber, IsInt, IsPositive, IsOptional, IsEnum,
         IsArray, ValidateNested, Min, Max, IsDateString, MinLength } from "class-validator";
import { Type } from "class-transformer";

// ── Query param DTOs ────────────────────────────────────────────

export class LagDaysDto {
  /** Number of days to shift events forward. Default 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 1;
}

export class WindowDaysDto {
  /** Rolling window size in days. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number;
}

export class CorrelationQueryDto {
  /** Rolling window size in days. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number;

  /** Number of days to shift events forward. Default 0. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 0;
}

export class CorrelationMatrixQueryDto {
  /** Number of days to shift column tickers forward. Default 0. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 0;

  /** Rolling window size in days. Default 90. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number = 90;

  /** Start of date range (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /** End of date range (YYYY-MM-DD). */
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PaginationDto {
  /** Page size. Default 50, max 500. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(500)
  limit?: number = 50;

  /** Page offset. Default 0. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class AuditQueryDto extends PaginationDto {
  /** Filter by user ID. */
  @IsOptional()
  @IsString()
  userId?: string;

  /** Filter by action name. */
  @IsOptional()
  @IsString()
  action?: string;
}

// ── Body DTOs ───────────────────────────────────────────────────

export class ClerkAuthDto {
  /** Clerk session token. */
  @IsString()
  @MinLength(1)
  token: string;
}

export class SimulationActionDto {
  /** Trade date (YYYY-MM-DD). */
  @IsDateString()
  date: string;

  /** Direction of the trade. */
  @IsEnum(["buy", "sell"])
  type: "buy" | "sell";

  /** Number of shares or dollar value. */
  @IsNumber()
  @IsPositive()
  value: number;
}

export class SimulateBodyDto {
  /** Ordered list of buy/sell actions for the backtest. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulationActionDto)
  actions: SimulationActionDto[] = [];
}

export class ChatMessageDto {
  /** Speaker role in the conversation. */
  @IsEnum(["user", "assistant"])
  role: "user" | "assistant";

  /** Message text. */
  @IsString()
  @MinLength(1)
  content: string;
}

export class ChatBodyDto {
  /** Full conversation history to maintain context across turns. */
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  /** Optional ticker or domain context injected into the prompt. */
  @IsOptional()
  @IsString()
  context?: string;
}

// ── Response DTOs ───────────────────────────────────────────────

export class UserDto {
  /** UUID */
  id: string;
  username: string;
  /** User permission tier */
  role: "user" | "admin";
  email?: string;
}

export class AuthResponseDto {
  /** Signed JWT to include as Bearer token on subsequent requests */
  token: string;
  user: UserDto;
}

export class QuoteDto {
  /** YYYY-MM-DD */
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  adjclose?: number;
  volume?: number;
}

export class RollingCorrelationDto {
  index: number;
  /** YYYY-MM-DD */
  date: string | null;
  r: number;
  pValue: number;
}

export class CorrelationResultDto {
  /** Pearson r coefficient (-1 to 1) */
  r: number;
  pValue: number;
  /** True when p < 0.05 */
  significant: boolean;
  /** 95% confidence interval [lower, upper] */
  ci: [number, number];
  /** Number of data points used */
  n: number;
  lagDays: number;
  /** Source of events (e.g. "news sentiment") */
  source: string;
  interpretation: string;
  @Type(() => RollingCorrelationDto)
  rolling?: RollingCorrelationDto[];
}

export class LagBucketDto {
  /** Number of events in bucket */
  n: number;
  /** Average stock price change % after the event */
  avgChangePct: number | null;
}

export class LagImpactResultDto {
  windowDays: number;
  positive: LagBucketDto;
  negative: LagBucketDto;
  neutral: LagBucketDto;
}

export class CorrelationWithImpactDto {
  correlation: CorrelationResultDto;
  lagImpact: LagImpactResultDto;
}

export class SparklineDto {
  /** Last 30 adjusted-close prices */
  closes: number[];
  /** Corresponding YYYY-MM-DD dates */
  dates: string[];
  latestPrice: number | null;
  /** Percentage change over the returned window */
  changePct: number | null;
}

export class SimulationTransactionDto {
  /** YYYY-MM-DD */
  date: string;
  type: "buy" | "sell";
  shares: number;
  price: number;
  value: number;
  sharesAfter: number;
  portfolioValue: number;
}

export class PortfolioDataPointDto {
  /** YYYY-MM-DD */
  date: string;
  value: number;
}

export class SimulationResultDto {
  finalCash: number;
  finalShares: number;
  sharesValue: number;
  cashWithdrawn: number;
  finalPortfolioValue: number;
  totalInvested: number;
  profit: number;
  /** e.g. "12.34%" */
  profitPercent: string;
  @Type(() => SimulationTransactionDto)
  transactions: SimulationTransactionDto[];
  @Type(() => PortfolioDataPointDto)
  portfolioHistory: PortfolioDataPointDto[];
  @Type(() => PortfolioDataPointDto)
  priceHistory: PortfolioDataPointDto[];
}

export class ArticleSentimentDto {
  /** Sentiment score -1 (negative) to 1 (positive) */
  sentiment: number;
  /** Editorial importance 1–10 */
  importance: number;
  /** Ticker relevance 1–10 */
  relevance: number;
  summary?: string;
  topics?: string[];
  catalyst?: boolean;
  timeframe?: string;
}

export class TrumpPostDto {
  id: string;
  /** ISO timestamp */
  created_at: string;
  content: string;
  url?: string;
  sentiment?: string;
  tags?: string[];
  analyzed_at?: string;
}

export class ThreatIntelStatusDto {
  /** Total record count */
  count: number;
  syncedAt: string | null;
}

export class KevStatusDto extends ThreatIntelStatusDto {
  recentCount: number;
  ransomwareCount: number;
}

export class NvdStatusDto {
  fetched: number;
  syncedAt: string | null;
  criticalCount: number;
  highCount: number;
}

export class OtxStatusDto {
  configured: boolean;
  count: number | null;
  syncedAt: string | null;
}

export class ThreatIntelStatusResponseDto {
  kev: KevStatusDto;
  nvd: NvdStatusDto;
  otx: OtxStatusDto;
  misp: OtxStatusDto;
}

export class AuditEntryDto {
  id: string;
  userId: string;
  username: string;
  action: string;
  meta: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
}

export class PaginatedAuditDto {
  total: number;
  @Type(() => AuditEntryDto)
  entries: AuditEntryDto[];
}
