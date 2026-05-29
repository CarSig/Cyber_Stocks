CREATE TABLE IF NOT EXISTS edgar.filing_scans (
  accession        TEXT NOT NULL REFERENCES edgar.filings(accession) ON DELETE CASCADE,
  scan_type        TEXT NOT NULL,
  matched          BOOLEAN NOT NULL,
  matched_keywords TEXT[] NOT NULL DEFAULT '{}',
  snippet          TEXT,
  scanned_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (accession, scan_type)
);
CREATE INDEX IF NOT EXISTS edgar_filing_scans_type_matched_idx
  ON edgar.filing_scans (scan_type, matched);
