import { getChannel, NEWS_QUEUE } from "../connection";
import { logger } from "../../logger";

export async function publishNewArticles(companyName: string, ticker: string, articles: unknown[]): Promise<void> {
  if (!articles.length) return;
  try {
    const ch = await getChannel();
    for (const article of articles) {
      const msg = JSON.stringify({ companyName, ticker, article });
      ch.sendToQueue(NEWS_QUEUE, Buffer.from(msg), { persistent: true });
    }
    logger.info({ companyName, count: articles.length }, "published news to queue");
  } catch (err) {
    logger.error({ err, companyName }, "failed to publish news to queue");
  }
}
