import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { CyberNewsService } from "./cyber-news.service";
import { AppError } from "@/shared/errors";
import { CyberNewsLagQueryDto, CyberNewsLimitQueryDto, TopicQueryDto } from "@/shared/dto";

@ApiTags("Cyber News")
@ApiBearerAuth("bearer")
@Controller("cyber-news")
export class CyberNewsController {
  constructor(private readonly service: CyberNewsService) {}

  @Get("tickers")
  @ApiOperation({ summary: "All tickers with cyber news" })
  @ApiResponse({ status: 200 })
  getTickers(@Query() { topic }: TopicQueryDto) {
    return this.service.getTickers(topic);
  }

  @Get("recent")
  @ApiOperation({ summary: "Recent articles across all companies" })
  @ApiResponse({ status: 200 })
  getRecent(@Query() { limit = 50 }: CyberNewsLimitQueryDto) {
    return this.service.getRecentArticles(limit);
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
  @ApiResponse({ status: 200 })
  @ApiResponse({ status: 404 })
  async getSummary(@Param("ticker") ticker: string, @Query() { topic }: TopicQueryDto) {
    const data = await this.service.getSummary(ticker.toUpperCase(), topic);
    if (!data) throw new AppError(`No cyber news for ${ticker}`, 404);
    return data;
  }

  @Get(":ticker/articles")
  @ApiOperation({ summary: "Articles for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200 })
  getArticles(@Param("ticker") ticker: string, @Query() { topic }: TopicQueryDto) {
    return this.service.getArticles(ticker.toUpperCase(), topic);
  }

  @Get("correlations")
  @ApiOperation({ summary: "Sentiment ↔ price correlation across all tickers" })
  @ApiResponse({ status: 200 })
  getCorrelations(@Query() { lagDays = 1, topic }: CyberNewsLagQueryDto) {
    return this.service.getCorrelations(lagDays, topic);
  }
}
