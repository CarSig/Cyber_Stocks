import { ThreatIntelSource } from "./ThreatIntelSource";
import type { MispClient } from "@/shared/clients/MispClient";
import type { CompanyConsumerFactory } from "./ThreatIntelSource";

type MispSummary = {
  configured: boolean;
  count: number | null;
  syncedAt: string | null;
}

type MispListResult =
  | { configured: false }
  | { configured: true; total: number; items: unknown[]; syncedAt: string | null };

export class MispThreatIntelService extends ThreatIntelSource<
  { events: unknown[]; syncedAt: string },
  MispListResult,
  MispSummary
> {
  readonly source = "MISP";

  constructor(private client: MispClient, consumerFactory: CompanyConsumerFactory) {
    super(consumerFactory);
  }

  protected read() { return this.client.read(); }

  summary(): MispSummary {
    const data = this.read();
    return {
      configured: this.client.configured,
      count: data?.events?.length ?? null,
      syncedAt: data?.syncedAt ?? null,
    };
  }

  list({ limit = 50, offset = 0 } = {}): MispListResult {
    if (!this.client.configured) return { configured: false };
    const data = this.read();
    if (!data) return { configured: true, total: 0, items: [], syncedAt: null };
    const items = (data.events ?? []) as unknown[];
    return { configured: true, total: items.length, items: items.slice(offset, offset + limit), syncedAt: data.syncedAt };
  }
}
