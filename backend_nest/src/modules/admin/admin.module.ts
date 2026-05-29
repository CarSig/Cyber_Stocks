import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AuditService } from "@/modules/audit/audit.service";
import { SchedulerModule } from "@/modules/scheduler/scheduler.module";
import { EdgarModule } from "@/modules/edgar/edgar.module";
import { StockModule } from "@/modules/stock/stock.module";

@Module({
  imports: [SchedulerModule, EdgarModule, StockModule],
  controllers: [AdminController],
  providers: [AuditService],
})
export class AdminModule {}
