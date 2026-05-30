import { Injectable } from "@nestjs/common";
import { CoreDbService } from "@/shared/core-db.service";
import type {
  FilingMetadata,
  Form4Transaction,
  InsiderOwnerProfile,
} from "@algo/shared";
import type { LocalFileListing } from "@/shared/clients/SecEdgarClient";

export type FilingInsert = {
  accession: string;
  ticker: string;
  issuerCik: string;
  form: string;
  filingDate: string;
  reportPeriod?: string | null;
  primaryDocument?: string | null;
  items?: string[] | null;
  files: string[];
  isXBRL?: boolean;
  isInlineXBRL?: boolean;
  sizeBytes?: number;
};

export type OwnerInsert = {
  personCik: string;
  personName: string;
  profile?: InsiderOwnerProfile;
};

export type ScanInsert = {
  accession: string;
  scanType: string;
  matched: boolean;
  matchedKeywords: string[];
  snippet?: string | null;
  aiRealIncident?: boolean | null;
  aiConfidence?: number | null;
  aiIncidentType?: string | null;
  aiSummary?: string | null;
  aiModel?: string | null;
};

export type ScanResultRow = FilingRow & {
  matched: boolean;
  matched_keywords: string[];
  snippet: string | null;
  ai_real_incident: boolean | null;
  ai_confidence: string | null;
  ai_incident_type: string | null;
  ai_summary: string | null;
};

export type FilingRow = {
  accession: string;
  ticker: string;
  issuer_cik: string;
  form: string;
  filing_date: string;
  report_period: string | null;
  primary_document: string | null;
  items: string[] | null;
  files: string[];
  is_xbrl: boolean;
  is_inline_xbrl: boolean;
  size_bytes: string;
};

export type OwnerRow = {
  accession: string;
  person_cik: string;
  person_name: string;
  is_director: boolean;
  is_officer: boolean;
  is_ten_percent_owner: boolean;
  officer_title: string | null;
};

export type TxnRow = {
  accession: string;
  tbl: "nonDerivative" | "derivative";
  security_title: string;
  transaction_date: string | null;
  code: string;
  acquired_disposed: "A" | "D" | null;
  shares: string | null;
  price_per_share: string | null;
  price_from_footnote: boolean;
  shares_owned_after: string | null;
  direct_or_indirect: "D" | "I" | null;
};

@Injectable()
export class SecFilingsRepository {
  constructor(private readonly db: CoreDbService) {}

  async upsertFiling(rec: FilingInsert): Promise<void> {
    await this.db.pool.query(
      `INSERT INTO edgar.filings
         (accession, ticker, issuer_cik, form, filing_date, report_period,
          primary_document, items, files, is_xbrl, is_inline_xbrl, size_bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (accession) DO UPDATE SET
         ticker           = EXCLUDED.ticker,
         issuer_cik       = EXCLUDED.issuer_cik,
         form             = EXCLUDED.form,
         filing_date      = EXCLUDED.filing_date,
         report_period    = EXCLUDED.report_period,
         primary_document = EXCLUDED.primary_document,
         items            = EXCLUDED.items,
         files            = EXCLUDED.files,
         is_xbrl          = EXCLUDED.is_xbrl,
         is_inline_xbrl   = EXCLUDED.is_inline_xbrl,
         size_bytes       = EXCLUDED.size_bytes,
         indexed_at       = now()`,
      [
        rec.accession,
        rec.ticker.toUpperCase(),
        rec.issuerCik,
        rec.form,
        rec.filingDate,
        rec.reportPeriod ?? null,
        rec.primaryDocument ?? null,
        rec.items ?? null,
        rec.files,
        rec.isXBRL ?? false,
        rec.isInlineXBRL ?? false,
        rec.sizeBytes ?? 0,
      ],
    );
  }

  async replaceOwners(accession: string, owners: OwnerInsert[]): Promise<void> {
    await this.db.pool.query(
      `DELETE FROM edgar.filing_owners WHERE accession = $1`,
      [accession],
    );
    if (owners.length === 0) return;
    for (const o of owners) {
      await this.db.pool.query(
        `INSERT INTO edgar.filing_owners
           (accession, person_cik, person_name, is_director, is_officer,
            is_ten_percent_owner, officer_title)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (accession, person_cik) DO UPDATE SET
           person_name          = EXCLUDED.person_name,
           is_director          = EXCLUDED.is_director,
           is_officer           = EXCLUDED.is_officer,
           is_ten_percent_owner = EXCLUDED.is_ten_percent_owner,
           officer_title        = EXCLUDED.officer_title`,
        [
          accession,
          o.personCik,
          o.personName,
          o.profile?.isDirector ?? false,
          o.profile?.isOfficer ?? false,
          o.profile?.isTenPercentOwner ?? false,
          o.profile?.officerTitle ?? null,
        ],
      );
    }
  }

  async replaceTransactions(accession: string, txns: Form4Transaction[]): Promise<void> {
    await this.db.pool.query(
      `DELETE FROM edgar.form4_transactions WHERE accession = $1`,
      [accession],
    );
    if (txns.length === 0) return;
    for (const t of txns) {
      await this.db.pool.query(
        `INSERT INTO edgar.form4_transactions
           (accession, tbl, security_title, transaction_date, code,
            acquired_disposed, shares, price_per_share, price_from_footnote,
            shares_owned_after, direct_or_indirect)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          accession,
          t.table,
          t.securityTitle,
          t.transactionDate ?? null,
          t.code,
          t.acquiredDisposed,
          t.shares,
          t.pricePerShare,
          t.priceFromFootnote,
          t.sharesOwnedAfter,
          t.directOrIndirect,
        ],
      );
    }
  }

  async getFilingDateRangePerTicker(): Promise<{ ticker: string; minDate: string; maxDate: string }[]> {
    const r = await this.db.pool.query<{ ticker: string; min_date: string; max_date: string }>(
      `SELECT ticker,
              to_char(min(filing_date), 'YYYY-MM-DD') AS min_date,
              to_char(max(filing_date), 'YYYY-MM-DD') AS max_date
         FROM edgar.filings
        GROUP BY ticker`,
    );
    return r.rows.map((row) => ({ ticker: row.ticker, minDate: row.min_date, maxDate: row.max_date }));
  }

  async countAllFilings(): Promise<number> {
    const r = await this.db.pool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM edgar.filings`,
    );
    return parseInt(r.rows[0]?.count ?? "0", 10);
  }

  async findAccessionsByTicker(ticker: string): Promise<Set<string>> {
    const r = await this.db.pool.query<{ accession: string }>(
      `SELECT accession FROM edgar.filings WHERE ticker = $1`,
      [ticker.toUpperCase()],
    );
    return new Set(r.rows.map((row) => row.accession));
  }

  /** Notification watermark: last acceptanceDateTime seen for a ticker, ISO or null. */
  async getPollState(ticker: string): Promise<string | null> {
    const r = await this.db.pool.query<{ last_seen_at: Date }>(
      `SELECT last_seen_at FROM edgar.poll_state WHERE ticker = $1`,
      [ticker.toUpperCase()],
    );
    return r.rows[0]?.last_seen_at?.toISOString() ?? null;
  }

  async setPollState(ticker: string, lastSeenAt: string): Promise<void> {
    await this.db.pool.query(
      `INSERT INTO edgar.poll_state (ticker, last_seen_at)
       VALUES ($1, $2)
       ON CONFLICT (ticker) DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at`,
      [ticker.toUpperCase(), lastSeenAt],
    );
  }

  async listByTicker(ticker: string): Promise<LocalFileListing[]> {
    const r = await this.db.pool.query<FilingRow>(
      `SELECT accession, ticker, issuer_cik, form, to_char(filing_date, 'YYYY-MM-DD') AS filing_date, to_char(report_period, 'YYYY-MM-DD') AS report_period, primary_document, items, files, is_xbrl, is_inline_xbrl, size_bytes, indexed_at FROM edgar.filings WHERE ticker = $1 ORDER BY 5 DESC`,
      [ticker.toUpperCase()],
    );
    return r.rows.map((row) => ({
      accession: row.accession,
      files: row.files,
      meta: rowToMeta(row),
    }));
  }

  /** All filings across every ticker, mapped to listings tagged with ticker. One query. */
  async listAllAsListings(): Promise<(LocalFileListing & { ticker: string })[]> {
    const rows = await this.listAllFilings();
    return rows.map((row) => ({
      ticker: row.ticker,
      accession: row.accession,
      files: row.files,
      meta: rowToMeta(row),
    }));
  }

  async listAllFilings(): Promise<FilingRow[]> {
    const r = await this.db.pool.query<FilingRow>(
      `SELECT accession, ticker, issuer_cik, form, to_char(filing_date, 'YYYY-MM-DD') AS filing_date, to_char(report_period, 'YYYY-MM-DD') AS report_period, primary_document, items, files, is_xbrl, is_inline_xbrl, size_bytes, indexed_at FROM edgar.filings ORDER BY 5 DESC`,
    );
    return r.rows;
  }

  async list801Accessions(): Promise<FilingRow[]> {
    const r = await this.db.pool.query<FilingRow>(
      `SELECT accession, ticker, issuer_cik, form, to_char(filing_date, 'YYYY-MM-DD') AS filing_date, to_char(report_period, 'YYYY-MM-DD') AS report_period, primary_document, items, files, is_xbrl, is_inline_xbrl, size_bytes, indexed_at FROM edgar.filings WHERE '8.01' = ANY(items) ORDER BY filing_date DESC`,
    );
    return r.rows;
  }

  async upsertScan(rec: ScanInsert): Promise<void> {
    await this.db.pool.query(
      `INSERT INTO edgar.filing_scans
         (accession, scan_type, matched, matched_keywords, snippet,
          ai_real_incident, ai_confidence, ai_incident_type, ai_summary, ai_model)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (accession, scan_type) DO UPDATE SET
         matched          = EXCLUDED.matched,
         matched_keywords = EXCLUDED.matched_keywords,
         snippet          = EXCLUDED.snippet,
         ai_real_incident = EXCLUDED.ai_real_incident,
         ai_confidence    = EXCLUDED.ai_confidence,
         ai_incident_type = EXCLUDED.ai_incident_type,
         ai_summary       = EXCLUDED.ai_summary,
         ai_model         = EXCLUDED.ai_model,
         scanned_at       = now()`,
      [
        rec.accession, rec.scanType, rec.matched, rec.matchedKeywords, rec.snippet ?? null,
        rec.aiRealIncident ?? null, rec.aiConfidence ?? null, rec.aiIncidentType ?? null,
        rec.aiSummary ?? null, rec.aiModel ?? null,
      ],
    );
  }

  /**
   * Scan results joined to filing metadata, newest first. Returns keyword
   * matches that the AI did NOT rule out — i.e. AI-confirmed incidents plus any
   * not-yet-classified matches. Boilerplate the AI rejected is excluded.
   */
  async getScans(scanType: string): Promise<ScanResultRow[]> {
    const r = await this.db.pool.query<ScanResultRow>(
      `SELECT f.accession, f.ticker, f.issuer_cik, f.form, to_char(f.filing_date, 'YYYY-MM-DD') AS filing_date, to_char(f.report_period, 'YYYY-MM-DD') AS report_period, f.primary_document, f.items, f.files, f.is_xbrl, f.is_inline_xbrl, f.size_bytes, f.indexed_at,
              s.matched, s.matched_keywords, s.snippet,
              s.ai_real_incident, s.ai_confidence::text AS ai_confidence, s.ai_incident_type, s.ai_summary
         FROM edgar.filing_scans s
         JOIN edgar.filings f USING (accession)
        WHERE s.scan_type = $1 AND s.matched = true
          AND s.ai_real_incident IS DISTINCT FROM false
        ORDER BY f.filing_date DESC`,
      [scanType],
    );
    return r.rows;
  }

  async listFilingsForTicker(ticker: string): Promise<FilingRow[]> {
    const r = await this.db.pool.query<FilingRow>(
      `SELECT accession, ticker, issuer_cik, form, to_char(filing_date, 'YYYY-MM-DD') AS filing_date, to_char(report_period, 'YYYY-MM-DD') AS report_period, primary_document, items, files, is_xbrl, is_inline_xbrl, size_bytes, indexed_at FROM edgar.filings WHERE ticker = $1 ORDER BY 5 DESC`,
      [ticker.toUpperCase()],
    );
    return r.rows;
  }

  async listFilingsForPerson(personCik: string): Promise<FilingRow[]> {
    const r = await this.db.pool.query<FilingRow>(
      `SELECT f.accession, f.ticker, f.issuer_cik, f.form, to_char(f.filing_date, 'YYYY-MM-DD') AS filing_date, to_char(f.report_period, 'YYYY-MM-DD') AS report_period, f.primary_document, f.items, f.files, f.is_xbrl, f.is_inline_xbrl, f.size_bytes, f.indexed_at FROM edgar.filings f
         JOIN edgar.filing_owners o USING(accession)
        WHERE o.person_cik = $1
        ORDER BY 5 DESC`,
      [personCik],
    );
    return r.rows;
  }

  async ownersForAccessions(accessions: string[]): Promise<OwnerRow[]> {
    if (accessions.length === 0) return [];
    const r = await this.db.pool.query<OwnerRow>(
      `SELECT * FROM edgar.filing_owners WHERE accession = ANY($1::text[])`,
      [accessions],
    );
    return r.rows;
  }

  async transactionsForAccessions(accessions: string[]): Promise<TxnRow[]> {
    if (accessions.length === 0) return [];
    const r = await this.db.pool.query<TxnRow>(
      `SELECT * FROM edgar.form4_transactions WHERE accession = ANY($1::text[])`,
      [accessions],
    );
    return r.rows;
  }
}

function rowToMeta(row: FilingRow): FilingMetadata {
  return {
    accession: row.accession,
    cik: row.issuer_cik,
    form: row.form as FilingMetadata["form"],
    filingDate: row.filing_date,
    reportDate: row.report_period ?? undefined,
    primaryDocument: row.primary_document ?? "",
    items: row.items ?? undefined,
    isXBRL: row.is_xbrl,
    isInlineXBRL: row.is_inline_xbrl,
    size: parseInt(row.size_bytes, 10) || 0,
  };
}
