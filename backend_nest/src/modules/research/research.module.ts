import { Module } from "@nestjs/common";
import { ResearchController } from "./research.controller";
import { ResearchService } from "./research.service";
import { AuditService } from "@/modules/audit/audit.service";

@Module({
  controllers: [ResearchController],
  providers: [ResearchService, AuditService],
})
export class ResearchModule {}
