import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import companies from "@/data/companies";
import { StockService } from "./stock.service";
import { SimulationService } from "./simulation.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker, tickerToName } from "@/shared/ticker.utils";
import { windowDaysSchema, lagDaysSchema, simulateBodySchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";

@Controller()
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly simulationService: SimulationService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  getCompanies() {
    return companies;
  }

  @Get("correlate/:tickerA/:tickerB")
  async correlate(
    @Param("tickerA") tickerA: string,
    @Param("tickerB") tickerB: string,
    @Query("windowDays") windowDays: string,
    @Query("lagDays") lagDays: string,
    @CurrentUser() user: User,
  ) {
    const a = tickerA.toUpperCase();
    const b = tickerB.toUpperCase();
    const nameA = tickerToName[a];
    const nameB = tickerToName[b];
    if (!nameA) throw new AppError(`Unknown ticker: ${a}`, 404);
    if (!nameB) throw new AppError(`Unknown ticker: ${b}`, 404);
    const winParsed = windowDaysSchema.safeParse(windowDays);
    if (!winParsed.success) throw new AppError(winParsed.error.issues[0].message, 400);
    const lagParsed = lagDaysSchema.safeParse(lagDays);
    if (!lagParsed.success) throw new AppError(lagParsed.error.issues[0].message, 400);
    this.auditService.log(user, "correlate", { tickerA: a, tickerB: b });
    return await this.stockService.correlate(nameA, nameB, winParsed.data, lagParsed.data);
  }

  @Get("sparklines")
  async getSparklines(@Query("tickers") tickers: string) {
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
  async getPresets(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.simulationService.getPresets(r.name, r.ticker);
  }

  @Get(":ticker")
  async getTicker(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "view_ticker", { ticker: r.ticker });
    return this.stockService.getTickerData(r.name);
  }

  @Post("simulate/:ticker")
  async simulate(
    @Param("ticker") ticker: string,
    @Body() body: unknown,
    @CurrentUser() user: User,
  ) {
    const r = resolveTicker(ticker);
    const parsed = simulateBodySchema.safeParse(body);
    if (!parsed.success) throw new AppError(parsed.error.issues[0].message, 400);
    this.auditService.log(user, "simulate", { ticker: r.ticker, actionCount: parsed.data.actions.length });
    return await this.simulationService.runSimulation(r.name, parsed.data.actions);
  }
}
