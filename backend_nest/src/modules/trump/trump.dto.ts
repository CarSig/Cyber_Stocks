import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { TrumpPost } from "@algo/shared";

export class TrumpPostDto implements TrumpPost {
  @ApiProperty()
  id: string;

  @ApiProperty({ description: "ISO timestamp" })
  created_at: string;

  @ApiProperty()
  content: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional({ enum: ["positive", "negative", "neutral"] })
  sentiment?: string;

  @ApiPropertyOptional({ type: [String] })
  tags?: string[];

  @ApiPropertyOptional({ description: "ISO timestamp of AI analysis" })
  analyzed_at?: string;
}
