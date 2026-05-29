import { Module } from "@nestjs/common";
import { InsiderController } from "./insider.controller";
import { InsiderService } from "./insider.service";
import { PriceImpactService } from "./price-impact.service";
import { EdgarModule } from "@/modules/edgar/edgar.module";

@Module({
  imports: [EdgarModule],
  controllers: [InsiderController],
  providers: [InsiderService, PriceImpactService],
  exports: [InsiderService],
})
export class InsiderModule {}
