import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import { CyberNewsService } from "./cyber-news.service";
import { AppError } from "@/shared/errors";

@ApiTags("Cyber News")
@ApiBearerAuth("bearer")
@Controller("cyber-news")
export class CyberNewsController {
  constructor(private readonly service: CyberNewsService) {}

  @Get("tickers")
  @ApiOperation({ summary: "All tickers with cyber news" })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiResponse({ status: 200 })
  getTickers(@Query("topic") topic?: string) {
    return this.service.getTickers(topic);
  }

  @Get("recent")
  @ApiOperation({ summary: "Recent articles across all companies" })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiResponse({ status: 200 })
  getRecent(@Query("limit") limit?: string) {
    return this.service.getRecentArticles(limit ? Number(limit) : 50);
  }

  @Get("topics")
  @ApiOperation({ summary: "Aggregated topics from all analyses" })
  @ApiResponse({ status: 200 })
  getTopics() {
    return this.service.getTopics();
  }

  @Get(":ticker/summary")
  @ApiOperation({ summary: "Sentiment summary for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getSummary(@Param("ticker") ticker: string, @Query("topic") topic?: string) {
    const data = await this.service.getSummary(ticker.toUpperCase(), topic);
    if (!data) throw new AppError(`No cyber news for ${ticker}`, 404);
    return data;
  }

  @Get(":ticker/articles")
  @ApiOperation({ summary: "Articles for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiResponse({ status: 200 })
  getArticles(@Param("ticker") ticker: string, @Query("topic") topic?: string) {
    return this.service.getArticles(ticker.toUpperCase(), topic);
  }

  @Get("correlations")
  @ApiOperation({ summary: "Sentiment ↔ price correlation across all tickers" })
  @ApiQuery({ name: "lagDays", required: false, type: Number })
  @ApiQuery({ name: "topic", required: false, type: String })
  @ApiResponse({ status: 200 })
  getCorrelations(@Query("lagDays") lagDays?: string, @Query("topic") topic?: string) {
    return this.service.getCorrelations(lagDays ? Number(lagDays) : 1, topic);
  }
}
