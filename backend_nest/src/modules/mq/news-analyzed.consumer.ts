import { Injectable, OnModuleInit } from "@nestjs/common";
import { startNewsAnalyzedConsumer } from "@/shared/mq/consumers/newsAnalyzedConsumer";
import { NotificationsService } from "@/modules/notifications/notifications.service";

@Injectable()
export class NewsAnalyzedConsumer implements OnModuleInit {
  constructor(private readonly notificationsService: NotificationsService) {}

  onModuleInit() {
    startNewsAnalyzedConsumer(this.notificationsService);
  }
}
