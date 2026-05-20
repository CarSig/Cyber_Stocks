import { Controller, Post, Get, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { SecService } from "./sec.service";
import { SecSyncDto, SecSyncResultDto, SecFileListingDto, CoverageIndexDto } from "./sec.dto";

@ApiTags("SEC")
@ApiBearerAuth("bearer")
@Controller("sec")
export class SecController {
  constructor(private readonly sec: SecService) {}

  @Get("tickers")
  @ApiOperation({ summary: "List supported tickers" })
  @ApiResponse({ status: 200, type: [String] })
  tickers(): string[] {
    return this.sec.tickers();
  }

  @Post("sync")
  @ApiOperation({ summary: "Download SEC filings for a ticker within a date range" })
  @ApiResponse({ status: 201, type: SecSyncResultDto })
  async sync(@Body() dto: SecSyncDto): Promise<SecSyncResultDto> {
    return this.sec.sync(dto.ticker, dto.dateFrom, dto.dateTo, dto.formTypes, dto.force);
  }

  @Get("files/:ticker")
  @ApiOperation({ summary: "List locally saved filings for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200, type: [SecFileListingDto] })
  files(@Param("ticker") ticker: string): SecFileListingDto[] {
    return this.sec.files(ticker);
  }

  @Get("coverage/:ticker")
  @ApiOperation({ summary: "Get downloaded date-range coverage for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200, type: CoverageIndexDto })
  coverage(@Param("ticker") ticker: string): CoverageIndexDto {
    return this.sec.coverage(ticker);
  }
}
