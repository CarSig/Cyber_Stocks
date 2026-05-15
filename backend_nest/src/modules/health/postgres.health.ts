import { Injectable } from "@nestjs/common";
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from "@nestjs/terminus";
import { CoreDbService } from "@/shared/core-db.service";

@Injectable()
export class PostgresHealthIndicator extends HealthIndicator {
  constructor(private readonly db: CoreDbService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.db.pool.query("SELECT 1");
      return this.getStatus(key, true);
    } catch (e) {
      throw new HealthCheckError(
        "Postgres check failed",
        this.getStatus(key, false, { error: (e as Error).message }),
      );
    }
  }
}
