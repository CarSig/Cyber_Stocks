import { Module } from "@nestjs/common";
import { CronService } from "./cron.service";
import { EventBridgeService } from "./event-bridge.service";
import { RedditService } from "@/modules/reddit/reddit.service";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { CoreDbModule } from "@/shared/core-db.module";

@Module({
  imports: [NotificationsModule, CoreDbModule],
  providers: [CronService, EventBridgeService, RedditService],
  exports: [CronService],
})
export class SchedulerModule {}
