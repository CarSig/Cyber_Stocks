import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from "@nestjs/terminus";
import { CacheService } from "@/shared/cache.service";

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly cache: CacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const ok = await this.cache.ping();
    if (ok) return this.getStatus(key, true);
    throw new HealthCheckError(
      "Redis check failed",
      this.getStatus(key, false),
    );
  }
}
