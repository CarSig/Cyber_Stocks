import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, Matches, IsIn, IsArray } from "class-validator";
import { SUPPORTED_FORMS } from "@algo/shared";

export class CoverageRangeDto {
  @ApiProperty() from!: string;
  @ApiProperty() to!: string;
}

export class CoverageIndexDto {
  @ApiProperty() ticker!: string;
  @ApiProperty({ type: [CoverageRangeDto] }) ranges!: CoverageRangeDto[];
}

export class EdgarSyncDto {
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

  @ApiPropertyOptional({ description: "If true, re-download filings even if already present locally." })
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({ description: "Form types to sync. Must be from the supported forms list.", type: [String], enum: SUPPORTED_FORMS })
  @IsOptional()
  @IsArray()
  @IsIn(SUPPORTED_FORMS, { each: true })
  formTypes?: string[];
}

export class EdgarSyncStartedDto {
  @ApiProperty({ description: "True if a new sync was kicked off, false if one was already running." })
  started!: boolean;

  @ApiProperty({ description: "True if a sync is now in flight for this ticker." })
  running!: boolean;
}

export class EdgarSyncResultDto {
  @ApiProperty() filesAdded!: number;
  @ApiProperty() skippedFilings!: number;
  @ApiProperty({ type: [CoverageRangeDto] }) coveredRanges!: CoverageRangeDto[];
  @ApiProperty({ type: [CoverageRangeDto] }) gaps!: CoverageRangeDto[];
}

export class FilingMetadataDto {
  @ApiProperty() accession!: string;
  @ApiProperty() cik!: string;
  @ApiProperty() form!: string;
  @ApiProperty() filingDate!: string;
  @ApiPropertyOptional() reportDate?: string;
  @ApiPropertyOptional() acceptanceDateTime?: string;
  @ApiProperty() primaryDocument!: string;
  @ApiPropertyOptional() primaryDocDescription?: string;
  @ApiPropertyOptional({ type: [String] }) items?: string[];
  @ApiProperty() isXBRL!: boolean;
  @ApiProperty() isInlineXBRL!: boolean;
  @ApiProperty() size!: number;
}

export class EdgarFileListingDto {
  @ApiProperty() accession!: string;
  @ApiProperty({ type: [String] }) files!: string[];
  @ApiPropertyOptional({ type: FilingMetadataDto }) meta?: FilingMetadataDto;
}

// `extends` (not intersection) is required here: Swagger introspects DTO classes.
export class EdgarFileListingWithTickerDto extends EdgarFileListingDto {
  @ApiProperty() ticker!: string;
}
