import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AppError } from "@/shared/errors";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    if (req.user?.role !== "admin") throw new AppError("Forbidden", 403);
    return true;
  }
}
