import type { InsiderFormType } from "@algo/shared";

export type InsiderHeader = {
  formType: InsiderFormType;
  filingDate: string;
  reportPeriod?: string;
  ownerName: string;
  ownerCik: string;
  issuerName: string;
  issuerCik: string;
};

const INSIDER_FORMS = new Set<InsiderFormType>(["3", "4", "5", "3/A", "4/A", "5/A"]);

function toIsoDate(yyyymmdd?: string): string | undefined {
  if (!yyyymmdd || yyyymmdd.length !== 8) return undefined;
  return `${yyyymmdd.slice(0, 4)}-${yyyymmdd.slice(4, 6)}-${yyyymmdd.slice(6, 8)}`;
}

// Parses the SGML <SEC-HEADER> block of a Form 3/4/5 .txt submission.
// Joint filings have multiple REPORTING-OWNER blocks — this returns only the first.
export function parseInsiderSgmlHeader(text: string): InsiderHeader | null {
  const headerEnd = text.indexOf("</SEC-HEADER>");
  const header = headerEnd > 0 ? text.slice(0, headerEnd) : text.slice(0, 20_000);

  const formMatch = /CONFORMED SUBMISSION TYPE:\s*(\S+)/.exec(header);
  const formType = formMatch?.[1] as InsiderFormType | undefined;
  if (!formType || !INSIDER_FORMS.has(formType)) return null;

  const filedDate = toIsoDate(/FILED AS OF DATE:\s*(\d{8})/.exec(header)?.[1]);
  const reportPeriod = toIsoDate(/CONFORMED PERIOD OF REPORT:\s*(\d{8})/.exec(header)?.[1]);
  if (!filedDate) return null;

  const ownerBlock = /REPORTING-OWNER:[\s\S]*?(?=ISSUER:|$)/.exec(header)?.[0] ?? "";
  const ownerName = /COMPANY CONFORMED NAME:\s*(.+)/.exec(ownerBlock)?.[1]?.trim();
  const ownerCikRaw = /CENTRAL INDEX KEY:\s*(\d+)/.exec(ownerBlock)?.[1];
  if (!ownerName || !ownerCikRaw) return null;

  const issuerBlock = /ISSUER:[\s\S]*$/.exec(header)?.[0] ?? "";
  const issuerName = /COMPANY CONFORMED NAME:\s*(.+)/.exec(issuerBlock)?.[1]?.trim();
  const issuerCikRaw = /CENTRAL INDEX KEY:\s*(\d+)/.exec(issuerBlock)?.[1];
  if (!issuerName || !issuerCikRaw) return null;

  return {
    formType,
    filingDate: filedDate,
    reportPeriod,
    ownerName,
    ownerCik: String(parseInt(ownerCikRaw, 10)),
    issuerName,
    issuerCik: String(parseInt(issuerCikRaw, 10)),
  };
}
