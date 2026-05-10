import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { RateLimiter } from "@/shared/utils/rateLimiter";
import { AppError } from "@/shared/errors";

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new RateLimiter(10, 15 * 60 * 1000);

  use(req: Request, _res: Response, next: NextFunction) {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    if (!this.limiter.allow(ip)) {
      throw new AppError("Too many requests, please try again later", 429);
    }
    next();
  }
}
