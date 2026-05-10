import { Module } from "@nestjs/common";
import { CronService } from "./cron.service";
import { EventBridgeService } from "./event-bridge.service";
import { RedditService } from "@/modules/reddit/reddit.service";
import { NotificationsModule } from "@/modules/notifications/notifications.module";

@Module({
  imports: [NotificationsModule],
  providers: [CronService, EventBridgeService, RedditService],
  exports: [CronService],
})
export class SchedulerModule {}
