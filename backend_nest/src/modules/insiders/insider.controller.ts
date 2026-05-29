import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam } from "@nestjs/swagger";
import { InsiderService } from "./insider.service";
import type {
  InsiderCompanySummary,
  InsiderImpactAggregate,
  InsiderLeaderboardResponse,
  InsiderRow,
  PersonDetail,
} from "@algo/shared";

@ApiTags("Insiders")
@ApiBearerAuth("bearer")
@Controller("insiders")
export class InsiderController {
  constructor(private readonly svc: InsiderService) {}

  @Get("companies")
  @ApiOperation({ summary: "List companies with on-disk insider filings" })
  companies(): Promise<InsiderCompanySummary[]> {
    return this.svc.listCompanies();
  }

  @Get("company/:ticker")
  @ApiOperation({ summary: "List insiders for one company" })
  @ApiParam({ name: "ticker" })
  byCompany(@Param("ticker") ticker: string): Promise<InsiderRow[]> {
    return this.svc.listByCompany(ticker);
  }

  @Get("company/:ticker/aggregate")
  @ApiOperation({ summary: "Price-impact aggregate for a company's insider filings" })
  @ApiParam({ name: "ticker" })
  companyAggregate(@Param("ticker") ticker: string): Promise<InsiderImpactAggregate> {
    return this.svc.companyAggregate(ticker);
  }

  @Get("all")
  @ApiOperation({ summary: "List all insiders across all companies" })
  all(): Promise<InsiderRow[]> {
    return this.svc.listAll();
  }

  @Get("leaderboard")
  @ApiOperation({ summary: "All insiders ranked by avg same-day price impact magnitude" })
  leaderboard(): Promise<InsiderLeaderboardResponse> {
    return this.svc.leaderboard();
  }

  @Get("person/:cik/aggregate")
  @ApiOperation({ summary: "Price-impact aggregate for one insider" })
  @ApiParam({ name: "cik" })
  personAggregate(@Param("cik") cik: string): Promise<InsiderImpactAggregate> {
    return this.svc.personAggregate(cik);
  }

  @Get("person/:cik")
  @ApiOperation({ summary: "Get one insider's filings, grouped by company" })
  @ApiParam({ name: "cik" })
  person(@Param("cik") cik: string): Promise<PersonDetail> {
    return this.svc.getPerson(cik);
  }
}
