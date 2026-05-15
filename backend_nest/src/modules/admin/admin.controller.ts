import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AuditService } from "@/modules/audit/audit.service";
import { CronService } from "@/modules/scheduler/cron.service";
import { AuditQueryDto } from "@/shared/dto";
import { AppError } from "@/shared/errors";
import { RolesGuard } from "@/common/guards/roles.guard";
import { Roles } from "@/common/decorators/roles.decorator";
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
}
