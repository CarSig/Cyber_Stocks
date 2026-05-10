import { Module } from "@nestjs/common";
import { DbService } from "./db.service";
import { EmbeddingService } from "./embedding.service";
import { EntityService } from "./entity.service";
import { SentimentService } from "./sentiment.service";
import { ContentAnalysisService } from "./content-analysis.service";

@Module({
  providers: [DbService, EmbeddingService, EntityService, SentimentService, ContentAnalysisService],
  exports: [ContentAnalysisService],
})
export class ContentAnalysisModule {}
