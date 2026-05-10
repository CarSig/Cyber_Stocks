import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AuditService } from "@/modules/audit/audit.service";
import { SchedulerModule } from "@/modules/scheduler/scheduler.module";

@Module({
  imports: [SchedulerModule],
  controllers: [AdminController],
  providers: [AuditService],
})
export class AdminModule {}
