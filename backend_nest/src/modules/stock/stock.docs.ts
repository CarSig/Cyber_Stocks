import { applyDecorators } from "@nestjs/common";
import { ApiExtraModels, ApiOperation, ApiParam, ApiResponse, getSchemaPath } from "@nestjs/swagger";
import { CorrelationResultDto, QuoteDto, SimulationResultDto, SparklineDto } from "./stock.dto";

export const GetCompaniesDoc = () => applyDecorators(
  ApiOperation({ summary: "List all companies", description: "Returns the full ticker → company name map for all tracked companies." }),
  ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { type: "string" }, example: { CRWD: "CrowdStrike", PANW: "Palo Alto Networks", FTNT: "Fortinet" } } }),
);

export const CorrelationMatrixDoc = () => applyDecorators(
  ApiOperation({ summary: "Pearson correlation matrix", description: "Full NxN Pearson correlation matrix for all companies using log-returns. Cached server-side with a 7-day TTL." }),
  ApiResponse({ status: 200, schema: { type: "object", properties: {
    matrix: { type: "object", additionalProperties: { type: "object", additionalProperties: { type: "number", nullable: true } }, description: "NxN Pearson correlation matrix keyed by company name" },
    tickers: { type: "array", items: { type: "string" } },
    names: { type: "array", items: { type: "string" } },
    lagDays: { type: "number" },
    windowDays: { type: "number" },
    startDate: { type: "string", nullable: true },
    endDate: { type: "string", nullable: true },
  } } }),
  ApiResponse({ status: 400, description: "Invalid query parameter" }),
);

export const CorrelateDoc = () => applyDecorators(
  ApiOperation({ summary: "Correlate two stocks", description: "Computes Pearson correlation between two tickers using log-returns over a configurable window." }),
  ApiParam({ name: "tickerA", description: "First ticker symbol (e.g. CRWD)" }),
  ApiParam({ name: "tickerB", description: "Second ticker symbol (e.g. PANW)" }),
  ApiResponse({ status: 200, type: CorrelationResultDto }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);

export const GetSparklinesDoc = () => applyDecorators(
  ApiOperation({ summary: "Sparkline data", description: "Lightweight last-30-day price series for multiple tickers in one request. Cached server-side with a 24h TTL." }),
  ApiExtraModels(SparklineDto),
  ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { $ref: getSchemaPath(SparklineDto) }, description: "Map of ticker symbol → SparklineDto" } }),
);

export const GetPresetsDoc = () => applyDecorators(
  ApiOperation({ summary: "Simulation presets", description: "Returns pre-built buy/sell signal strategies for a ticker, ready to pass to POST /simulate/:ticker." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 200, description: "Map of strategy name → SimulationAction[]" }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);

export const GetTickerDoc = () => applyDecorators(
  ApiOperation({ summary: "Full ticker data", description: "Returns price history, latest news articles, Yahoo Finance summary, and trend/momentum/volatility analysis for one ticker." }),
  ApiParam({ name: "ticker", description: "Ticker symbol (e.g. CRWD)" }),
  ApiExtraModels(QuoteDto),
  ApiResponse({ status: 200, schema: { type: "object", properties: {
    history: { type: "object", properties: { quotes: { type: "array", items: { $ref: getSchemaPath(QuoteDto) } } } },
    news: { type: "array", items: { type: "object" } },
    summary: { type: "object", description: "Yahoo Finance summary data" },
    analysis: { type: "object", properties: {
      trend: { type: "string" },
      momentum: { type: "number" },
      volatility: { type: "number" },
    } },
  } } }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);

export const SimulateDoc = () => applyDecorators(
  ApiOperation({ summary: "Run backtest simulation", description: "Runs a portfolio backtest for a ticker given a sequence of buy/sell actions with dates and share values." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 201, type: SimulationResultDto }),
  ApiResponse({ status: 400, description: "Invalid actions payload" }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);
