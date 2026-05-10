import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import type { Request } from "express";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { httpRequestDuration, httpRequestTotal } from "@/shared/metrics";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<Request>();
    const start = Date.now();
    const method = req.method;
    const route = req.route?.path ?? req.path ?? "unknown";

    return next.handle().pipe(
      tap({
        next: () => this.record(method, route, 200, start),
        error: (err: { status?: number }) => this.record(method, route, err?.status ?? 500, start),
      }),
    );
  }

  private record(method: string, route: string, status: number, start: number) {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration.observe({ method, route, status }, duration);
    httpRequestTotal.inc({ method, route, status });
  }
}
