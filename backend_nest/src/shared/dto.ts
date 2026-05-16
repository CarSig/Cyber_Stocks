import { IsString, IsInt, IsPositive, IsOptional, IsDateString, Min, Max } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

// ── Shared query param DTOs ─────────────────────────────────────
// These are used across multiple modules. Module-specific DTOs
// live in their respective module directories.

export class LagDaysDto {
  @ApiPropertyOptional({ description: "Number of days to shift events forward", default: 1, minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 1;
}

export class WindowDaysDto {
  @ApiPropertyOptional({ description: "Rolling window size in days", minimum: 1, maximum: 730 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number;
}

export class CorrelationQueryDto {
  @ApiPropertyOptional({ description: "Rolling window size in days", minimum: 1, maximum: 730 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number;

  @ApiPropertyOptional({ description: "Number of days to shift events forward", default: 0, minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 0;
}

export class CorrelationMatrixQueryDto {
  @ApiPropertyOptional({ description: "Number of days to shift column tickers forward", default: 0, minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 0;

  @ApiPropertyOptional({ description: "Rolling window size in days", default: 90, minimum: 1, maximum: 730 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(730)
  windowDays?: number = 90;

  @ApiPropertyOptional({ description: "Start of date range (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: "End of date range (YYYY-MM-DD)" })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

export class PaginationDto {
  @ApiPropertyOptional({ description: "Page size", default: 50, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(500)
  limit?: number = 50;

  @ApiPropertyOptional({ description: "Page offset", default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}

export class AuditQueryDto extends PaginationDto {
  @ApiPropertyOptional({ description: "Filter by user ID" })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: "Filter by action name" })
  @IsOptional()
  @IsString()
  action?: string;
}

export class SparklinesQueryDto {
  @ApiProperty({ description: "Comma-separated list of ticker symbols", example: "CRWD,PANW,FTNT" })
  @IsString()
  tickers: string;
}

export class SignalQueryDto {
  @ApiPropertyOptional({ description: "Filter by signal type" })
  @IsOptional()
  @IsString()
  signal?: string;
}

export class LagDaysSignalQueryDto extends LagDaysDto {
  @ApiPropertyOptional({ description: "Filter by signal type" })
  @IsOptional()
  @IsString()
  signal?: string;
}

export class TopicQueryDto {
  @ApiPropertyOptional({ description: "Filter by topic" })
  @IsOptional()
  @IsString()
  topic?: string;
}

export class AlpacaBarsQueryDto {
  @ApiProperty({ description: "Trading date (YYYY-MM-DD)" })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ description: "Bar timeframe", default: "1Min", example: "1Min" })
  @IsOptional()
  @IsString()
  timeframe?: string = "1Min";
}

export class CyberNewsLagQueryDto {
  @ApiPropertyOptional({ description: "Lag days for correlation", default: 1, minimum: 0, maximum: 365 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(365)
  lagDays?: number = 1;

  @ApiPropertyOptional({ description: "Filter by topic" })
  @IsOptional()
  @IsString()
  topic?: string;
}

export class CyberNewsLimitQueryDto {
  @ApiPropertyOptional({ description: "Max articles to return", default: 50, minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(500)
  limit?: number = 50;
}
