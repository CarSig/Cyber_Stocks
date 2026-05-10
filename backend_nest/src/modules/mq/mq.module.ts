import { Global, Module } from "@nestjs/common";
import { MqService } from "./mq.service";
import { NewsAnalyzedConsumer } from "./news-analyzed.consumer";
import { NotificationsModule } from "@/modules/notifications/notifications.module";

@Global()
@Module({
  imports: [NotificationsModule],
  providers: [MqService, NewsAnalyzedConsumer],
  exports: [MqService],
})
export class MqModule {}
