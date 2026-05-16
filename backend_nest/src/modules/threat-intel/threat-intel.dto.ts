import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import type { KevStatus, NvdStatus, OtxStatus, ThreatIntelStatus } from "@algo/shared";

export class ThreatIntelStatusDto {
  @ApiProperty({ description: "Total record count" })
  count: number;

  @ApiPropertyOptional({ nullable: true })
  syncedAt: string | null;
}

export class KevStatusDto extends ThreatIntelStatusDto implements KevStatus {
  @ApiProperty()
  recentCount: number;

  @ApiProperty()
  ransomwareCount: number;
}

export class NvdStatusDto implements NvdStatus {
  @ApiProperty()
  fetched: number;

  @ApiPropertyOptional({ nullable: true })
  syncedAt: string | null;

  @ApiProperty()
  criticalCount: number;

  @ApiProperty()
  highCount: number;
}

export class OtxStatusDto implements OtxStatus {
  @ApiProperty()
  configured: boolean;

  @ApiPropertyOptional({ nullable: true })
  count: number | null;

  @ApiPropertyOptional({ nullable: true })
  syncedAt: string | null;
}

export class ThreatIntelStatusResponseDto implements ThreatIntelStatus {
  @ApiProperty({ type: KevStatusDto })
  kev: KevStatusDto;

  @ApiProperty({ type: NvdStatusDto })
  nvd: NvdStatusDto;

  @ApiProperty({ type: OtxStatusDto })
  otx: OtxStatusDto;

  @ApiProperty({ type: OtxStatusDto })
  misp: OtxStatusDto;
}
