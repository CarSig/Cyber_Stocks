import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { InjectPinoLogger, PinoLogger } from "nestjs-pino";
import { Observable, tap } from "rxjs";
import type { Request } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@InjectPinoLogger(LoggingInterceptor.name) private readonly logger: PinoLogger) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const { method, url, requestId, user } = req;
    const userId = user?.id;
    const username = user?.username;
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.info({ requestId, userId, username, method, url, ms: Date.now() - start }, "request completed");
        },
        error: (err: unknown) => {
          const status = (err as { status?: number }).status ?? 500;
          const ms = Date.now() - start;
          const meta = { requestId, userId, username, method, url, status, ms };
          if (status >= 500) {
            this.logger.error(meta, "request error");
          } else {
            this.logger.warn(meta, "request failed");
          }
        },
      }),
    );
  }
}
