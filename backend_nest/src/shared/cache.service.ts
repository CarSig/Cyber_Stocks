import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn("REDIS_URL not set — caching disabled");
      this.client = null;
      return;
    }
    this.client = new Redis(url, { lazyConnect: true, enableOfflineQueue: false });
    this.client.on("error", (err) => this.logger.warn(`Redis error: ${(err as Error).message}`));
    this.client.connect().catch(() => {});
  }

  async getOrSet<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
    if (!this.client) return fn();
    try {
      const cached = await this.client.get(key);
      if (cached != null) return JSON.parse(cached) as T;
      const result = await fn();
      await this.client.setex(key, ttlSeconds, JSON.stringify(result));
      return result;
    } catch {
      return fn();
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    return this.client.ping().then(() => true).catch(() => false);
  }

  async del(key: string): Promise<void> {
    await this.client?.del(key).catch(() => {});
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
