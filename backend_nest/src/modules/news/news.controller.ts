import { Controller, Get, Post, Param, Query, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Observable } from "rxjs";
import { startWith } from "rxjs/operators";
import { NewsAnalysisService } from "./news-analysis.service";
import { AuditService } from "@/modules/audit/audit.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { checkAnthropic } from "@/shared/utils/anthropicAnalyzer";
import { resolveTicker } from "@/shared/ticker.utils";
import { LagDaysDto } from "@/shared/dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { AnthropicStatusDoc, GetAnalysisDoc, AnalyzeDoc, ProgressDoc, NewsCorrelationDoc } from "./news.docs";
import type { User } from "@/types/index";

@ApiTags("News")
@ApiBearerAuth("bearer")
@Controller("news")
export class NewsController {
  constructor(
    private readonly newsAnalysisService: NewsAnalysisService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("anthropic/status")
  @AnthropicStatusDoc()
  async anthropicStatus() {
    return checkAnthropic();
  }

  @Get("analysis/:ticker")
  @GetAnalysisDoc()
  async getAnalysis(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.newsAnalysisService.readAnalysis(r.name);
  }

  @Post("analyze/:ticker")
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  @AnalyzeDoc()
  async analyze(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "news_analyze", { ticker: r.ticker });
    const result = await this.newsAnalysisService.analyzeForTicker(r.ticker);
    if (result.queued > 0) this.notificationsService.initProgress(r.ticker, result.queued);
    return result;
  }

  @Sse("analyze/:ticker/progress")
  @AllowQueryToken()
  @ProgressDoc()
  progress(@Param("ticker") ticker: string): Observable<MessageEvent> {
    const r = resolveTicker(ticker);
    return this.notificationsService.streamProgress(r.ticker).pipe(
      startWith({ data: { type: "connected", ticker: r.ticker } } as MessageEvent),
    );
  }

  @Get("correlation/:ticker")
  @NewsCorrelationDoc()
  async correlation(@Param("ticker") ticker: string, @Query() { lagDays }: LagDaysDto) {
    const r = resolveTicker(ticker);
    return this.newsAnalysisService.correlate(r.ticker, lagDays ?? 1);
  }
}
