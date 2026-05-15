import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";

export const GetBarsDoc = () => applyDecorators(
  ApiOperation({ summary: "Intraday 1-minute bars", description: "Returns all 1-minute OHLCV bars for a ticker on a given trading day via Alpaca." }),
  ApiParam({ name: "ticker", description: "Ticker symbol (e.g. AAPL)" }),
  ApiQuery({ name: "date", description: "Trading date in YYYY-MM-DD format", example: "2024-01-15" }),
  ApiQuery({ name: "timeframe", description: "Bar timeframe", enum: ["1Min", "5Min", "15Min", "30Min", "1Hour"], required: false }),
  ApiResponse({ status: 200, schema: { type: "object", properties: {
    symbol: { type: "string" },
    bars: { type: "array", items: { type: "object", properties: {
      t: { type: "string" }, o: { type: "number" }, h: { type: "number" },
      l: { type: "number" }, c: { type: "number" }, v: { type: "number" }, vw: { type: "number" },
    } } },
  } } }),
  ApiResponse({ status: 400, description: "Missing or invalid date" }),
  ApiResponse({ status: 404, description: "No data for this ticker/date" }),
);
