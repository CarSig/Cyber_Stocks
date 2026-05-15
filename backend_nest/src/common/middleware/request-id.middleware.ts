import { Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const id = (req.headers["x-request-id"] as string | undefined) ?? crypto.randomUUID();
    req.requestId = id;
    res.setHeader("X-Request-ID", id);
    next();
  }
}
