import { Module } from "@nestjs/common";
import { StockController } from "./stock.controller";
import { StockService } from "./stock.service";
import { SimulationService } from "./simulation.service";
import { AuditService } from "@/modules/audit/audit.service";

@Module({
  controllers: [StockController],
  providers: [StockService, SimulationService, AuditService],
  exports: [StockService, SimulationService, AuditService],
})
export class StockModule {}
