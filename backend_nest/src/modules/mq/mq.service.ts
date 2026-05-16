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
      console.error(`[MqService] RabbitMQ unavailable on startup: ${(err as Error).message}`);
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
