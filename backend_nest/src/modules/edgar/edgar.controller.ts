import { Controller, Post, Get, Param, Body } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { EdgarService } from "./edgar.service";
import { EdgarSyncDto, EdgarSyncResultDto, EdgarFileListingDto, CoverageIndexDto } from "./edgar.dto";

@ApiTags("EDGAR")
@ApiBearerAuth("bearer")
@Controller("edgar")
export class EdgarController {
  constructor(private readonly sec: EdgarService) {}

  @Get("tickers")
  @ApiOperation({ summary: "List supported tickers" })
  @ApiResponse({ status: 200, type: [String] })
  tickers(): string[] {
    return this.sec.tickers();
  }

  @Post("sync")
  @ApiOperation({ summary: "Download EDGAR filings for a ticker within a date range" })
  @ApiResponse({ status: 201, type: EdgarSyncResultDto })
  async sync(@Body() dto: EdgarSyncDto): Promise<EdgarSyncResultDto> {
    return this.sec.sync(dto.ticker, dto.dateFrom, dto.dateTo, dto.formTypes, dto.force);
  }

  @Get("files/:ticker")
  @ApiOperation({ summary: "List locally saved filings for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200, type: [EdgarFileListingDto] })
  files(@Param("ticker") ticker: string): EdgarFileListingDto[] {
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
