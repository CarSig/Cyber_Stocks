export const COMPANY_CIK: Record<string, string> = {
  AAPL: '320193',
  MSFT: '789019',
  AMZN: '1018724',
  GOOGL: '1652044',
  META: '1326801',
  TSLA: '1318605',
  NVDA: '1045810',
  CRWD: '1535527',
  NET: '1477333',
  OKTA: '1660134',
  DDOG: '1561550',
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
