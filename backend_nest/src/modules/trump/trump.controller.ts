import { Controller, Get, Param, Query } from "@nestjs/common";
import { TrumpService } from "./trump.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker } from "@/shared/ticker.utils";
import { lagDaysSchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";

@Controller()
export class TrumpController {
  constructor(
    private readonly trumpService: TrumpService,
    private readonly auditService: AuditService,
  ) {}

  @Get("trump-posts")
  getAllPosts() {
    return this.trumpService.getAllPosts();
  }

  @Get("trump-posts/:ticker")
  getPostsForTicker(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.trumpService.getPostsForTicker(r.ticker);
  }

  @Get("correlate-trump/:ticker")
  async getCorrelation(
    @Param("ticker") ticker: string,
    @Query("lagDays") lagDays: string,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    const parsed = lagDaysSchema.safeParse(lagDays ?? "1");
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    this.auditService.log(user, "trump_correlation", { ticker: r.ticker, lagDays: parsed.data });
    return this.trumpService.getCorrelation(r.name, r.ticker, parsed.data);
  }

  @Get("trump-lag-impact/:ticker")
  async getLagImpact(
    @Param("ticker") ticker: string,
    @Query("lagDays") lagDays: string,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    const parsed = lagDaysSchema.safeParse(lagDays ?? "1");
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    this.auditService.log(user, "trump_lag_impact", { ticker: r.ticker, lagDays: parsed.data });
    return this.trumpService.getLagImpact(r.name, r.ticker, parsed.data);
  }
}
