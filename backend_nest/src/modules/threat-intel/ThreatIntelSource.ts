import type { Quote } from "@/types/index";

export type CompanyDataConsumer = {
  history(): Promise<Record<string, unknown>>;
  news(): Promise<Record<string, unknown>>;
};

export type CompanyConsumerFactory = (companyName: string) => CompanyDataConsumer;

export abstract class ThreatIntelSource<TList, TListResult, TSummary> {
  constructor(protected readonly consumerFactory: CompanyConsumerFactory) {}

  abstract readonly source: string;
  abstract summary(): TSummary;
  abstract list(opts?: Record<string, unknown>): TListResult;

  protected abstract read(): TList | null;

  protected async quotes(companyName: string): Promise<Quote[]> {
    return ((await this.consumerFactory(companyName).history() as { quotes?: Quote[] }).quotes ?? []);
  }
}
