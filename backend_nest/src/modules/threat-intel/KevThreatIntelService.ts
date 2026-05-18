import { correlateThreatIntel, threatIntelLagImpact } from "@/shared/utils/correlations/threatIntelCorrelation";
import { ThreatIntelSource } from "./ThreatIntelSource";
import { vendorKeyword } from "./vendorKeywords";
import type { KevClient } from "@/shared/clients/KevClient";
import type { CompanyConsumerFactory } from "./ThreatIntelSource";
import { unprocessable } from "@/shared/errors";
import type { CacheService } from "@/shared/cache.service";

type KevVuln = {
  vendorProject?: string;
  product?: string;
  cveID?: string;
  vulnerabilityName?: string;
  knownRansomwareCampaignUse?: string;
  dateAdded?: string;
}

type KevSummary = {
  count: number;
  syncedAt: string;
  recentCount: number;
  ransomwareCount: number;
}

type KevListResult = {
  total: number;
  items: KevVuln[];
  syncedAt: string | null;
}

export class KevThreatIntelService extends ThreatIntelSource<
  { count: number; syncedAt: string; vulnerabilities: Record<string, unknown>[] },
  KevListResult,
  KevSummary | null
> {
  readonly source = "CISA KEV";

  constructor(private client: KevClient, consumerFactory: CompanyConsumerFactory, private cache?: CacheService) {
    super(consumerFactory);
  }

  protected read() { return this.client.read(); }

  summary(): KevSummary | null {
    const data = this.read();
    if (!data) return null;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return {
      count: data.count,
      syncedAt: data.syncedAt,
      recentCount: data.vulnerabilities.filter((v) => new Date((v as { dateAdded?: string }).dateAdded ?? 0) >= thirtyDaysAgo).length,
      ransomwareCount: data.vulnerabilities.filter((v) => (v as { knownRansomwareCampaignUse?: string }).knownRansomwareCampaignUse === "Known").length,
    };
  }

  list({ limit = 50, offset = 0, search = "", ransomware = "", company = "" } = {}): KevListResult {
    const data = this.read();
    if (!data) return { total: 0, items: [], syncedAt: null };
    const cutoff = new Date("2022-01-01").getTime();
    let items = (data.vulnerabilities as KevVuln[])
      .filter((v) => new Date(v.dateAdded ?? 0).getTime() >= cutoff)
      .sort((a, b) => new Date(b.dateAdded ?? 0).getTime() - new Date(a.dateAdded ?? 0).getTime());
    if (company) {
      const kw = vendorKeyword(company);
      items = items.filter((v) =>
        v.vendorProject?.toLowerCase().includes(kw) ||
        v.product?.toLowerCase().includes(kw)
      );
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((v) =>
        v.cveID?.toLowerCase().includes(q) ||
        v.vendorProject?.toLowerCase().includes(q) ||
        v.product?.toLowerCase().includes(q) ||
        v.vulnerabilityName?.toLowerCase().includes(q)
      );
    }
    if (ransomware === "true") items = items.filter((v) => v.knownRansomwareCampaignUse === "Known");
    return { total: items.length, items: items.slice(offset, offset + limit), syncedAt: data.syncedAt };
  }

  async correlate(companyName: string, lagDays = 1) {
    const data = this.read();
    if (!data) throw new Error("KEV data not available");
    const compute = async () => {
      const kw = vendorKeyword(companyName);
      const dates = (data.vulnerabilities as KevVuln[])
        .filter((v) => v.vendorProject?.toLowerCase().includes(kw) || v.product?.toLowerCase().includes(kw))
        .map((v) => v.dateAdded)
        .filter((d): d is string => !!d);
      if (dates.length < 1) return null;
      const quotes = await this.quotes(companyName);
      return {
        correlation: correlateThreatIntel(dates, quotes, { lagDays, source: this.source }),
        lagImpact: threatIntelLagImpact(dates, quotes, { windowDays: lagDays }),
      };
    };
    return this.cache
      ? this.cache.getOrSet(`corr:${companyName}:kev:${lagDays}`, 1800, compute)
      : compute();
  }
}
