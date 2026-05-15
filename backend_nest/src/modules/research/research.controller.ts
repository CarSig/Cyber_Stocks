import { Controller, Post, Param, Body, Res, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { Observable } from "rxjs";
import { finalize } from "rxjs/operators";
import type { Response } from "express";
import { ResearchService } from "./research.service";
import { AuditService } from "@/modules/audit/audit.service";
import { resolveTicker } from "@/shared/ticker.utils";
import { ChatBodyDto } from "@/shared/dto";
import { AppError } from "@/shared/errors";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { CurrentUser } from "@/common/decorators/current-user.decorator";
import { sseActiveConnections } from "@/shared/metrics";
import { StreamResearchDoc, StreamChatDoc } from "./research.docs";
import type { User } from "@/types/index";

@ApiTags("Research")
@ApiBearerAuth("bearer")
@Controller("research")
export class ResearchController {
  constructor(
    private readonly researchService: ResearchService,
    private readonly auditService: AuditService,
  ) {}

  @Sse("research/:ticker")
  @AllowQueryToken()
  @Throttle({ strict: { ttl: 60_000, limit: 5 } })
  @StreamResearchDoc()
  streamResearch(@Param("ticker") ticker: string, @CurrentUser() user: User): Observable<MessageEvent> {
    if (!process.env.TAVILY_API_KEY) throw new AppError("Tavily API key not configured", 503);
    const r = resolveTicker(ticker);
    this.auditService.log(user, "research", { ticker: r.ticker });
    sseActiveConnections.inc();
    return new Observable<MessageEvent>((subscriber) => {
      this.researchService
        .streamResearch(r.ticker, r.name, (event) => subscriber.next({ data: event }))
        .then(() => subscriber.complete())
        .catch(() => {
          subscriber.next({ data: { error: "Research stream failed" } });
          subscriber.complete();
        });
    }).pipe(finalize(() => sseActiveConnections.dec()));
  }

  @Post("chat")
  @Throttle({ strict: { ttl: 60_000, limit: 10 } })
  @StreamChatDoc()
  async streamChat(@Body() body: ChatBodyDto, @Res() res: Response, @CurrentUser() user: User): Promise<void> {
    this.auditService.log(user, "chat", { messageCount: body.messages.length });
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    sseActiveConnections.inc();
    const write = (event: Record<string, unknown>) => res.write(`data: ${JSON.stringify(event)}\n\n`);
    try {
      await this.researchService.streamChat(body.messages, body.context, write);
    } catch (err) {
      write({ error: err instanceof Error ? err.message : String(err) });
    } finally {
      sseActiveConnections.dec();
      res.end();
    }
  }
}
