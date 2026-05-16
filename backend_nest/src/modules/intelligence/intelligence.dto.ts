import { IsString, IsUUID, IsDateString, IsOptional, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import companies from "@/data/companies";

const KNOWN_TICKERS = Object.values(companies);

export class BackendArticleInputDto {
  @ApiProperty()
  @IsUUID()
  id: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  uuid?: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  link: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  publisher?: string;

  @ApiProperty({ description: "Must be a known tracked ticker symbol" })
  @IsIn(KNOWN_TICKERS, { message: `ticker must be one of the tracked company tickers` })
  ticker: string;

  @ApiProperty({ description: "ISO 8601 date string" })
  @IsDateString()
  timestamp: string;
}
