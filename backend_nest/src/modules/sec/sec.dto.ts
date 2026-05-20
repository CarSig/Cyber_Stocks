import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, Matches } from "class-validator";

export class CoverageRangeDto {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
}

export class CoverageIndexDto {
  @ApiProperty() ticker!: string;
  @ApiProperty({ type: [CoverageRangeDto] }) ranges!: CoverageRangeDto[];
}

export class SecSyncDto {
  @ApiProperty({ description: "Ticker symbol, must exist in COMPANY_CIK map" })
  @IsString()
  ticker!: string;

  @ApiPropertyOptional({ description: "Start date (YYYY-MM-DD). Defaults to 1 month ago." })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "dateFrom must be YYYY-MM-DD" })
  dateFrom?: string;

  @ApiPropertyOptional({ description: "End date (YYYY-MM-DD). Defaults to today." })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "dateTo must be YYYY-MM-DD" })
  dateTo?: string;
}

export class SecSyncResultDto {
  @ApiProperty() filesAdded!: number;
  @ApiProperty() skippedFilings!: number;
  @ApiProperty({ type: [CoverageRangeDto] }) coveredRanges!: CoverageRangeDto[];
  @ApiProperty({ type: [CoverageRangeDto] }) gaps!: CoverageRangeDto[];
}

export class SecFileListingDto {
  @ApiProperty() accession!: string;
  @ApiProperty({ type: [String] }) files!: string[];
  @ApiPropertyOptional() date?: string;
  @ApiPropertyOptional() form?: string;
  @ApiPropertyOptional() cik?: string;
  @ApiPropertyOptional() primaryDoc?: string;
}
