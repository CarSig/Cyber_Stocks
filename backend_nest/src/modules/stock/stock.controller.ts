import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import companies from "@/data/companies";
import { StockService } from "./stock.service";
import { SimulationService } from "./simulation.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker, tickerToName } from "@/shared/ticker.utils";
import { AppError } from "@/shared/errors";
import { CorrelationQueryDto, CorrelationMatrixQueryDto, SparklinesQueryDto } from "@/shared/dto";
import { SimulateBodyDto } from "./stock.dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { GetCompaniesDoc, CorrelationMatrixDoc, CorrelateDoc, GetSparklinesDoc, GetPresetsDoc, GetTickerDoc, SimulateDoc } from "./stock.docs";
import type { User } from "@/types/index";

@ApiTags("Stock")
@ApiBearerAuth("bearer")
@Controller("stocks")
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly simulationService: SimulationService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @GetCompaniesDoc()
  getCompanies() {
    return companies;
  }

  @Get("correlation-matrix")
  @CorrelationMatrixDoc()
  async correlationMatrix(@Query() query: CorrelationMatrixQueryDto) {
    const { lagDays = 0, windowDays = 90, startDate, endDate } = query;

    const today = new Date().toISOString().slice(0, 10);
    if (startDate && startDate >= today) throw new AppError("startDate must be before today", 400);
    if (endDate && endDate > today) throw new AppError("endDate cannot be in the future", 400);
    if (startDate && endDate && startDate >= endDate) throw new AppError("startDate must be before endDate", 400);

    return await this.stockService.correlationMatrix(lagDays, windowDays, startDate, endDate);
  }

  @Get("correlate/:tickerA/:tickerB")
  @CorrelateDoc()
  async correlate(
    @Param("tickerA") tickerA: string,
    @Param("tickerB") tickerB: string,
    @Query() query: CorrelationQueryDto,
    @CurrentUser() user: User,
  ) {
    const a = tickerA.toUpperCase();
    const b = tickerB.toUpperCase();
    const nameA = tickerToName[a];
    const nameB = tickerToName[b];
    if (!nameA) throw new AppError(`Unknown ticker: ${a}`, 404);
    if (!nameB) throw new AppError(`Unknown ticker: ${b}`, 404);
    this.auditService.log(user, "correlate", { tickerA: a, tickerB: b });
    return await this.stockService.correlate(nameA, nameB, query.windowDays, query.lagDays);
  }

  @Get("sparklines")
  @GetSparklinesDoc()
  async getSparklines(@Query() { tickers }: SparklinesQueryDto) {
    if (!tickers) return {};
    const tickerList = tickers.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
    const result: Record<string, unknown> = {};
    await Promise.all(tickerList.map(async (t) => {
      const name = tickerToName[t];
      if (!name) return;
      try {
        result[t] = await this.stockService.sparkline(name);
      } catch {
        // skip tickers with no data
      }
    }));
    return result;
  }

  @Get("simulation-presets/:ticker")
  @GetPresetsDoc()
  async getPresets(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.simulationService.getPresets(r.name, r.ticker);
  }

  @Get(":ticker")
  @GetTickerDoc()
  async getTicker(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "view_ticker", { ticker: r.ticker });
    return this.stockService.getTickerData(r.name);
  }

  @Post("simulate/:ticker")
  @SimulateDoc()
  async simulate(
    @Param("ticker") ticker: string,
    @Body() body: SimulateBodyDto,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "simulate", { ticker: r.ticker, actionCount: body.actions.length });
    return await this.simulationService.runSimulation(r.name, body.actions);
  }
}
