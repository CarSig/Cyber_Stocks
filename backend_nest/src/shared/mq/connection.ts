import amqplib from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import { logger } from "../logger";
import { unavailable } from "../errors";

const AMQP_URL = process.env.AMQP_URL ?? "amqp://localhost";
export const NEWS_QUEUE = "news.articles";
export const NEWS_ANALYZED_QUEUE = "news.analyzed";

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;
  try {
    connection = await amqplib.connect(AMQP_URL);
    const ch = await connection.createChannel();
    await ch.assertQueue(NEWS_QUEUE, { durable: true });
    await ch.assertQueue(NEWS_ANALYZED_QUEUE, { durable: false });
    channel = ch;
    logger.info({ url: AMQP_URL }, "RabbitMQ connected");
    connection.on("error", (err: Error) => {
      logger.error({ err }, "RabbitMQ connection error");
      connection = null;
      channel = null;
    });
    ch.on("error", (err: Error) => {
      logger.error({ err }, "RabbitMQ channel error");
      channel = null;
    });
    return ch;
  } catch (err) {
    connection = null;
    channel = null;
    throw unavailable(`RabbitMQ unavailable: ${(err as Error).message}`);
  }
}

export async function closeConnection(): Promise<void> {
  await connection?.close();
}
