import { Module } from "@nestjs/common";
import { CronService } from "./cron.service";
import { EventBridgeService } from "./event-bridge.service";
import { RedditService } from "@/modules/reddit/reddit.service";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { CoreDbModule } from "@/shared/core-db.module";
import { EdgarModule } from "@/modules/edgar/edgar.module";
import { CacheService } from "@/shared/cache.service";

@Module({
  imports: [NotificationsModule, CoreDbModule, EdgarModule],
  providers: [CronService, EventBridgeService, RedditService, CacheService],
  exports: [CronService],
})
export class SchedulerModule {}
