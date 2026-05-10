import amqplib from "amqplib";
import { NEWS_ANALYZED_QUEUE } from "../connection";
import { logger } from "../../logger";
type NotificationService = {
  broadcast: (notification: { type: string; [key: string]: unknown }) => void;
  broadcastProgress: (ticker: string, title: string, sentiment: number) => void;
};

const MAX_ATTEMPTS = 20;

async function connect(notificationService: NotificationService, attempt: number): Promise<void> {
  if (attempt > MAX_ATTEMPTS) {
    logger.error({ attempt }, "news.analyzed consumer: giving up after max retries");
    return;
  }
  const AMQP_URL = process.env.AMQP_URL ?? "amqp://localhost";
  try {
    const conn = await amqplib.connect(AMQP_URL);
    const ch = await conn.createChannel();
    await ch.assertQueue(NEWS_ANALYZED_QUEUE, { durable: false });

    ch.consume(NEWS_ANALYZED_QUEUE, (msg) => {
      if (!msg) return;
      try {
        const { ticker, title, scores } = JSON.parse(msg.content.toString()) as { ticker: string; title: string; scores: { sentiment: number } };
        const arrow = scores.sentiment >= 0.6 ? "▲▲" : scores.sentiment >= 0.1 ? "▲" : scores.sentiment <= -0.6 ? "▼▼" : scores.sentiment <= -0.1 ? "▼" : "●";
        notificationService.broadcast({
          type: "news.analyzed",
          at: new Date().toISOString(),
          ticker,
          title,
          sentiment: scores.sentiment,
          message: `${ticker} ${arrow} ${title}`,
        });
        notificationService.broadcastProgress(ticker, title, scores.sentiment);
        ch.ack(msg);
      } catch (e) {
        logger.error({ err: e }, "news.analyzed consumer error");
        ch.nack(msg, false, false);
      }
    }, { noAck: false });

    logger.info("subscribed to news.analyzed queue");

    conn.on("close", () => {
      logger.warn("news.analyzed consumer connection closed, reconnecting…");
      setTimeout(() => connect(notificationService, 1), 3000);
    });
    conn.on("error", (err: Error) => {
      logger.error({ err }, "news.analyzed consumer connection error");
    });
  } catch (err) {
    const delay = Math.min(3000 * attempt, 30000);
    logger.warn({ err: (err as Error).message, attempt }, `news.analyzed consumer: RabbitMQ unavailable, retrying in ${delay}ms`);
    setTimeout(() => connect(notificationService, attempt + 1), delay);
  }
}

export function startNewsAnalyzedConsumer(notificationService: NotificationService): void {
  connect(notificationService, 1);
}
