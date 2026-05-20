import { Injectable } from "@nestjs/common";
import { SecEdgarClient } from "@/shared/clients/SecEdgarClient";
import { COMPANY_CIK } from "@/data/CIK";
import { notFound } from "@/shared/errors";

@Injectable()
export class SecService {
  private readonly client = new SecEdgarClient();

  tickers(): string[] {
    return Object.keys(COMPANY_CIK);
  }

  async sync(ticker: string, dateFrom?: string, dateTo?: string, formTypes?: string[], force?: boolean) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    return this.client.sync(upper, dateFrom, dateTo, formTypes, force);
  }

  files(ticker: string) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    return this.client.listLocalFiles(upper);
  }

  coverage(ticker: string) {
    const upper = ticker.toUpperCase();
    if (!COMPANY_CIK[upper]) throw notFound(`Unknown ticker: ${upper}`);
    return this.client.getCoverage(upper);
  }
}
