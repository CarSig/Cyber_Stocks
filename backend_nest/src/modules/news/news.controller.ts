import { Controller, Get, Post, Param, Query, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Observable } from "rxjs";
import { startWith } from "rxjs/operators";
import { NewsAnalysisService } from "./news-analysis.service";
import { AuditService } from "@/modules/audit/audit.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { checkOllama } from "@/shared/utils/ollamaAnalyzer";
import { resolveTicker } from "@/shared/ticker.utils";
import { LagDaysDto, ArticleSentimentDto, CorrelationWithImpactDto } from "@/shared/dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import type { User } from "@/types/index";

@ApiTags("News")
@ApiBearerAuth("bearer")
@Controller()
export class NewsController {
  constructor(
    private readonly newsAnalysisService: NewsAnalysisService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("ollama/status")
  @ApiOperation({ summary: "Ollama status", description: "Checks whether the local Ollama LLM service is reachable and returns the active model name." })
  @ApiResponse({ status: 200, description: "{ running: boolean, model: string }" })
  async ollamaStatus() {
    return checkOllama();
  }

  @Get("news-analysis/:ticker")
  @ApiOperation({ summary: "Get sentiment scores", description: "Returns stored sentiment, importance, and relevance scores for all analysed news articles for the ticker." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { $ref: "#/components/schemas/ArticleSentimentDto" }, description: "Map of article URL → ArticleSentimentDto" } })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async getAnalysis(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.newsAnalysisService.readAnalysis(r.name);
  }

  @Post("news-analyze/:ticker")
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: "Enqueue news for analysis", description: "Queues all unanalysed news articles for the ticker to RabbitMQ for Ollama sentiment processing. Rate limited to 10 req/60s." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 201, description: "{ queued: number, total: number }" })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  @ApiResponse({ status: 429, description: "Rate limit exceeded" })
  async analyze(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "news_analyze", { ticker: r.ticker });
    const result = await this.newsAnalysisService.analyzeForTicker(r.ticker);
    if (result.queued > 0) this.notificationsService.initProgress(r.ticker, result.queued);
    return result;
  }

  @Sse("news-analyze/:ticker/progress")
  @AllowQueryToken()
  @ApiOperation({ summary: "Analysis progress stream (SSE)", description: "Server-Sent Events stream reporting progress of a running news analysis job. Accepts ?token= instead of Authorization header." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, description: "SSE stream: { type, ticker, done?, progress? }" })
  progress(@Param("ticker") ticker: string): Observable<MessageEvent> {
    const r = resolveTicker(ticker);
    return this.notificationsService.streamProgress(r.ticker).pipe(
      startWith({ data: { type: "connected", ticker: r.ticker } } as MessageEvent),
    );
  }

  @Get("news-correlation/:ticker")
  @ApiOperation({ summary: "News–price correlation", description: "Correlates news sentiment events with stock price movements using Pearson correlation and lag-bucketed impact analysis." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, type: CorrelationWithImpactDto })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async correlation(@Param("ticker") ticker: string, @Query() { lagDays }: LagDaysDto) {
    const r = resolveTicker(ticker);
    return this.newsAnalysisService.correlate(r.ticker, lagDays ?? 1);
  }
}
