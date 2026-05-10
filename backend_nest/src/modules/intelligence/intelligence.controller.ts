import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { ContentAnalysisService } from "@/modules/content-analysis/content-analysis.service";
import { AppError } from "@/shared/errors";
import companies from "@/data/companies";
import type { ProcessArticleInput, BackendArticleInput } from "@/modules/content-analysis/content-analysis.types";

@Controller()
export class IntelligenceController {
  constructor(private readonly contentAnalysis: ContentAnalysisService) {}

  @Post("intelligence/articles/process")
  async processArticle(@Body() body: ProcessArticleInput) {
    return this.contentAnalysis.processArticle(body);
  }

  @Get("intelligence/articles/:id")
  async getArticle(@Param("id") id: string) {
    const article = await this.contentAnalysis.getArticle(id);
    if (!article) throw new AppError(`Article ${id} not found`, 404);
    return article;
  }

  @Get("intelligence/entities/:entityId/articles")
  async getEntityArticles(@Param("entityId") entityId: string) {
    return this.contentAnalysis.getArticlesByEntity(entityId);
  }

  @Get("intelligence/entities/:entityId/summary")
  async getEntitySummary(@Param("entityId") entityId: string) {
    const summary = await this.contentAnalysis.getEntitySummary(entityId);
    if (!summary) throw new AppError(`Entity ${entityId} not found`, 404);
    return summary;
  }

  @Get("intelligence/signals")
  async getGlobalSignals() {
    return this.contentAnalysis.getGlobalSignals();
  }

  @Post("intelligence2/articles/process")
  async processBackendArticle(@Body() body: BackendArticleInput) {
    return this.contentAnalysis.processBackendArticle(body);
  }

  @Get("intelligence2/entities")
  async getBackendEntities() {
    const all = await this.contentAnalysis.getBackendEntities();
    const companyNames = new Set(Object.keys(companies).map((n) => n.toLowerCase()));
    return all.filter((e) => companyNames.has(e.name.toLowerCase()));
  }

  @Get("intelligence2/entities/:entityId/articles")
  async getBackendEntityArticles(@Param("entityId") entityId: string) {
    return this.contentAnalysis.getBackendArticlesByEntity(entityId);
  }

  @Get("intelligence2/entities/:entityId/summary")
  async getBackendEntitySummary(@Param("entityId") entityId: string) {
    const summary = await this.contentAnalysis.getBackendEntitySummary(entityId);
    if (!summary) throw new AppError(`Entity ${entityId} not found`, 404);
    return summary;
  }

  @Get("intelligence2/signals")
  async getBackendGlobalSignals() {
    return this.contentAnalysis.getBackendGlobalSignals();
  }
}
