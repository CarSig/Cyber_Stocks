import { Controller, Get, Post, Param, Query, UseGuards, Sse, MessageEvent, BadRequestException } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { AuditService } from "@/modules/audit/audit.service";
import { CronService } from "@/modules/scheduler/cron.service";
import { EdgarService } from "@/modules/edgar/edgar.service";
import { StockService } from "@/modules/stock/stock.service";
import { CoreDbService } from "@/shared/core-db.service";
import { AuditQueryDto } from "@/shared/dto";
import { AppError } from "@/shared/errors";
import { resolveTicker } from "@/shared/ticker.utils";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";
import { GetAuditDoc, TriggerJobDoc } from "./admin.docs";

const JOBS = ["populate", "news", "trump", "reddit", "threatintel"] as const;
type Job = typeof JOBS[number];

@ApiTags("Admin")
@ApiBearerAuth("bearer")
@Controller("admin")
@UseGuards(RolesGuard)
@Roles("admin")
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly cronService: CronService,
    private readonly edgarService: EdgarService,
    private readonly stockService: StockService,
    private readonly coreDbService: CoreDbService,
  ) {}

  @Get("audit")
  @GetAuditDoc()
  getAudit(@Query() query: AuditQueryDto) {
    return this.auditService.getAll({
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      userId: query.userId,
      action: query.action,
    });
  }

  @Post("trigger/edgar-sync-all")
  triggerEdgarSyncAll() {
    this.edgarService.startSyncAll();
    return { triggered: "edgar-sync-all", running: this.edgarService.isSyncAllRunning, at: new Date().toISOString() };
  }

  @Post("trigger/edgar-backfill-coverage")
  async triggerEdgarBackfillCoverage() {
    const result = await this.edgarService.backfillCoverage();
    return { triggered: "edgar-backfill-coverage", ...result, at: new Date().toISOString() };
  }

  @Post("trigger/stock-backfill-history")
  triggerStockBackfillHistory(@Query("from") from?: string) {
    const fromDate = from ?? "2019-01-01";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate)) throw new BadRequestException("from must be YYYY-MM-DD");
    void this.cronService.backfillStockHistory(fromDate);
    return { triggered: "stock-backfill-history", fromDate, started: true, at: new Date().toISOString() };
  }

  @Post("trigger/:job")
  @TriggerJobDoc()
  async triggerJob(@Param("job") job: string) {
    if (!JOBS.includes(job as Job)) throw new AppError(`Unknown job. Valid: ${JOBS.join(", ")}`, 400);
    switch (job as Job) {
      case "populate":    await this.cronService.runPopulate(); break;
      case "news":        await this.cronService.runNews(); break;
      case "trump":       await this.cronService.runFetchTrump(); break;
      case "reddit":      await this.cronService.runFetchReddit(); break;
      case "threatintel": await this.cronService.runThreatIntelSync(); break;
    }
    return { triggered: job, at: new Date().toISOString() };
  }

  @Post("run-migrations")
  async runMigrations() {
    await this.coreDbService.runMigrations();
    return { ok: true, at: new Date().toISOString() };
  }

  @Post("cache/invalidate/:ticker")
  async invalidateCache(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    await this.stockService.invalidateTicker(r.name);
    this.auditService.log(user, "invalidate_cache", { ticker: r.ticker });
    return { invalidated: r.ticker, at: new Date().toISOString() };
  }

  @Get("edgar-sync-all/status")
  edgarSyncAllStatus() {
    return { running: this.edgarService.isSyncAllRunning };
  }

  @Sse("edgar-sync-all/progress")
  @AllowQueryToken()
  edgarSyncAllProgress(): Observable<MessageEvent> {
    return this.edgarService.streamSyncAll();
  }
}
