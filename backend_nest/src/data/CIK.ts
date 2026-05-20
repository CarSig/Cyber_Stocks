export const COMPANY_CIK: Record<string, string> = {
  AAPL: '320193',
  MSFT: '789019',
  AMZN: '1018724',
  GOOGL: '1652044',
  META: '1326801',
  TSLA: '1318605',
  NVDA: '1045810',
  CSCO: '858877',
  PLTR: '1321655',
  PANW: '1327567',
  CRWD: '1535527',
  FTNT: '1262039',
  ZS: '1713683',
  S: '1831868',
  NET: '1477333',
  QLYS: '1107843',
  TENB: '1660280',
  VRNS: '1345105',
  OKTA: '1660134',
  CYBR: '1517396',
  DDOG: '1561550',
  DT: '1773383',
  AKAM: '1086222',
  CHKP: '1015922',
};

/**
 * Get raw CIK (no padding) from ticker
 */
export function getCik(ticker: string): string | undefined {
  return COMPANY_CIK[ticker.toUpperCase()];
}

/**
 * SEC requires 10-digit zero-padded CIK in URLs and API endpoints
 */
export function toPaddedCik(cik: string | number): string {
  return cik.toString().padStart(10, '0');
}

/**
 * Convenience: ticker -> padded CIK
 */
export function getPaddedCik(ticker: string): string | undefined {
  const cik = getCik(ticker);
  if (!cik) return undefined;
  return toPaddedCik(cik);
}

/**
 * Build SEC submissions URL
 */
export function getSubmissionsUrl(ticker: string): string | undefined {
  const cik = getCik(ticker);
  if (!cik) return undefined;
  return `https://data.sec.gov/submissions/CIK${toPaddedCik(cik)}.json`;
}

/**
 * Build EDGAR filings base URL
 */
export function getEdgarBaseUrl(ticker: string): string | undefined {
  const cik = getCik(ticker);
  if (!cik) return undefined;
  return `https://www.sec.gov/Archives/edgar/data/${toPaddedCik(cik)}/`;
}
