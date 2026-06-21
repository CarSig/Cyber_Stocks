---
name: async-jobs
description: Background work in backend_nest/ — RabbitMQ queues (amqplib) and @nestjs/schedule @Cron jobs. NOT BullMQ.
---

# async-jobs

Two mechanisms. This stack uses **RabbitMQ (`amqplib`)** for message queues and **`@nestjs/schedule`** for cron — **not BullMQ, not Redis queues.**

## Cron / scheduling (`@nestjs/schedule`)
- All jobs in `src/modules/scheduler/cron.service.ts` via `@Cron(pattern)` (UTC). Current jobs:
  - `0 23 * * *` `runPopulate()` — sync stock quotes (Yahoo) → emits `stocks.updated`.
  - `0 * * * *` `runNews()` → `news.updated`; `runFetchTrump()` → `trump.updated`; `runFetchReddit()`.
  - `0 6 * * *` `runThreatIntelSync()` (NVD/KEV/OTX/MISP) → `threatintel.updated`.
- Jobs publish via `EventEmitter2.emit()`; other modules listen with `@OnEvent(...)`. Each job records `cronJobDuration`/`cronJobRunsTotal` metrics.
- Add a job: new `@Cron`-decorated method here, emit a domain event, add a metric.

## Message queue (RabbitMQ / `amqplib`)
- Connection: `src/shared/mq/connection.ts` (`AMQP_URL`, default `amqp://localhost`, single channel, 5s timeout). Channel accessor: `MqService.getChannel()` in `src/modules/mq/mq.service.ts` (`@Global()` module).
- Queues:
  - `news.articles` (durable) — articles awaiting Anthropic analysis. Producer in news module; consumer is the **standalone worker** `src/workers/newsWorker.ts` (run via `npm run worker` / `worker:dev`, **separate process, not part of the Nest app**).
  - `news.articles.dlx` (exchange) + `news.articles.dead` — dead-letter after 5 retries.
  - `news.analyzed` — worker → `newsAnalyzedConsumer` (mq module) → triggers SSE notifications.
- Add a flow: declare the queue (durable + DLX for retryable work), add a producer, add a consumer (in-app via mq module, or a new worker under `src/workers/`).

See `docs/architecture.md` (queues/cron) and `docs/data-flows.md` (news pipeline).
