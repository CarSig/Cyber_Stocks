import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { ALLOW_QUERY_TOKEN_KEY } from "@/common/decorators/allow-query-token.decorator";
import { AppError } from "@/shared/errors";
import { AuthService } from "@/modules/auth/auth.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  canActivate(ctx: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const allowQuery = this.reflector.getAllAndOverride<boolean>(ALLOW_QUERY_TOKEN_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) ?? false;

    const req = ctx.switchToHttp().getRequest<Request>();
    const token = this.extractToken(req, allowQuery);
    if (!token) throw new AppError("Unauthorized", 401);

    try {
      req.user = this.authService.verifyToken(token);
      return true;
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }
  }

  private extractToken(req: Request, allowQuery: boolean): string | null {
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      return authHeader.slice(7);
    }
    if (allowQuery && typeof req.query["token"] === "string") {
      return req.query["token"];
    }
    return null;
  }
}
