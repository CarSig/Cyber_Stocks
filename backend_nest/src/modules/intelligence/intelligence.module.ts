import { Module } from "@nestjs/common";
import { IntelligenceController } from "./intelligence.controller";
import { ContentAnalysisModule } from "@/modules/content-analysis/content-analysis.module";

@Module({
  imports: [ContentAnalysisModule],
  controllers: [IntelligenceController],
})
export class IntelligenceModule {}
