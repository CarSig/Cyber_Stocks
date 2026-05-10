import { correlateThreatIntel, threatIntelLagImpact } from "@/shared/utils/correlations/threatIntelCorrelation";
import { ThreatIntelSource } from "./ThreatIntelSource";
import { vendorKeyword } from "./vendorKeywords";
import type { OtxClient } from "@/shared/clients/OtxClient";
import type { CompanyConsumerFactory } from "./ThreatIntelSource";
import { unprocessable } from "@/shared/errors";

type OtxPulse = {
  name?: string;
  description?: string;
  tags?: string[];
  created?: string;
}

type OtxSummary = {
  configured: boolean;
  count: number | null;
  syncedAt: string | null;
}

type OtxListResult =
  | { configured: false }
  | { configured: true; total: number; items: OtxPulse[]; syncedAt: string | null };

export class OtxThreatIntelService extends ThreatIntelSource<
  { results?: Record<string, unknown>[]; syncedAt: string },
  OtxListResult,
  OtxSummary
> {
  readonly source = "OTX pulse";

  constructor(private client: OtxClient, consumerFactory: CompanyConsumerFactory) {
    super(consumerFactory);
  }

  protected read() { return this.client.read(); }

  summary(): OtxSummary {
    const data = this.read();
    return {
      configured: this.client.configured,
      count: data?.results?.length ?? null,
      syncedAt: data?.syncedAt ?? null,
    };
  }

  list({ limit = 50, offset = 0, company = "" } = {}): OtxListResult {
    if (!this.client.configured) return { configured: false };
    const data = this.read();
    if (!data) return { configured: true, total: 0, items: [], syncedAt: null };
    let items = (data.results ?? []) as OtxPulse[];
    if (company) {
      const kw = vendorKeyword(company);
      items = items.filter((p) =>
        p.name?.toLowerCase().includes(kw) ||
        p.description?.toLowerCase().includes(kw) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(kw))
      );
    }
    return { configured: true, total: items.length, items: items.slice(offset, offset + limit), syncedAt: data.syncedAt };
  }

  async correlate(companyName: string, lagDays = 1) {
    if (!this.client.configured) throw new Error("OTX not configured");
    const data = this.read();
    if (!data) throw new Error("OTX data not available");
    const kw = vendorKeyword(companyName);
    const dates = ((data.results ?? []) as OtxPulse[])
      .filter((p) =>
        p.name?.toLowerCase().includes(kw) ||
        p.description?.toLowerCase().includes(kw) ||
        (p.tags ?? []).some((t) => t.toLowerCase().includes(kw))
      )
      .map((p) => p.created?.slice(0, 10))
      .filter((d): d is string => !!d);
    if (dates.length < 1) return null;
    const quotes = await this.quotes(companyName);
    return {
      correlation: correlateThreatIntel(dates, quotes, { lagDays, source: this.source }),
      lagImpact: threatIntelLagImpact(dates, quotes, { windowDays: lagDays }),
    };
  }
}
