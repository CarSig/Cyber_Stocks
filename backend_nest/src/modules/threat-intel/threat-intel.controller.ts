import { Controller, Get, Param, Query, Inject } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from "@nestjs/swagger";
import type { KevThreatIntelService } from "./KevThreatIntelService";
import type { NvdThreatIntelService } from "./NvdThreatIntelService";
import type { OtxThreatIntelService } from "./OtxThreatIntelService";
import type { MispThreatIntelService } from "./MispThreatIntelService";
import { resolveTicker } from "@/shared/ticker.utils";
import { LagDaysDto, PaginationDto } from "@/shared/dto";
import { ThreatIntelStatusResponseDto } from "./threat-intel.dto";
import { CorrelationWithImpactDto } from "@/modules/stock/stock.dto";
import { AppError } from "@/shared/errors";

type ListQuery = Record<string, string | undefined>;

@ApiTags("Threat Intel")
@ApiBearerAuth("bearer")
@Controller("threat-intel")
export class ThreatIntelController {
  constructor(
    @Inject("KEV_INTEL")  private readonly kev:  KevThreatIntelService,
    @Inject("NVD_INTEL")  private readonly nvd:  NvdThreatIntelService,
    @Inject("OTX_INTEL")  private readonly otx:  OtxThreatIntelService,
    @Inject("MISP_INTEL") private readonly misp: MispThreatIntelService,
  ) {}

  @Get("status")
  @ApiOperation({ summary: "Source sync status", description: "Returns record counts and last-sync timestamps for all threat intel sources: CISA KEV, NVD, AlienVault OTX, and MISP." })
  @ApiResponse({ status: 200, type: ThreatIntelStatusResponseDto })
  status() {
    return {
      kev:  this.kev.summary(),
      nvd:  this.nvd.summary(),
      otx:  this.otx.summary(),
      misp: this.misp.summary(),
    };
  }

  @Get("list/:source")
  @ApiOperation({ summary: "List threat intel entries", description: "Paginated entries for a single source. kev and nvd support full-text search and severity/ransomware filtering. otx and misp return { configured: false } when the API key is missing." })
  @ApiParam({ name: "source", description: "Source name", enum: ["kev", "nvd", "otx", "misp"] })
  @ApiQuery({ name: "search", required: false, description: "Full-text search (kev, nvd)" })
  @ApiQuery({ name: "severity", required: false, description: "Severity filter: LOW | MEDIUM | HIGH | CRITICAL (nvd only)" })
  @ApiQuery({ name: "ransomware", required: false, description: "Filter ransomware-associated entries (kev only)" })
  @ApiQuery({ name: "company", required: false, description: "Filter by company name (kev, nvd, otx)" })
  @ApiResponse({ status: 200, description: "{ total, items, syncedAt, configured? }" })
  @ApiResponse({ status: 400, description: "Invalid pagination params" })
  @ApiResponse({ status: 404, description: "Unknown source" })
  list(@Param("source") source: string, @Query() query: PaginationDto & ListQuery) {
    const { limit = 50, offset = 0, ...rest } = query;

    switch (source) {
      case "kev":
        return this.kev.list({ limit, offset, search: rest.search ?? "", ransomware: rest.ransomware ?? "", company: rest.company ?? "" });
      case "nvd":
        return this.nvd.list({ limit, offset, search: rest.search ?? "", severity: rest.severity ?? "", company: rest.company ?? "" });
      case "otx":
        return this.otx.list({ limit, offset, company: rest.company ?? "" });
      case "misp":
        return this.misp.list({ limit, offset });
      default:
        throw new AppError(`Unknown source: ${source}`, 404);
    }
  }

  @Get("correlate/:source/:ticker")
  @ApiOperation({ summary: "Threat intel–price correlation", description: "Correlates threat event dates for a source with a ticker's stock price movements. Requires at least 4 threat events to compute." })
  @ApiParam({ name: "source", description: "Source name", enum: ["kev", "nvd", "otx"] })
  @ApiParam({ name: "ticker", description: "Ticker symbol" })
  @ApiResponse({ status: 200, type: CorrelationWithImpactDto })
  @ApiResponse({ status: 400, description: "Not enough threat events (< 4)" })
  @ApiResponse({ status: 404, description: "Unknown source or ticker" })
  async correlate(
    @Param("source") source: string,
    @Param("ticker") ticker: string,
    @Query() { lagDays }: LagDaysDto,
  ) {
    const r = resolveTicker(ticker);

    let service: { correlate: (name: string, lag: number) => Promise<unknown> };
    switch (source) {
      case "kev": service = this.kev; break;
      case "nvd": service = this.nvd; break;
      case "otx": service = this.otx; break;
      default: throw new AppError(`Unknown correlate source: ${source}`, 404);
    }

    return await service.correlate(r.name, lagDays ?? 1);
  }
}
