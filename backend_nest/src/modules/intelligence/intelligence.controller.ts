import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { ContentAnalysisService } from "@/modules/content-analysis/content-analysis.service";
import { AppError } from "@/shared/errors";
import { SignalQueryDto, LagDaysSignalQueryDto } from "@/shared/dto";
import companies from "@/data/companies";
import type { BackendArticleInput } from "@/modules/content-analysis/content-analysis.types";

@ApiTags("Intelligence")
@ApiBearerAuth("bearer")
@Controller("intelligence")
export class IntelligenceController {
  constructor(private readonly contentAnalysis: ContentAnalysisService) {}

  @Post("articles/process")
  @ApiOperation({ summary: "Process backend article", description: "Runs backend content analysis pipeline on a submitted article." })
  @ApiResponse({ status: 201, description: "Processed article result" })
  async processBackendArticle(@Body() body: BackendArticleInput) {
    return this.contentAnalysis.processBackendArticle(body);
  }

  @Get("entities")
  @ApiOperation({ summary: "Get entities", description: "Returns all entities that match tracked companies." })
  @ApiResponse({ status: 200, description: "Filtered entity list" })
  async getBackendEntities() {
    const all = await this.contentAnalysis.getBackendEntities();
    const companyNames = new Set(Object.keys(companies).map((n) => n.toLowerCase()));
    return all.filter((e) => companyNames.has(e.name.toLowerCase()));
  }

  @Get("entities/:entityId/articles")
  @ApiOperation({ summary: "Get entity articles", description: "Returns all articles associated with an entity." })
  @ApiParam({ name: "entityId", description: "Entity ID" })
  @ApiResponse({ status: 200, description: "Article list" })
  async getBackendEntityArticles(@Param("entityId") entityId: string, @Query() { signal }: SignalQueryDto) {
    return this.contentAnalysis.getBackendArticlesByEntity(entityId, signal);
  }

  @Get("entities/:entityId/summary")
  @ApiOperation({ summary: "Get entity summary", description: "Returns the aggregated intelligence summary for an entity." })
  @ApiParam({ name: "entityId", description: "Entity ID" })
  @ApiResponse({ status: 200, description: "Entity summary" })
  @ApiResponse({ status: 404, description: "Entity not found" })
  async getBackendEntitySummary(@Param("entityId") entityId: string, @Query() { signal }: SignalQueryDto) {
    const summary = await this.contentAnalysis.getBackendEntitySummary(entityId, signal);
    if (!summary) throw new AppError(`Entity ${entityId} not found`, 404);
    return summary;
  }

  @Get("signals")
  @ApiOperation({ summary: "Global signals", description: "Returns aggregated intelligence signals across all entities." })
  @ApiResponse({ status: 200, description: "Global signals" })
  async getBackendGlobalSignals() {
    return this.contentAnalysis.getBackendGlobalSignals();
  }

  @Get("sentiment-correlations")
  @ApiOperation({ summary: "Sentiment correlations", description: "Correlates entity sentiment scores with stock price movements for all tracked companies." })
  @ApiResponse({ status: 200, description: "Array of { entity, ticker, correlation, lagImpact }" })
  async getAllSentimentCorrelations(@Query() { lagDays, signal }: LagDaysSignalQueryDto) {
    const all = await this.contentAnalysis.getBackendEntities();
    const companyNames = new Set(Object.keys(companies));
    const known = all
      .filter((e) => [...companyNames].some((n) => n.toLowerCase() === e.name.toLowerCase()))
      .map((e) => {
        const name = [...companyNames].find((n) => n.toLowerCase() === e.name.toLowerCase())!;
        const ticker = companies[name];
        return { entityId: e.entityId, name, ticker };
      });
    return this.contentAnalysis.getAllSentimentCorrelations(known, lagDays ?? 1, signal);
  }
}
