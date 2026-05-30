import { Controller, Post, Get, Param, Body, Sse, MessageEvent } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from "@nestjs/swagger";
import { Observable } from "rxjs";
import { EdgarService } from "./edgar.service";
import { EdgarSyncDto, EdgarSyncStartedDto, EdgarFileListingDto, EdgarFileListingWithTickerDto, CoverageIndexDto } from "./edgar.dto";
import { AllowQueryToken } from "@/common/decorators/allow-query-token.decorator";
import { type FormType } from "@algo/shared";

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
  @ApiOperation({ summary: "Start a fire-and-forget EDGAR sync for a ticker. Progress streams via SSE." })
  @ApiResponse({ status: 201, type: EdgarSyncStartedDto })
  sync(@Body() dto: EdgarSyncDto): EdgarSyncStartedDto {
    return this.sec.startSync(dto.ticker, dto.dateFrom, dto.dateTo, dto.formTypes as FormType[] | undefined, dto.force);
  }

  @Get("sync/status/:ticker")
  @ApiOperation({ summary: "Whether a sync is currently in flight for the ticker" })
  @ApiParam({ name: "ticker" })
  syncStatus(@Param("ticker") ticker: string): { running: boolean } {
    return { running: this.sec.isSyncRunning(ticker) };
  }

  @Sse("sync/progress/:ticker")
  @AllowQueryToken()
  @ApiOperation({ summary: "SSE stream of sync progress for a ticker" })
  @ApiParam({ name: "ticker" })
  syncProgress(@Param("ticker") ticker: string): Observable<MessageEvent> {
    return this.sec.streamProgress(ticker);
  }

  @Get("files")
  @ApiOperation({ summary: "List all locally saved filings across every ticker, tagged with ticker" })
  @ApiResponse({ status: 200, type: [EdgarFileListingWithTickerDto] })
  filesAll(): Promise<EdgarFileListingWithTickerDto[]> {
    return this.sec.filesAll() as unknown as Promise<EdgarFileListingWithTickerDto[]>;
  }

  @Get("files/:ticker")
  @ApiOperation({ summary: "List locally saved filings for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200, type: [EdgarFileListingDto] })
  files(@Param("ticker") ticker: string): Promise<EdgarFileListingDto[]> {
    return this.sec.files(ticker) as unknown as Promise<EdgarFileListingDto[]>;
  }

  @Post("scan/801")
  @ApiOperation({ summary: "Start a fire-and-forget keyword scan of all 8.01 filing bodies. Progress streams via SSE." })
  scan801(): { started: boolean; running: boolean } {
    return this.sec.startScan801();
  }

  @Get("scan/801/status")
  @ApiOperation({ summary: "Whether the 8.01 keyword scan is currently running" })
  scan801Status(): { running: boolean } {
    return { running: this.sec.isScan801Running };
  }

  @Sse("scan/801/progress")
  @AllowQueryToken()
  @ApiOperation({ summary: "SSE stream of 8.01 scan progress" })
  scan801Progress(): Observable<MessageEvent> {
    return this.sec.streamScan801();
  }

  @Get("scan/801/results")
  @ApiOperation({ summary: "8.01 filings whose body matched cyber/outage keywords, with matched terms + snippet" })
  scan801Results() {
    return this.sec.scan801Results();
  }

  @Get("coverage/:ticker")
  @ApiOperation({ summary: "Get downloaded date-range coverage for a ticker" })
  @ApiParam({ name: "ticker" })
  @ApiResponse({ status: 200, type: CoverageIndexDto })
  coverage(@Param("ticker") ticker: string): CoverageIndexDto {
    return this.sec.coverage(ticker);
  }
}
