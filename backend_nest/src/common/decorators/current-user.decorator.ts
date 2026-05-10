import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import type { User } from "../../types/index";

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);
