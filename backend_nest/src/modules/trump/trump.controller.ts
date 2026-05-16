import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { TrumpService } from "./trump.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker } from "@/shared/ticker.utils";
import { LagDaysDto } from "@/shared/dto";
import { TrumpPostDto } from "./trump.dto";
import { CorrelationWithImpactDto, LagImpactResultDto } from "@/modules/stock/stock.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";

@ApiTags("Trump")
@ApiBearerAuth("bearer")
@Controller("trump")
export class TrumpController {
  constructor(
    private readonly trumpService: TrumpService,
    private readonly auditService: AuditService,
  ) {}

  @Get("posts")
  @ApiOperation({ summary: "All Truth Social posts", description: "Returns all stored Trump Truth Social posts with their AI-generated ticker mention analysis." })
  @ApiResponse({ status: 200, type: [TrumpPostDto] })
  getAllPosts() {
    return this.trumpService.getAllPosts();
  }

  @Get("posts/:ticker")
  @ApiOperation({ summary: "Posts mentioning a ticker", description: "Returns only the Trump posts whose AI analysis identified a mention of the given ticker." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, type: [TrumpPostDto] })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  getPostsForTicker(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.trumpService.getPostsForTicker(r.ticker);
  }

  @Get("correlate/:ticker")
  @ApiOperation({ summary: "Trump post–price correlation", description: "Correlates dates of Trump posts mentioning the ticker with subsequent stock price movements." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, type: CorrelationWithImpactDto })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async getCorrelation(
    @Param("ticker") ticker: string,
    @Query() { lagDays }: LagDaysDto,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "trump_correlation", { ticker: r.ticker, lagDays });
    return this.trumpService.getCorrelation(r.name, r.ticker, lagDays ?? 1);
  }

  @Get("lag-impact/:ticker")
  @ApiOperation({ summary: "Trump post lag impact", description: "Returns lag-bucketed average stock price changes in the days following positive, negative, and neutral Trump post sentiment." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, type: LagImpactResultDto })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async getLagImpact(
    @Param("ticker") ticker: string,
    @Query() { lagDays }: LagDaysDto,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "trump_lag_impact", { ticker: r.ticker, lagDays });
    return this.trumpService.getLagImpact(r.name, r.ticker, lagDays ?? 1);
  }
}
