import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";
import { ArticleSentimentDto } from "./news.dto";
import { CorrelationWithImpactDto } from "@/modules/stock/stock.dto";

export const AnthropicStatusDoc = () => applyDecorators(
  ApiOperation({ summary: "Anthropic status", description: "Checks whether the Anthropic API key is configured and returns the active model name." }),
  ApiResponse({ status: 200, description: "{ url: string, model: string }" }),
);

export const GetAnalysisDoc = () => applyDecorators(
  ApiOperation({ summary: "Get sentiment scores", description: "Returns stored sentiment, importance, and relevance scores for all analysed news articles for the ticker." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 200, schema: { type: "object", additionalProperties: { $ref: "#/components/schemas/ArticleSentimentDto" }, description: "Map of article URL → ArticleSentimentDto" } }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);

export const AnalyzeDoc = () => applyDecorators(
  ApiOperation({ summary: "Enqueue news for analysis", description: "Queues all unanalysed news articles for the ticker to RabbitMQ for Anthropic sentiment processing. Rate limited to 10 req/60s." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 201, description: "{ queued: number, total: number }" }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
  ApiResponse({ status: 429, description: "Rate limit exceeded" }),
);

export const ProgressDoc = () => applyDecorators(
  ApiOperation({ summary: "Analysis progress stream (SSE)", description: "Server-Sent Events stream reporting progress of a running news analysis job. Accepts ?token= instead of Authorization header." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 200, description: "SSE stream: { type, ticker, done?, progress? }" }),
);

export const NewsCorrelationDoc = () => applyDecorators(
  ApiOperation({ summary: "News–price correlation", description: "Correlates news sentiment events with stock price movements using Pearson correlation and lag-bucketed impact analysis." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 200, type: CorrelationWithImpactDto }),
  ApiResponse({ status: 404, description: "Unknown ticker" }),
);
