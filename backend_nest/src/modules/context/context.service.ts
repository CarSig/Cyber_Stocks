import { readFile } from "node:fs/promises";
import { Injectable, Logger } from "@nestjs/common";
import type { SimContext, LayerData, PredictionData } from "@algo/shared";
import { PATHS } from "@/shared/paths";

/** One company entry in companies.json. */
type CompanyEntry = { company: LayerData; prediction: PredictionData };

function emptyLayer(layer: LayerData["layer"], key: string): LayerData {
  return { layer, key, current: "No data", events: [] };
}

function emptyPrediction(key: string): PredictionData {
  return { key, current: "No data", events: [] };
}

/**
 * Serves dummy simulation-context data (market / industry / company + predictions)
 * from static JSON files under storage/context/. Files are read once and cached;
 * a missing file degrades to empty data rather than failing the request.
 */
@Injectable()
export class ContextService {
  private readonly logger = new Logger(ContextService.name);
  private loaded = false;
  private market: LayerData | null = null;
  private sectors: Record<string, LayerData> = {};
  private companies: Record<string, CompanyEntry> = {};
  private tickerSector: Record<string, string> = {};

  private async tryRead<T>(file: string): Promise<T | null> {
    try {
      return JSON.parse(await readFile(file, "utf-8")) as T;
    } catch (err) {
      this.logger.warn(`context file unreadable: ${file} (${(err as Error).message})`);
      return null;
    }
  }

  /** Lazy-load all four files once. Re-reads only if the first attempt failed entirely. */
  private async load(): Promise<void> {
    if (this.loaded) return;
    const [market, sectors, companies, tickerSector] = await Promise.all([
      this.tryRead<LayerData>(PATHS.contextMarket),
      this.tryRead<Record<string, LayerData>>(PATHS.contextSectors),
      this.tryRead<Record<string, CompanyEntry>>(PATHS.contextCompanies),
      this.tryRead<Record<string, string>>(PATHS.contextTickerSector),
    ]);
    this.market = market;
    this.sectors = sectors ?? {};
    this.companies = companies ?? {};
    this.tickerSector = tickerSector ?? {};
    this.loaded = true;
  }

  /**
   * Assemble the context bundle for a ticker. Always returns a well-formed
   * SimContext — unseeded tickers/sectors yield empty (but valid) layers.
   */
  async getContext(ticker: string): Promise<SimContext> {
    await this.load();
    const t = ticker.toUpperCase();

    const market = this.market ?? emptyLayer("market", "MARKET");

    const sectorName = this.tickerSector[t];
    const industry =
      (sectorName && this.sectors[sectorName]) || emptyLayer("industry", sectorName ?? "Unknown");

    const entry = this.companies[t];
    const company = entry?.company ?? emptyLayer("company", t);
    const prediction = entry?.prediction ?? emptyPrediction(t);

    return { ticker: t, market, industry, company, prediction };
  }
}
