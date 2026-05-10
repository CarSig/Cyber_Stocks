import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "@/modules/notifications/notifications.service";

@Injectable()
export class EventBridgeService {
  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("news.updated")
  onNewsUpdated(payload: { at: string }) {
    this.notificationsService.broadcast({ type: "news.updated", message: "News updated for all companies", at: payload.at });
  }

  @OnEvent("trump.updated")
  onTrumpUpdated(payload: { at: string }) {
    this.notificationsService.broadcast({ type: "trump.updated", message: "New Trump posts fetched", at: payload.at });
  }

  @OnEvent("stocks.updated")
  onStocksUpdated(payload: { at: string; changes: { ticker: string; changePct: number }[] }) {
    const sorted = (payload.changes ?? []).sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct));
    const message = sorted.length
      ? sorted.map(({ ticker, changePct }) => `${ticker} ${changePct >= 0 ? "+" : ""}${changePct.toFixed(1)}%`).join(", ")
      : "Stock prices updated";
    this.notificationsService.broadcast({ type: "stocks.updated", message, at: payload.at, changes: sorted });
  }

  @OnEvent("threatintel.updated")
  onThreatIntelUpdated(payload: { at: string; newKev: number; criticalNvd: number; newOtx: number }) {
    const parts: string[] = [];
    if (payload.newKev > 0) parts.push(`${payload.newKev} new KEV exploit${payload.newKev > 1 ? "s" : ""}`);
    if (payload.criticalNvd > 0) parts.push(`${payload.criticalNvd} critical CVE${payload.criticalNvd > 1 ? "s" : ""} in NVD`);
    if (payload.newOtx > 0) parts.push(`${payload.newOtx} new OTX pulse${payload.newOtx > 1 ? "s" : ""}`);
    const message = parts.length ? `Threat Intel: ${parts.join(", ")}` : "Threat intel synced — no new entries";
    this.notificationsService.broadcast({ type: "threatintel.updated", message, at: payload.at });
  }
}
