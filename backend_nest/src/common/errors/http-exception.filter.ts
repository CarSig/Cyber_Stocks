import { Catch, ArgumentsHost, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Request, Response } from "express";
import * as Sentry from "@sentry/node";
import { toAppError } from "@/shared/errors";

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status: number;
    let message: string;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === "string" ? body : (body as { message?: string }).message ?? exception.message;
    } else {
      const parsed = toAppError(exception);
      status = parsed.status;
      message = parsed.message;
    }

    if (status >= 500) {
      Sentry.captureException(exception);
    }

    if (!res.headersSent) {
      res.status(status).json({ error: message });
    }
  }
}
