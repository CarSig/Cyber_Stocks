import { Controller, Sse, MessageEvent } from "@nestjs/common";
import { Observable } from "rxjs";
import { startWith, finalize } from "rxjs/operators";
import { NotificationsService } from "./notifications.service";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { sseActiveConnections } from "@/shared/metrics";

@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Sse("stream")
  @AllowQueryToken()
  stream(): Observable<MessageEvent> {
    sseActiveConnections.inc();
    return this.notificationsService.stream().pipe(
      startWith({ data: { type: "connected", message: "Notifications connected", at: new Date().toISOString() } } as MessageEvent),
      finalize(() => sseActiveConnections.dec()),
    );
  }
}
