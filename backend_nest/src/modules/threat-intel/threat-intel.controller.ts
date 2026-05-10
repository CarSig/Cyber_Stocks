import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import type { KevThreatIntelService } from "./KevThreatIntelService";
import type { NvdThreatIntelService } from "./NvdThreatIntelService";
import type { OtxThreatIntelService } from "./OtxThreatIntelService";
import type { MispThreatIntelService } from "./MispThreatIntelService";
import { resolveTicker } from "@/shared/ticker.utils";
import { lagDaysSchema, paginationSchema } from "@/shared/validation";
import { AppError } from "@/shared/errors";

type ListQuery = Record<string, string | undefined>;

@Controller("threat-intel")
export class ThreatIntelController {
  constructor(
    @Inject("KEV_INTEL")  private readonly kev:  KevThreatIntelService,
    @Inject("NVD_INTEL")  private readonly nvd:  NvdThreatIntelService,
    @Inject("OTX_INTEL")  private readonly otx:  OtxThreatIntelService,
    @Inject("MISP_INTEL") private readonly misp: MispThreatIntelService,
  ) {}

  @Get("status")
  status() {
    return {
      kev:  this.kev.summary(),
      nvd:  this.nvd.summary(),
      otx:  this.otx.summary(),
      misp: this.misp.summary(),
    };
  }

  @Get("list/:source")
  list(@Param("source") source: string, @Query() query: ListQuery) {
    const paginationParsed = paginationSchema.safeParse(query);
    if (!paginationParsed.success) throw new AppError(paginationParsed.error.issues[0].message, 400);
    const page = paginationParsed.data;

    switch (source) {
      case "kev":
        return this.kev.list({ ...page, search: query.search ?? "", ransomware: query.ransomware ?? "", company: query.company ?? "" });
      case "nvd":
        return this.nvd.list({ ...page, search: query.search ?? "", severity: query.severity ?? "", company: query.company ?? "" });
      case "otx":
        return this.otx.list({ ...page, company: query.company ?? "" });
      case "misp":
        return this.misp.list(page);
      default:
        throw new AppError(`Unknown source: ${source}`, 404);
    }
  }

  @Get("correlate/:source/:ticker")
  async correlate(
    @Param("source") source: string,
    @Param("ticker") ticker: string,
    @Query("lagDays") lagDays: string,
  ) {
    const r = resolveTicker(ticker);
    const lagParsed = lagDaysSchema.safeParse(lagDays ?? "1");
    if (!lagParsed.success) throw new AppError(lagParsed.error.issues[0].message, 400);

    let service: { correlate: (name: string, lag: number) => Promise<unknown> };
    switch (source) {
      case "kev": service = this.kev; break;
      case "nvd": service = this.nvd; break;
      case "otx": service = this.otx; break;
      default: throw new AppError(`Unknown correlate source: ${source}`, 404);
    }

    return await service.correlate(r.name, lagParsed.data);
  }
}
