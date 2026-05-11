import { Controller, Get, Post, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { AuditService } from "@/modules/audit/audit.service";
import { CronService } from "@/modules/scheduler/cron.service";
import { AuditQueryDto, PaginatedAuditDto } from "@/shared/dto";
import { AppError } from "@/shared/errors";
import { AdminGuard } from "@/common/guards/admin.guard";

const JOBS = ["populate", "news", "trump", "reddit", "threatintel"] as const;
type Job = typeof JOBS[number];

@ApiTags("Admin")
@ApiBearerAuth("bearer")
@Controller("admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly auditService: AuditService,
    private readonly cronService: CronService,
  ) {}

  @Get("audit")
  @ApiOperation({ summary: "Audit log", description: "Paginated audit log of all user actions, newest first. Filterable by userId and action type. Admin only." })
  @ApiResponse({ status: 200, type: PaginatedAuditDto })
  @ApiResponse({ status: 403, description: "Admin role required" })
  getAudit(@Query() query: AuditQueryDto) {
    return this.auditService.getAll({
      limit: query.limit ?? 50,
      offset: query.offset ?? 0,
      userId: query.userId,
      action: query.action,
    });
  }

  @Post("trigger/:job")
  @ApiOperation({ summary: "Trigger cron job", description: "Manually triggers a background job outside its normal schedule. Admin only." })
  @ApiParam({ name: "job", description: "Job name", enum: ["populate", "news", "trump", "reddit", "threatintel"] })
  @ApiResponse({ status: 201, description: "{ triggered: string, at: string }" })
  @ApiResponse({ status: 400, description: "Unknown job name" })
  @ApiResponse({ status: 403, description: "Admin role required" })
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
