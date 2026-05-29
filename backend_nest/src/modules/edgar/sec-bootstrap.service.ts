import { Injectable, OnApplicationBootstrap, Logger } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { COMPANY_CIK, getCik } from "@/data/CIK";
import { PATHS } from "@/shared/paths";
import { SecFilingsRepository, type FilingInsert, type OwnerInsert } from "./sec-filings.repository";
import { parseInsiderSgmlHeader } from "@/modules/insiders/insider.parser";
import { parseForm4Xml, parseOwnerProfile } from "@/modules/insiders/form4.parser";
import type { FilingMetadata } from "@algo/shared";

@Injectable()
export class SecBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SecBootstrapService.name);

  constructor(private readonly repo: SecFilingsRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    // Defer so migrations finish first
    setTimeout(() => {
      void this.backfillIfEmpty();
    }, 2000);
  }

  private async backfillIfEmpty(): Promise<void> {
    try {
      const count = await this.repo.countAllFilings();
      if (count > 0) return;

      this.logger.log("edgar.filings empty — backfilling from disk");
      let indexed = 0;

      for (const ticker of Object.keys(COMPANY_CIK)) {
        const tickerDir = PATHS.secArchive(ticker);
        if (!fs.existsSync(tickerDir)) continue;

        const cik = getCik(ticker) ?? "";
        const accessionDirs = fs.readdirSync(tickerDir, { withFileTypes: true })
          .filter((e) => e.isDirectory())
          .map((e) => e.name);

        for (const accession of accessionDirs) {
          const accDir = path.join(tickerDir, accession);
          try {
            await this.indexAccession(ticker, cik, accession, accDir);
            indexed++;
            if (indexed % 25 === 0) {
              this.logger.log(`edgar backfill: ${indexed} filings indexed...`);
            }
          } catch (e) {
            this.logger.warn(`backfill failed for ${ticker}/${accession}: ${(e as Error).message}`);
          }
        }
      }

      this.logger.log(`edgar backfill complete: ${indexed} filings indexed`);
    } catch (e) {
      this.logger.error(`edgar backfill skipped: ${(e as Error).message}`);
    }
  }

  private async indexAccession(
    ticker: string,
    cik: string,
    accession: string,
    accDir: string,
  ): Promise<void> {
    const allEntries = fs.readdirSync(accDir);
    const files = allEntries.filter((f) => f !== "_meta.json");

    // Load meta.json if present
    let meta: FilingMetadata | undefined;
    const metaPath = path.join(accDir, "_meta.json");
    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, "utf8")) as FilingMetadata;
      } catch { /* ignore malformed */ }
    }

    // For insider forms, parse the .txt to get owner + transactions
    const txtFile = path.join(accDir, `${accession}.txt`);
    let header = null;
    let transactions: ReturnType<typeof parseForm4Xml> = [];
    let ownerProfile: ReturnType<typeof parseOwnerProfile> = undefined;

    if (fs.existsSync(txtFile)) {
      try {
        const fullText = fs.readFileSync(txtFile, "utf8");
        header = parseInsiderSgmlHeader(fullText);
        if (header?.formType === "4" || header?.formType === "4/A") {
          transactions = parseForm4Xml(fullText);
          ownerProfile = parseOwnerProfile(fullText);
        }
      } catch { /* parse failures shouldn't block indexing */ }
    }

    // Determine form: prefer meta, fall back to parsed header
    const form = meta?.form ?? header?.formType;
    if (!form) {
      // Non-supported / unknown form — skip
      return;
    }

    const filingDate = meta?.filingDate ?? header?.filingDate;
    if (!filingDate) return;

    const insert: FilingInsert = {
      accession,
      ticker,
      issuerCik: meta?.cik ?? header?.issuerCik ?? cik,
      form,
      filingDate,
      reportPeriod: meta?.reportDate ?? header?.reportPeriod ?? null,
      primaryDocument: meta?.primaryDocument ?? null,
      items: meta?.items ?? null,
      files,
      isXBRL: meta?.isXBRL ?? false,
      isInlineXBRL: meta?.isInlineXBRL ?? false,
      sizeBytes: meta?.size ?? 0,
    };

    await this.repo.upsertFiling(insert);

    if (header) {
      const owner: OwnerInsert = {
        personCik: header.ownerCik,
        personName: header.ownerName,
        profile: ownerProfile,
      };
      await this.repo.replaceOwners(accession, [owner]);
    }

    if (transactions.length > 0) {
      await this.repo.replaceTransactions(accession, transactions);
    }
  }
}
