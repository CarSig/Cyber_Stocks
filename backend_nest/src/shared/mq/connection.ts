import amqplib from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import { logger } from "../logger";
import { unavailable } from "../errors";

const AMQP_URL = process.env.AMQP_URL ?? "amqp://localhost";
export const NEWS_QUEUE = "news.articles";
export const NEWS_DEAD_QUEUE = "news.articles.dead";
export const NEWS_DLX = "news.articles.dlx";
export const NEWS_ANALYZED_QUEUE = "news.analyzed";
export const MAX_RETRIES = 5;

let connection: ChannelModel | null = null;
let channel: Channel | null = null;

export async function getChannel(): Promise<Channel> {
  if (channel) return channel;
  try {
    console.log(`[RabbitMQ] Connecting to ${AMQP_URL}...`);
    const connectTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("connection timed out after 5s")), 5000)
    );
    connection = await Promise.race([amqplib.connect(AMQP_URL), connectTimeout]) as ChannelModel;
    console.log("[RabbitMQ] Connected, setting up queues...");
    const ch = await connection.createChannel();
    await ch.assertExchange(NEWS_DLX, "direct", { durable: true });
    console.log(`[RabbitMQ] Exchange ${NEWS_DLX} ready`);
    await ch.assertQueue(NEWS_DEAD_QUEUE, { durable: true });
    await ch.bindQueue(NEWS_DEAD_QUEUE, NEWS_DLX, NEWS_QUEUE);
    console.log(`[RabbitMQ] Dead queue ${NEWS_DEAD_QUEUE} ready`);
    await ch.assertQueue(NEWS_QUEUE, { durable: true, arguments: { "x-dead-letter-exchange": NEWS_DLX, "x-dead-letter-routing-key": NEWS_QUEUE } });
    console.log(`[RabbitMQ] Main queue ${NEWS_QUEUE} ready`);
    await ch.assertQueue(NEWS_ANALYZED_QUEUE, { durable: false });
    console.log(`[RabbitMQ] Analyzed queue ${NEWS_ANALYZED_QUEUE} ready`);
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
    console.error(`[RabbitMQ] Failed to connect: ${(err as Error).message}`);
    throw unavailable(`RabbitMQ unavailable: ${(err as Error).message}`);
  }
}

export async function closeConnection(): Promise<void> {
  await connection?.close();
}
