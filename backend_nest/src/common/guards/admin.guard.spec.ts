import { ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { AdminGuard } from "./admin.guard";
import { AppError } from "@/shared/errors";

type UserLike = Request["user"] | undefined;

function makeUser(role: "user" | "admin"): Request["user"] {
  return { id: "u1", username: "alice", role };
}

function makeCtx(user: UserLike): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }) as Request,
    }),
  } as unknown as ExecutionContext;
}

describe("AdminGuard", () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  it("allows when the user role is exactly 'admin'", () => {
    expect(guard.canActivate(makeCtx(makeUser("admin")))).toBe(true);
  });

  it("throws AppError 403 for a non-admin role", () => {
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

  it("throws AppError 403 when the user object has no role", () => {
    const ctx = makeCtx({} as unknown as Request["user"]);

    try {
      guard.canActivate(ctx);
      fail("expected guard to throw");
    } catch (e) {
      const err = e as AppError;
      expect(err.status).toBe(403);
    }
  });
});
