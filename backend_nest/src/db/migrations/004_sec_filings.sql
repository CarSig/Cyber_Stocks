CREATE SCHEMA IF NOT EXISTS edgar;

CREATE TABLE IF NOT EXISTS edgar.filings (
  accession         TEXT PRIMARY KEY,
  ticker            TEXT NOT NULL,
  issuer_cik        TEXT NOT NULL,
  form              TEXT NOT NULL,
  filing_date       DATE NOT NULL,
  report_period     DATE,
  primary_document  TEXT,
  items             TEXT[],
  files             TEXT[] NOT NULL DEFAULT '{}',
  is_xbrl           BOOLEAN NOT NULL DEFAULT false,
  is_inline_xbrl    BOOLEAN NOT NULL DEFAULT false,
  size_bytes        BIGINT NOT NULL DEFAULT 0,
  indexed_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS edgar_filings_ticker_date_idx ON edgar.filings (ticker, filing_date DESC);
CREATE INDEX IF NOT EXISTS edgar_filings_form_idx        ON edgar.filings (form);

CREATE TABLE IF NOT EXISTS edgar.filing_owners (
  accession            TEXT NOT NULL REFERENCES edgar.filings(accession) ON DELETE CASCADE,
  person_cik           TEXT NOT NULL,
  person_name          TEXT NOT NULL,
  is_director          BOOLEAN NOT NULL DEFAULT false,
  is_officer           BOOLEAN NOT NULL DEFAULT false,
  is_ten_percent_owner BOOLEAN NOT NULL DEFAULT false,
  officer_title        TEXT,
  PRIMARY KEY (accession, person_cik)
);
CREATE INDEX IF NOT EXISTS edgar_filing_owners_person_idx ON edgar.filing_owners (person_cik);

CREATE TABLE IF NOT EXISTS edgar.form4_transactions (
  id                    BIGSERIAL PRIMARY KEY,
  accession             TEXT NOT NULL REFERENCES edgar.filings(accession) ON DELETE CASCADE,
  tbl                   TEXT NOT NULL CHECK (tbl IN ('nonDerivative','derivative')),
  security_title        TEXT NOT NULL,
  transaction_date      DATE,
  code                  TEXT NOT NULL,
  acquired_disposed     CHAR(1),
  shares                NUMERIC,
  price_per_share       NUMERIC,
  price_from_footnote   BOOLEAN NOT NULL DEFAULT false,
  shares_owned_after    NUMERIC,
  direct_or_indirect    CHAR(1)
);
CREATE INDEX IF NOT EXISTS edgar_form4_tx_accession_idx ON edgar.form4_transactions (accession);
CREATE INDEX IF NOT EXISTS edgar_form4_tx_code_idx      ON edgar.form4_transactions (code);
