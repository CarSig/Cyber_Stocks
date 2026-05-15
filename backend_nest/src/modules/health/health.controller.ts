import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { HealthCheckService, HealthCheck, MemoryHealthIndicator } from "@nestjs/terminus";
import { Public } from "@/common/decorators/public.decorator";
import { PostgresHealthIndicator } from "./postgres.health";
import { RedisHealthIndicator } from "./redis.health";

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly memory: MemoryHealthIndicator,
    private readonly postgres: PostgresHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  @ApiOperation({ summary: "Liveness and readiness health check" })
  check() {
    return this.health.check([
      () => this.postgres.isHealthy("postgres"),
      () => this.redis.isHealthy("redis"),
      () => this.memory.checkHeap("memory_heap", 300 * 1024 * 1024),
    ]);
  }
}
