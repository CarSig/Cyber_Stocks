const VENDOR_OVERRIDES: Record<string, string> = {
  "Palo Alto Networks": "palo alto",
  "Tenable Holdings": "tenable",
  "Varonis Systems": "varonis",
};

const CPE_VENDOR: Record<string, string> = {
  "Palo Alto Networks": "paloaltonetworks",
  // "Check Point Software": "checkpoint",
  "Tenable Holdings": "tenable",
  "Varonis Systems": "varonis",
  CrowdStrike: "crowdstrike",
  SentinelOne: "sentinelone",
  Zscaler: "zscaler",
  Fortinet: "fortinet",
  Cloudflare: "cloudflare",
  Qualys: "qualys",
  Microsoft: "microsoft",
  NVIDIA: "nvidia",
  Palantir: "palantir",
};

export function vendorKeyword(company: string): string {
  return (VENDOR_OVERRIDES[company] ?? company).toLowerCase();
}

export function cpeKeyword(company: string): string {
  return (CPE_VENDOR[company] ?? vendorKeyword(company)).toLowerCase();
}
