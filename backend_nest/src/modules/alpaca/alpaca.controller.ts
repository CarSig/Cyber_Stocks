import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { AlpacaService } from "./alpaca.service";
import { AppError } from "@/shared/errors";

@ApiTags("Alpaca")
@ApiBearerAuth("bearer")
@Controller("alpaca")
export class AlpacaController {
  constructor(private readonly alpacaService: AlpacaService) {}

  @Get("bars/:ticker")
  @ApiOperation({ summary: "Intraday 1-minute bars", description: "Returns all 1-minute OHLCV bars for a ticker on a given trading day via Alpaca." })
  @ApiParam({ name: "ticker", description: "Ticker symbol (e.g. AAPL)" })
  @ApiQuery({ name: "date", description: "Trading date in YYYY-MM-DD format", example: "2024-01-15" })
  @ApiQuery({ name: "timeframe", description: "Bar timeframe", enum: ["1Min","5Min","15Min","30Min","1Hour"], required: false })
  @ApiResponse({ status: 200, schema: { type: "object", properties: {
    symbol: { type: "string" },
    bars: { type: "array", items: { type: "object", properties: {
      t: { type: "string" }, o: { type: "number" }, h: { type: "number" },
      l: { type: "number" }, c: { type: "number" }, v: { type: "number" }, vw: { type: "number" },
    } } },
  } } })
  @ApiResponse({ status: 400, description: "Missing or invalid date" })
  @ApiResponse({ status: 404, description: "No data for this ticker/date" })
  async getBars(@Param("ticker") ticker: string, @Query("date") date: string, @Query("timeframe") timeframe = "1Min") {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError("date query param is required (YYYY-MM-DD)", 400);
    }
    return this.alpacaService.getBars(ticker.toUpperCase(), date, timeframe);
  }
}
