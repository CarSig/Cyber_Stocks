import { Type } from "class-transformer";
import { ApiProperty } from "@nestjs/swagger";
import type { AuditEntry, PaginatedAudit } from "@algo/shared";

export class AuditEntryDto implements AuditEntry {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  action: string;

  @ApiProperty({ additionalProperties: true })
  meta: Record<string, unknown>;

  @ApiProperty({ description: "ISO timestamp" })
  timestamp: string;
}

export class PaginatedAuditDto implements PaginatedAudit {
  @ApiProperty()
  total: number;

  @ApiProperty({ type: [AuditEntryDto] })
  @Type(() => AuditEntryDto)
  entries: AuditEntryDto[];
}
