import { Module } from "@nestjs/common";
import { NewsController } from "./news.controller";
import { NewsAnalysisService } from "./news-analysis.service";
import { AuditService } from "@/modules/audit/audit.service";
import { CoreDbModule } from "@/shared/core-db.module";

@Module({
  imports: [CoreDbModule],
  controllers: [NewsController],
  providers: [NewsAnalysisService, AuditService],
})
export class NewsModule {}
