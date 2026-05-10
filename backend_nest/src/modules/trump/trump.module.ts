import { Module } from "@nestjs/common";
import { TrumpController } from "./trump.controller";
import { TrumpService } from "./trump.service";
import { AuditService } from "@/modules/audit/audit.service";
import { CoreDbModule } from "@/shared/core-db.module";

@Module({
  imports: [CoreDbModule],
  controllers: [TrumpController],
  providers: [TrumpService, AuditService],
})
export class TrumpModule {}
