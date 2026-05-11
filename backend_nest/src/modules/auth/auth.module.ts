import { Module, NestModule, MiddlewareConsumer, RequestMethod } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { AuditService } from "@/modules/audit/audit.service";
import { RateLimitMiddleware } from "@/common/middleware/rate-limit.middleware";
import { CoreDbModule } from "@/shared/core-db.module";

@Module({
  imports: [CoreDbModule],
  controllers: [AuthController],
  providers: [AuthService, AuditService],
  exports: [AuthService, AuditService],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes({ path: "auth/clerk", method: RequestMethod.POST });
  }
}
