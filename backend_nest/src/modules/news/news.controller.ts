import { Controller, Get, Post, Param, Query, Sse, MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import { startWith } from "rxjs/operators";
import { NewsAnalysisService } from "./news-analysis.service";
import { AuditService } from "@/modules/audit/audit.service";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { checkOllama } from "@/shared/utils/ollamaAnalyzer";
import { resolveTicker } from "@/shared/ticker.utils";
import { lagDaysSchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import type { User } from "@/types/index";

@Controller()
export class NewsController {
  constructor(
    private readonly newsAnalysisService: NewsAnalysisService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Get("ollama/status")
  async ollamaStatus() {
    return checkOllama();
  }

  @Get("news-analysis/:ticker")
  async getAnalysis(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.newsAnalysisService.readAnalysis(r.name);
  }

  @Post("news-analyze/:ticker")
  async analyze(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "news_analyze", { ticker: r.ticker });
    const result = await this.newsAnalysisService.analyzeForTicker(r.ticker);
    if (result.queued > 0) this.notificationsService.initProgress(r.ticker, result.queued);
    return result;
  }

  @Sse("news-analyze/:ticker/progress")
  @AllowQueryToken()
  progress(@Param("ticker") ticker: string): Observable<MessageEvent> {
    const r = resolveTicker(ticker);
    return this.notificationsService.streamProgress(r.ticker).pipe(
      startWith({ data: { type: "connected", ticker: r.ticker } } as MessageEvent),
    );
  }

  @Get("news-correlation/:ticker")
  async correlation(@Param("ticker") ticker: string, @Query("lagDays") lagDays: string) {
    const r = resolveTicker(ticker);
    const parsed = lagDaysSchema.safeParse(lagDays ?? "1");
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    return this.newsAnalysisService.correlate(r.ticker, parsed.data);
  }
}
