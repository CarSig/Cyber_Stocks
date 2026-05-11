import { Controller, Get, Post, Param, Query, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import companies from "@/data/companies";
import { StockService } from "./stock.service";
import { SimulationService } from "./simulation.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker, tickerToName } from "@/shared/ticker.utils";
import { AppError } from "@/shared/errors";
import { CorrelationQueryDto, CorrelationMatrixQueryDto, SimulateBodyDto,
         CorrelationResultDto, SimulationResultDto, SparklineDto } from "@/shared/dto";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@/types/index";

@ApiTags("Stock")
@ApiBearerAuth("bearer")
@Controller()
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly simulationService: SimulationService,
    private readonly auditService: AuditService,
  ) {}

  @Get()
  @ApiOperation({ summary: "List all companies", description: "Returns the full ticker → company name map for all tracked companies." })
  @ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { type: "string" }, example: { CRWD: "CrowdStrike", PANW: "Palo Alto Networks", FTNT: "Fortinet" } } })
  getCompanies() {
    return companies;
  }

  @Get("correlation-matrix")
  @ApiOperation({ summary: "Pearson correlation matrix", description: "Full NxN Pearson correlation matrix for all companies using log-returns. Cached server-side with a 7-day TTL." })
  @ApiResponse({ status: 200, schema: { type: "object", properties: {
    matrix: { type: "object", additionalProperties: { type: "object", additionalProperties: { type: "number", nullable: true } }, description: "NxN Pearson correlation matrix keyed by company name" },
    tickers: { type: "array", items: { type: "string" } },
    names: { type: "array", items: { type: "string" } },
    lagDays: { type: "number" },
    windowDays: { type: "number" },
    startDate: { type: "string", nullable: true },
    endDate: { type: "string", nullable: true },
  } } })
  @ApiResponse({ status: 400, description: "Invalid query parameter" })
  async correlationMatrix(@Query() query: CorrelationMatrixQueryDto) {
    const { lagDays = 0, windowDays = 90, startDate, endDate } = query;

    const today = new Date().toISOString().slice(0, 10);
    if (startDate && startDate >= today) throw new AppError("startDate must be before today", 400);
    if (endDate && endDate > today) throw new AppError("endDate cannot be in the future", 400);
    if (startDate && endDate && startDate >= endDate) throw new AppError("startDate must be before endDate", 400);

    return await this.stockService.correlationMatrix(lagDays, windowDays, startDate, endDate);
  }

  @Get("correlate/:tickerA/:tickerB")
  @ApiOperation({ summary: "Correlate two stocks", description: "Computes Pearson correlation between two tickers using log-returns over a configurable window." })
  @ApiParam({ name: "tickerA", description: "First ticker symbol (e.g. CRWD)" })
  @ApiParam({ name: "tickerB", description: "Second ticker symbol (e.g. PANW)" })
  @ApiResponse({ status: 200, type: CorrelationResultDto })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
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
  @ApiOperation({ summary: "Sparkline data", description: "Lightweight last-30-day price series for multiple tickers in one request. Cached server-side with a 24h TTL." })
  @ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { $ref: "#/components/schemas/SparklineDto" }, description: "Map of ticker symbol → SparklineDto" } })
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
  @ApiOperation({ summary: "Simulation presets", description: "Returns pre-built buy/sell signal strategies for a ticker, ready to pass to POST /simulate/:ticker." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, description: "Map of strategy name → SimulationAction[]" })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async getPresets(@Param("ticker") ticker: string) {
    const r = resolveTicker(ticker);
    return this.simulationService.getPresets(r.name, r.ticker);
  }

  @Get(":ticker")
  @ApiOperation({ summary: "Full ticker data", description: "Returns price history, latest news articles, Yahoo Finance summary, and trend/momentum/volatility analysis for one ticker." })
  @ApiParam({ name: "ticker", description: "Ticker symbol (e.g. CRWD)" })
  @ApiResponse({ status: 200, schema: { type: "object", properties: {
    history: { type: "object", properties: { quotes: { type: "array", items: { $ref: "#/components/schemas/QuoteDto" } } } },
    news: { type: "array", items: { type: "object" } },
    summary: { type: "object", description: "Yahoo Finance summary data" },
    analysis: { type: "object", properties: {
      trend: { type: "string" },
      momentum: { type: "number" },
      volatility: { type: "number" },
    } },
  } } })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
  async getTicker(@Param("ticker") ticker: string, @CurrentUser() user: User) {
    const r = resolveTicker(ticker);
    this.auditService.log(user, "view_ticker", { ticker: r.ticker });
    return this.stockService.getTickerData(r.name);
  }

  @Post("simulate/:ticker")
  @ApiOperation({ summary: "Run backtest simulation", description: "Runs a portfolio backtest for a ticker given a sequence of buy/sell actions with dates and share values." })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 201, type: SimulationResultDto })
  @ApiResponse({ status: 400, description: "Invalid actions payload" })
  @ApiResponse({ status: 404, description: "Unknown ticker" })
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
