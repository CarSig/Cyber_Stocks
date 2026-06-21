import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { RolesGuard } from "./roles.guard";
import { ROLES_KEY } from "@/common/decorators/roles.decorator";
import { AppError } from "@/shared/errors";

type UserLike = Request["user"] | undefined;

function makeUser(role: "user" | "admin"): Request["user"] {
  return { id: "u1", username: "alice", role };
}

function makeCtx(user: UserLike): ExecutionContext {
  const handler = () => undefined;
  const klass = class Controller {};
  return {
    getHandler: () => handler,
    getClass: () => klass,
    switchToHttp: () => ({
      getRequest: () => ({ user }) as Request,
    }),
  } as unknown as ExecutionContext;
}

function makeReflector(required: string[] | undefined): Reflector {
  return {
    getAllAndOverride: jest.fn(() => required),
  } as unknown as Reflector;
}

describe("RolesGuard", () => {
  describe("no required roles", () => {
    it("allows when metadata is undefined", () => {
      const reflector = makeReflector(undefined);
      const guard = new RolesGuard(reflector);

      expect(guard.canActivate(makeCtx(undefined))).toBe(true);
    });

    it("allows when metadata is an empty array", () => {
      const guard = new RolesGuard(makeReflector([]));

      expect(guard.canActivate(makeCtx(undefined))).toBe(true);
    });

    it("reads metadata from both handler and class via getAllAndOverride", () => {
      const reflector = makeReflector(undefined);
      const guard = new RolesGuard(reflector);
      const ctx = makeCtx(undefined);

      guard.canActivate(ctx);

      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });
  });

  describe("with required roles", () => {
    it("allows when user role matches a required role", () => {
      const guard = new RolesGuard(makeReflector(["admin", "user"]));

      expect(guard.canActivate(makeCtx(makeUser("user")))).toBe(true);
    });

    it("throws AppError 403 when user role is not in the required list", () => {
      const guard = new RolesGuard(makeReflector(["admin"]));
      const ctx = makeCtx(makeUser("user"));

      expect(() => guard.canActivate(ctx)).toThrow(AppError);
      try {
        guard.canActivate(ctx);
        fail("expected guard to throw");
      } catch (e) {
        const err = e as AppError;
        expect(err).toBeInstanceOf(AppError);
        expect(err.status).toBe(403);
        expect(err.code).toBe("FORBIDDEN");
        expect(err.message).toBe("Forbidden");
      }
    });

    it("throws AppError 403 when there is no authenticated user", () => {
      const guard = new RolesGuard(makeReflector(["admin"]));
      const ctx = makeCtx(undefined);

      try {
        guard.canActivate(ctx);
        fail("expected guard to throw");
      } catch (e) {
        const err = e as AppError;
        expect(err.status).toBe(403);
        expect(err.code).toBe("FORBIDDEN");
      }
    });
  });
});
