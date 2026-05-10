import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit.service";
import { CoreDbModule } from "@/shared/core-db.module";

@Global()
@Module({
  imports: [CoreDbModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
