import { Controller, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { startWith, finalize } from "rxjs/operators";
import { NotificationsService } from "./notifications.service";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { sseActiveConnections } from "@/shared/metrics";

@ApiTags("Notifications")
@ApiBearerAuth("bearer")
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse("stream")
  @AllowQueryToken()
  @ApiOperation({ summary: "Domain events stream (SSE)", description: "Persistent Server-Sent Events stream delivering real-time domain events: news.analyzed, stocks.updated, trump.updated, and threatintel.updated. Accepts ?token= instead of Authorization header." })
  @ApiResponse({ status: 200, description: "SSE stream with typed event payloads for news, stocks, Trump posts, and threat intel updates" })
  @ApiResponse({ status: 401, description: "Missing or invalid token" })
  stream(): Observable<MessageEvent> {
    sseActiveConnections.inc();
    return this.notificationsService.stream().pipe(
      startWith({ data: { type: "connected", message: "Notifications connected", at: new Date().toISOString() } } as MessageEvent),
      finalize(() => sseActiveConnections.dec()),
    );
  }
}
