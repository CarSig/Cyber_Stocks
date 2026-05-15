import "dotenv/config";
import type { IncomingMessage } from "node:http";
import type { Request } from "express";
import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { ThrottlerModule } from "@nestjs/throttler";
import { LoggerModule } from "nestjs-pino";

import { HttpExceptionFilter } from "@/common/errors/http-exception.filter";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { MetricsInterceptor } from "@/common/interceptors/metrics.interceptor";
import { TimeoutInterceptor } from "@/common/interceptors/timeout.interceptor";
import { LoggingInterceptor } from "@/common/interceptors/logging.interceptor";
import { RequestIdMiddleware } from "@/common/middleware/request-id.middleware";

import { AuthModule } from "@/modules/auth/auth.module";
import { StockModule } from "@/modules/stock/stock.module";
import { NewsModule } from "@/modules/news/news.module";
import { TrumpModule } from "@/modules/trump/trump.module";
import { RedditModule } from "@/modules/reddit/reddit.module";
import { ThreatIntelModule } from "@/modules/threat-intel/threat-intel.module";
import { IntelligenceModule } from "@/modules/intelligence/intelligence.module";
import { CyberNewsModule } from "@/modules/cyber-news/cyber-news.module";
import { AdminModule } from "@/modules/admin/admin.module";
import { MetricsModule } from "@/modules/metrics/metrics.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { ResearchModule } from "@/modules/research/research.module";
import { MqModule } from "@/modules/mq/mq.module";
import { SchedulerModule } from "@/modules/scheduler/scheduler.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { AlpacaModule } from "@/modules/alpaca/alpaca.module";
import { HealthModule } from "@/modules/health/health.module";
import { CoreDbModule } from "@/shared/core-db.module";
import { CacheModule } from "@/shared/cache.module";
import { AuthService } from "@/modules/auth/auth.service";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ".env" }),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 100 },  // 100 req/min per IP (general API)
      { name: "strict",  ttl: 60_000, limit: 20  },  // 20 req/min — use @Throttle({ strict: ... }) on heavy endpoints
    ]),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? "info",
        genReqId: (req: IncomingMessage) => (req as Request).requestId ?? crypto.randomUUID(),
        redact: ["req.headers.authorization"],
        transport: {
          targets: [
            {
              target: "pino/file",
              options: { destination: "logs/app.log", mkdir: true },
              level: "info",
            },
          ],
        },
      },
    }),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    AuthModule,
    NewsModule,
    TrumpModule,
    RedditModule,
    ThreatIntelModule,
    IntelligenceModule,
    CyberNewsModule,
    AdminModule,
    MetricsModule,
    NotificationsModule,
    ResearchModule,
    MqModule,
    SchedulerModule,
    CoreDbModule,
    CacheModule,
    AuditModule,
    AlpacaModule,
    StockModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER,      useClass: HttpExceptionFilter },
    // { provide: APP_GUARD,       useClass: ThrottlerGuard }, // Disabled — using endpoint-specific throttling instead
    { provide: APP_GUARD,       useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: MetricsInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },
    AuthService,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes("*");
  }
}
