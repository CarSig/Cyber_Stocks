import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { AuditService } from "@/modules/audit/audit.service";
import { CronService } from "@/modules/scheduler/cron.service";
import { paginationSchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";
import { AdminGuard } from "@/common/guards/admin.guard";

const JOBS = ["populate", "news", "trump", "reddit", "threatintel"] as const;
type Job = typeof JOBS[number];

@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly cronService: CronService,
  ) {}

  @Get("audit")
  getAudit(@Query() query: Record<string, string>) {
    const parsed = paginationSchema.safeParse(query);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    return this.auditService.getAll({ ...parsed.data, userId: query.userId, action: query.action });
  }

  @Post("trigger/:job")
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
}
