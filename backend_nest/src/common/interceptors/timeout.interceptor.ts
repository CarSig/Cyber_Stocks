import { Injectable, NestInterceptor, ExecutionContext, CallHandler, RequestTimeoutException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError, TimeoutError } from "rxjs";
import { timeout, catchError } from "rxjs/operators";
import { TIMEOUT_KEY } from "@/common/decorators/timeout.decorator";
import { ALLOW_QUERY_TOKEN_KEY } from "@/common/decorators/allow-query-token.decorator";

const DEFAULT_TIMEOUT_MS = 30_000;

@Injectable()
export class TimeoutInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const isSse = this.reflector.getAllAndOverride<boolean>(ALLOW_QUERY_TOKEN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? false;

    if (isSse) return next.handle();

    const ms = this.reflector.getAllAndOverride<number>(TIMEOUT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? DEFAULT_TIMEOUT_MS;

    return next.handle().pipe(
      timeout(ms),
      catchError((err) =>
        err instanceof TimeoutError
          ? throwError(() => new RequestTimeoutException())
          : throwError(() => err),
      ),
    );
  }
}
