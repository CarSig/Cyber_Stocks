import { Catch, ArgumentsHost, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { HealthCheckError } from "@nestjs/terminus";
import { toAppError } from "@/shared/errors";

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = { 400: "BAD_REQUEST", 401: "UNAUTHORIZED", 403: "FORBIDDEN", 404: "NOT_FOUND", 408: "REQUEST_TIMEOUT", 422: "UNPROCESSABLE", 503: "SERVICE_UNAVAILABLE" };
  return map[status] ?? (status >= 500 ? "INTERNAL_ERROR" : "ERROR");
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let code: string;

    if (exception instanceof HealthCheckError) {
      if (!res.headersSent) {
        res.status(503).json(exception.causes);
      }
      return;
    }

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === "string" ? body : (body as { message?: string }).message ?? exception.message;
      code = (body as { code?: string }).code ?? httpStatusToCode(status);
    } else {
      const parsed = toAppError(exception);
      status = parsed.status;
      message = parsed.message;
      code = parsed.code;
    }

    if (status >= 500) {
      Sentry.withScope((scope) => {
        scope.setTag("request_id", req.requestId);
        Sentry.captureException(exception);
      });
    }

    if (!res.headersSent) {
      res.status(status).json({ error: { code, message, requestId: req.requestId } });
    }
  }
}
