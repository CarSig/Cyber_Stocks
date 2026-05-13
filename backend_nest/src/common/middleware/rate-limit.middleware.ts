import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { RateLimiter } from "@/shared/utils/rateLimiter";
import { AppError } from "@/shared/errors";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new RateLimiter(10, 15 * 60 * 1000);

  use(req: Request, _res: Response, next: NextFunction) {
    // Rate limiting disabled — ThrottlerGuard in app.module.ts provides per-endpoint control
    next();
  }
}
