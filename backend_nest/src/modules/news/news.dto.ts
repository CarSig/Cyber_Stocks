import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { SentimentAnalysis } from "@algo/shared";

export class ArticleSentimentDto implements SentimentAnalysis {
  @ApiProperty({ description: "Sentiment score -1 (negative) to 1 (positive)" })
  sentiment: number;

  @ApiProperty({ description: "Editorial importance 1–10" })
  importance: number;

  @ApiProperty({ description: "Ticker relevance 1–10" })
  relevance: number;

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional({ type: [String] })
  topics?: string[];

  @ApiPropertyOptional()
  catalyst?: boolean;

  @ApiPropertyOptional()
  timeframe?: string;
}
