import { Controller, Get, Param } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import type { SimContext } from "@algo/shared";
import { ContextService } from "./context.service";

@ApiTags("Context")
@ApiBearerAuth("bearer")
@Controller("context")
export class ContextController {
  constructor(private readonly contextService: ContextService) {}

  @Get(":ticker")
  @ApiOperation({ summary: "Simulation context (market / industry / company + predictions) for a ticker" })
  getContext(@Param("ticker") ticker: string): Promise<SimContext> {
    return this.contextService.getContext(ticker);
  }
}
