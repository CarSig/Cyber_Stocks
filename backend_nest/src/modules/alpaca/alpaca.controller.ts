import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import { AlpacaService } from "./alpaca.service";
import { GetBarsDoc } from "./alpaca.docs";
import { AppError } from "@/shared/errors";

@ApiTags("Alpaca")
@ApiBearerAuth("bearer")
@Controller("alpaca")
export class AlpacaController {
  constructor(private readonly alpacaService: AlpacaService) {}

  @Get("bars/:ticker")
  @GetBarsDoc()
  async getBars(@Param("ticker") ticker: string, @Query("date") date: string, @Query("timeframe") timeframe = "1Min") {
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError("date query param is required (YYYY-MM-DD)", 400);
    }
    return this.alpacaService.getBars(ticker.toUpperCase(), date, timeframe);
  }
}
