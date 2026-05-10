import { correlateThreatIntel, threatIntelLagImpact } from "@/shared/utils/correlations/threatIntelCorrelation";
import { ThreatIntelSource } from "./ThreatIntelSource";
import { vendorKeyword, cpeKeyword } from "./vendorKeywords";
import type { NvdClient } from "@/shared/clients/NvdClient";
import type { CompanyConsumerFactory } from "./ThreatIntelSource";
import { unprocessable } from "@/shared/errors";

type CvssMetric = { cvssData?: { baseSeverity?: string; baseScore?: number } }
export type NvdVuln = {
  cve?: {
    id?: string;
    published?: string;
    lastModified?: string;
    vulnStatus?: string;
    descriptions?: { lang: string; value: string }[];
    metrics?: {
      cvssMetricV40?: CvssMetric[];
      cvssMetricV31?: CvssMetric[];
      cvssMetricV30?: CvssMetric[];
    };
    configurations?: { nodes?: { cpeMatch?: { criteria?: string }[] }[] }[];
  };
}

function severityOf(vuln: NvdVuln): string {
  return (
    vuln.cve?.metrics?.cvssMetricV40?.[0]?.cvssData?.baseSeverity ??
    vuln.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity ??
    vuln.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity ??
    "UNKNOWN"
  );
}

function scoreOf(vuln: NvdVuln): number | null {
  return (
    vuln.cve?.metrics?.cvssMetricV40?.[0]?.cvssData?.baseScore ??
    vuln.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore ??
    vuln.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore ??
    null
  );
}

type NvdSummary = {
  fetched: number;
  syncedAt: string;
  criticalCount: number;
  highCount: number;
}

type NvdListItem = {
  id: string | undefined;
  published: string | undefined;
  lastModified: string | undefined;
  status: string | undefined;
  description: string;
  severity: string;
  score: number | null;
}

type NvdListResult = {
  total: number;
  items: NvdListItem[];
  syncedAt: string | null;
}

export class NvdThreatIntelService extends ThreatIntelSource<
  { vulnerabilities: Record<string, unknown>[]; syncedAt: string; totalResults: number },
  NvdListResult,
  NvdSummary | null
> {
  readonly source = "NVD CVE";

  constructor(private client: NvdClient, consumerFactory: CompanyConsumerFactory) {
    super(consumerFactory);
  }

  protected read() { return this.client.read(); }

  summary(): NvdSummary | null {
    const data = this.read();
    if (!data) return null;
    const vulns = (data.vulnerabilities ?? []) as NvdVuln[];
    return {
      fetched: vulns.length,
      syncedAt: data.syncedAt,
      criticalCount: vulns.filter((v) => severityOf(v) === "CRITICAL").length,
      highCount: vulns.filter((v) => severityOf(v) === "HIGH").length,
    };
  }

  list({ limit = 50, offset = 0, search = "", severity = "", company = "" } = {}): NvdListResult {
    const data = this.read();
    if (!data) return { total: 0, items: [], syncedAt: null };
    let items = ((data.vulnerabilities ?? []) as NvdVuln[]).slice().sort(
      (a, b) => new Date(b.cve?.published ?? 0).getTime() - new Date(a.cve?.published ?? 0).getTime()
    );
    if (severity) items = items.filter((v) => severityOf(v) === severity.toUpperCase());
    if (company) {
      const kw = vendorKeyword(company);
      items = items.filter((v) => {
        const desc = v.cve?.descriptions?.find((d) => d.lang === "en")?.value?.toLowerCase() ?? "";
        return desc.includes(kw);
      });
    }
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((v) =>
        v.cve?.id?.toLowerCase().includes(q) ||
        v.cve?.descriptions?.find((d) => d.lang === "en")?.value?.toLowerCase().includes(q)
      );
    }
    return {
      total: items.length,
      items: items.slice(offset, offset + limit).map((v) => ({
        id: v.cve?.id,
        published: v.cve?.published,
        lastModified: v.cve?.lastModified,
        status: v.cve?.vulnStatus,
        description: v.cve?.descriptions?.find((d) => d.lang === "en")?.value ?? "",
        severity: severityOf(v),
        score: scoreOf(v),
      })),
      syncedAt: data.syncedAt,
    };
  }

  async correlate(companyName: string, lagDays = 1) {
    const data = this.read();
    if (!data) throw new Error("NVD data not available");
    const kw = vendorKeyword(companyName);
    const cpe = cpeKeyword(companyName);
    const dates = ((data.vulnerabilities ?? []) as NvdVuln[])
      .filter((v) => {
        const desc = v.cve?.descriptions?.find((d) => d.lang === "en")?.value?.toLowerCase() ?? "";
        if (desc.includes(kw)) return true;
        return (v.cve?.configurations ?? []).some((cfg) =>
          (cfg.nodes ?? []).some((node) =>
            (node.cpeMatch ?? []).some((c) => c.criteria?.toLowerCase().includes(cpe))
          )
        );
      })
      .map((v) => v.cve?.lastModified?.slice(0, 10))
      .filter((d): d is string => !!d);
    if (dates.length < 1) return null;
    const quotes = await this.quotes(companyName);
    return {
      correlation: correlateThreatIntel(dates, quotes, { lagDays, source: this.source }),
      lagImpact: threatIntelLagImpact(dates, quotes, { windowDays: lagDays }),
    };
  }
}
