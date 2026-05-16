import { Registry, collectDefaultMetrics, Histogram, Counter, Gauge } from "prom-client";

export const registry = new Registry();

collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [registry],
});

export const httpRequestTotal = new Counter({
  name: "http_requests_total",
  help: "Total HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [registry],
});

export const sseActiveConnections = new Gauge({
  name: "sse_active_connections",
  help: "Active SSE connections",
  registers: [registry],
});

// Cron jobs
export const cronJobDuration = new Histogram({
  name: "cron_job_duration_seconds",
  help: "Cron job execution duration in seconds",
  labelNames: ["job"],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [registry],
});

export const cronJobRunsTotal = new Counter({
  name: "cron_job_runs_total",
  help: "Total cron job executions",
  labelNames: ["job", "status"],
  registers: [registry],
});

// News pipeline
export const newsArticlesQueuedTotal = new Counter({
  name: "news_articles_queued_total",
  help: "Total news articles published to the analysis queue",
  labelNames: ["ticker"],
  registers: [registry],
});

export const newsArticlesProcessedTotal = new Counter({
  name: "news_articles_processed_total",
  help: "Total news articles processed by the worker",
  labelNames: ["status"], // success | skipped | failed
  registers: [registry],
});

export const rabbitmqDlxMessagesTotal = new Counter({
  name: "rabbitmq_dlx_messages_total",
  help: "Total messages sent to the dead-letter exchange",
  labelNames: ["queue"],
  registers: [registry],
});

// LLM usage
export const llmTokensTotal = new Counter({
  name: "llm_tokens_total",
  help: "Total tokens consumed by LLM calls",
  labelNames: ["model", "type"], // type: input | output
  registers: [registry],
});

export const llmRequestDuration = new Histogram({
  name: "llm_request_duration_seconds",
  help: "LLM API call duration in seconds",
  labelNames: ["model"],
  buckets: [0.5, 1, 2, 5, 10, 20, 30],
  registers: [registry],
});

// External API calls
export const externalApiDuration = new Histogram({
  name: "external_api_duration_seconds",
  help: "External API call duration in seconds",
  labelNames: ["service"],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});

export const externalApiErrorsTotal = new Counter({
  name: "external_api_errors_total",
  help: "Total external API call errors",
  labelNames: ["service"],
  registers: [registry],
});

// SSE events
export const sseEventsEmittedTotal = new Counter({
  name: "sse_events_emitted_total",
  help: "Total SSE events broadcast to clients",
  labelNames: ["event_type"],
  registers: [registry],
});

// Threat intel
export const threatIntelNewEntriesTotal = new Counter({
  name: "threat_intel_new_entries_total",
  help: "New threat intel entries discovered per sync",
  labelNames: ["source"], // kev | nvd | otx | misp
  registers: [registry],
});
