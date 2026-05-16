import { IsDateString, IsEnum, IsNumber, IsPositive, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type {
  Quote, RollingCorrelation, CorrelationResult, LagBucket, LagImpactResult,
  CorrelationWithImpact, SparklineEntry, SimulationAction, SimulationTransaction,
  PortfolioDataPoint, SimulationResult,
} from "@algo/shared";

export class QuoteDto implements Quote {
  @ApiProperty({ description: "YYYY-MM-DD" })
  date: string;

  @ApiProperty()
  open: number;

  @ApiProperty()
  high: number;

  @ApiProperty()
  low: number;

  @ApiProperty()
  close: number;

  @ApiPropertyOptional()
  adjclose?: number;

  @ApiPropertyOptional()
  volume?: number;
}

export class RollingCorrelationDto implements RollingCorrelation {
  @ApiProperty()
  index: number;

  @ApiPropertyOptional({ description: "YYYY-MM-DD", nullable: true })
  date: string | null;

  @ApiProperty()
  r: number;

  @ApiProperty()
  pValue: number;
}

export class CorrelationResultDto implements CorrelationResult {
  @ApiProperty({ description: "Pearson r coefficient (-1 to 1)" })
  r: number;

  @ApiProperty()
  pValue: number;

  @ApiProperty({ description: "True when p < 0.05" })
  significant: boolean;

  @ApiProperty({ description: "95% confidence interval [lower, upper]", type: [Number] })
  ci: [number, number];

  @ApiProperty({ description: "Number of data points used" })
  n: number;

  @ApiProperty()
  lagDays: number;

  @ApiProperty({ description: "Source of events" })
  source: string;

  @ApiProperty()
  interpretation: string;

  @ApiPropertyOptional({ type: [RollingCorrelationDto] })
  @Type(() => RollingCorrelationDto)
  rolling?: RollingCorrelationDto[];
}

export class LagBucketDto implements LagBucket {
  @ApiProperty({ description: "Number of events in bucket" })
  n: number;

  @ApiPropertyOptional({ nullable: true })
  avgChangePct: number | null;
}

export class LagImpactResultDto implements LagImpactResult {
  @ApiProperty()
  windowDays: number;

  @ApiProperty({ type: LagBucketDto })
  positive: LagBucketDto;

  @ApiProperty({ type: LagBucketDto })
  negative: LagBucketDto;

  @ApiProperty({ type: LagBucketDto })
  neutral: LagBucketDto;
}

export class CorrelationWithImpactDto implements CorrelationWithImpact {
  @ApiProperty({ type: CorrelationResultDto })
  correlation: CorrelationResultDto;

  @ApiProperty({ type: LagImpactResultDto })
  lagImpact: LagImpactResultDto;
}

export class SparklineDto implements SparklineEntry {
  @ApiProperty({ type: [Number] })
  closes: number[];

  @ApiProperty({ type: [String] })
  dates: string[];

  @ApiPropertyOptional({ nullable: true })
  latestPrice: number | null;

  @ApiPropertyOptional({ nullable: true })
  changePct: number | null;
}

export class SimulationActionDto implements SimulationAction {
  @ApiProperty({ description: "Trade date (YYYY-MM-DD)", example: "2024-01-15" })
  @IsDateString()
  date: string;

  @ApiProperty({ enum: ["buy", "sell"] })
  @IsEnum(["buy", "sell"])
  type: "buy" | "sell";

  @ApiProperty({ minimum: 0 })
  @IsNumber()
  @IsPositive()
  value: number;
}

export class SimulateBodyDto {
  @ApiProperty({ type: [SimulationActionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SimulationActionDto)
  actions: SimulationActionDto[] = [];
}

export class SimulationTransactionDto implements SimulationTransaction {
  @ApiProperty({ description: "YYYY-MM-DD" })
  date: string;

  @ApiProperty({ enum: ["buy", "sell"] })
  type: "buy" | "sell";

  @ApiProperty()
  shares: number;

  @ApiProperty()
  price: number;

  @ApiProperty()
  value: number;

  @ApiProperty()
  sharesAfter: number;

  @ApiProperty()
  portfolioValue: number;
}

export class PortfolioDataPointDto implements PortfolioDataPoint {
  @ApiProperty({ description: "YYYY-MM-DD" })
  date: string;

  @ApiProperty()
  value: number;
}

export class SimulationResultDto implements SimulationResult {
  @ApiProperty()
  finalCash: number;

  @ApiProperty()
  finalShares: number;

  @ApiProperty()
  sharesValue: number;

  @ApiProperty()
  cashWithdrawn: number;

  @ApiProperty()
  finalPortfolioValue: number;

  @ApiProperty()
  totalInvested: number;

  @ApiProperty()
  profit: number;

  @ApiProperty({ example: "12.34%" })
  profitPercent: string;

  @ApiProperty({ type: [SimulationTransactionDto] })
  @Type(() => SimulationTransactionDto)
  transactions: SimulationTransactionDto[];

  @ApiProperty({ type: [PortfolioDataPointDto] })
  @Type(() => PortfolioDataPointDto)
  portfolioHistory: PortfolioDataPointDto[];

  @ApiProperty({ type: [PortfolioDataPointDto] })
  @Type(() => PortfolioDataPointDto)
  priceHistory: PortfolioDataPointDto[];
}
