import { Module } from "@nestjs/common";
import { AlpacaController } from "./alpaca.controller";
import { AlpacaService } from "./alpaca.service";

@Module({
  controllers: [AlpacaController],
  providers: [AlpacaService],
})
export class AlpacaModule {}
