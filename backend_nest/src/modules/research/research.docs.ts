import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

export const StreamResearchDoc = () => applyDecorators(
  ApiOperation({ summary: "Market research stream (SSE)", description: "Streams AI-generated market research for a ticker across three sections: Latest News, Analyst Outlook, and Competitive Landscape. Accepts ?token= instead of Authorization header. Rate limited to 5 req/60s." }),
  ApiParam({ name: "ticker", description: "Ticker symbol" }),
  ApiResponse({ status: 200, description: "SSE stream: { section, text?, sectionDone, done }" }),
  ApiResponse({ status: 429, description: "Rate limit exceeded (strict tier)" }),
  ApiResponse({ status: 503, description: "Tavily API key not configured" }),
);

export const StreamChatDoc = () => applyDecorators(
  ApiOperation({ summary: "AI chat stream (SSE)", description: "Streams a conversational AI response as Server-Sent Events. Pass the full message history to maintain context across turns. Rate limited to 10 req/60s." }),
  ApiResponse({ status: 201, description: "SSE stream: { text, done } then { done: true, messages }" }),
  ApiResponse({ status: 400, description: "Invalid request body" }),
  ApiResponse({ status: 429, description: "Rate limit exceeded (strict tier)" }),
);
