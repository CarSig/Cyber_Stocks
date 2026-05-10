import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import type { Channel } from "amqplib";
import { getChannel, closeConnection } from "@/shared/mq/connection";

@Injectable()
export class MqService implements OnModuleInit, OnModuleDestroy {
  private channel: Channel | null = null;

  async onModuleInit() {
    try {
      this.channel = await getChannel();
    } catch (err) {
      // Connection is retried inside getChannel; log and continue
    }
  }

  async onModuleDestroy() {
    await closeConnection();
  }

  getChannel(): Channel {
    if (!this.channel) throw new Error("RabbitMQ channel not ready");
    return this.channel;
  }
}
