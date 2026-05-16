import { AppError, toAppError, notFound, badRequest, unauthorized, unprocessable, unavailable } from "./errors";

describe("AppError", () => {
  it("sets message, status, and name", () => {
    const err = new AppError("not found", 404);
    expect(err.message).toBe("not found");
    expect(err.status).toBe(404);
    expect(err.name).toBe("AppError");
  });

  it("defaults status to 500", () => {
    const err = new AppError("oops");
    expect(err.status).toBe(500);
  });

  it("derives code from status when no code supplied", () => {
    expect(new AppError("x", 400).code).toBe("BAD_REQUEST");
    expect(new AppError("x", 401).code).toBe("UNAUTHORIZED");
    expect(new AppError("x", 403).code).toBe("FORBIDDEN");
    expect(new AppError("x", 404).code).toBe("NOT_FOUND");
    expect(new AppError("x", 408).code).toBe("REQUEST_TIMEOUT");
    expect(new AppError("x", 422).code).toBe("UNPROCESSABLE");
    expect(new AppError("x", 503).code).toBe("SERVICE_UNAVAILABLE");
    expect(new AppError("x", 500).code).toBe("INTERNAL_ERROR");
    expect(new AppError("x", 599).code).toBe("INTERNAL_ERROR");
    expect(new AppError("x", 409).code).toBe("ERROR");
  });

  it("uses explicit code when provided", () => {
    const err = new AppError("msg", 404, "CUSTOM_CODE");
    expect(err.code).toBe("CUSTOM_CODE");
  });

  it("is an instance of Error", () => {
    expect(new AppError("x")).toBeInstanceOf(Error);
  });
});

describe("factory helpers", () => {
  it("notFound creates 404 AppError", () => {
    const e = notFound("missing");
    expect(e.status).toBe(404);
    expect(e.message).toBe("missing");
  });

  it("badRequest creates 400 AppError", () => {
    expect(badRequest("bad").status).toBe(400);
  });

  it("unauthorized creates 401 AppError", () => {
    expect(unauthorized("unauth").status).toBe(401);
  });

  it("unprocessable creates 422 AppError", () => {
    expect(unprocessable("invalid").status).toBe(422);
  });

  it("unavailable creates 503 AppError", () => {
    expect(unavailable("down").status).toBe(503);
  });

  it("factory forwards optional code", () => {
    const e = notFound("missing", "TICKER_NOT_FOUND");
    expect(e.code).toBe("TICKER_NOT_FOUND");
  });
});

describe("toAppError", () => {
  it("returns AppError fields when given an AppError", () => {
    const src = new AppError("not found", 404, "NOT_FOUND");
    const result = toAppError(src);
    expect(result.status).toBe(404);
    expect(result.message).toBe("not found");
    expect(result.code).toBe("NOT_FOUND");
    expect(result.original).toBe(src);
  });

  it("returns 500 INTERNAL_ERROR for a plain Error", () => {
    const src = new Error("crash");
    const result = toAppError(src);
    expect(result.status).toBe(500);
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("crash");
    expect(result.original).toBe(src);
  });

  it("returns 500 INTERNAL_ERROR for a non-Error unknown value", () => {
    const result = toAppError("string error");
    expect(result.status).toBe(500);
    expect(result.code).toBe("INTERNAL_ERROR");
    expect(result.message).toBe("Internal server error");
    expect(result.original).toBe("string error");
  });

  it("handles null/undefined unknown values", () => {
    expect(toAppError(null).status).toBe(500);
    expect(toAppError(undefined).status).toBe(500);
  });
});
