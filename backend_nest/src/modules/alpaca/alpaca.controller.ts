import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AlpacaService } from './alpaca.service';
import { GetBarsDoc } from './alpaca.docs';
import { AlpacaBarsQueryDto } from '@/shared/dto';

@ApiTags('Alpaca')
@ApiBearerAuth('bearer')
@Controller('alpaca')
export class AlpacaController {
  constructor(private readonly alpacaService: AlpacaService) {}

  @Get('bars/:ticker')
  @GetBarsDoc()
  async getBars(
    @Param('ticker') ticker: string,
    @Query() { date, timeframe = '1Min' }: AlpacaBarsQueryDto,
  ) {
    return this.alpacaService.getBars(ticker.toUpperCase(), date, timeframe);
  }
}
