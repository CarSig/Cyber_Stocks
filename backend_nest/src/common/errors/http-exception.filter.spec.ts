import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { HealthCheckError } from "@nestjs/terminus";

// Mock Sentry before importing the filter so the captureException/withScope
// calls are observable and never hit the network.
const captureException = jest.fn();
const withScope = jest.fn((cb: (scope: { setTag: jest.Mock }) => void) =>
  cb({ setTag: jest.fn() }),
);
jest.mock("@sentry/node", () => ({
  captureException: (arg: unknown) => captureException(arg),
  withScope: (cb: (scope: { setTag: jest.Mock }) => void) => withScope(cb),
}));

import { HttpExceptionFilter } from "./http-exception.filter";
import { AppError } from "@/shared/errors";

type ResMock = {
  headersSent: boolean;
  status: jest.Mock;
  json: jest.Mock;
};

function makeRes(headersSent = false): ResMock {
  const res: ResMock = {
    headersSent,
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
}

function makeHost(res: ResMock, requestId = "req-123"): ArgumentsHost {
  const req = { requestId };
  return {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => req,
    }),
  } as unknown as ArgumentsHost;
}

describe("HttpExceptionFilter", () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    jest.clearAllMocks();
    filter = new HttpExceptionFilter();
  });

  describe("HealthCheckError", () => {
    it("responds 503 with the raw causes payload", () => {
      const res = makeRes();
      const causes = { db: { status: "down" } };
      const err = new HealthCheckError("unhealthy", causes);

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(causes);
      expect(captureException).not.toHaveBeenCalled();
    });

    it("does not write when headers already sent", () => {
      const res = makeRes(true);
      filter.catch(new HealthCheckError("unhealthy", {}), makeHost(res));
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe("HttpException", () => {
    it("maps a string body to message and derives code from status", () => {
      const res = makeRes();
      const err = new HttpException("nope", HttpStatus.FORBIDDEN);

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: "FORBIDDEN", message: "nope", requestId: "req-123" },
      });
    });

    it("reads message and code from an object body", () => {
      const res = makeRes();
      const err = new HttpException(
        { message: "bad input", code: "CUSTOM" },
        HttpStatus.BAD_REQUEST,
      );

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: "CUSTOM", message: "bad input", requestId: "req-123" },
      });
    });

    it("falls back to httpStatusToCode for an object body without a code", () => {
      const res = makeRes();
      const err = new HttpException({ message: "gone" }, HttpStatus.NOT_FOUND);

      filter.catch(err, makeHost(res));

      expect(res.json).toHaveBeenCalledWith({
        error: { code: "NOT_FOUND", message: "gone", requestId: "req-123" },
      });
    });

    it("maps unknown 4xx status to ERROR code", () => {
      const res = makeRes();
      const err = new HttpException("conflict", HttpStatus.CONFLICT); // 409

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith({
        error: { code: "ERROR", message: "conflict", requestId: "req-123" },
      });
    });

    it("does not report 4xx HttpExceptions to Sentry", () => {
      const res = makeRes();
      filter.catch(new HttpException("nope", 403), makeHost(res));
      expect(captureException).not.toHaveBeenCalled();
    });
  });

  describe("AppError / non-HttpException via toAppError", () => {
    it("maps an AppError to its status, message, and code", () => {
      const res = makeRes();
      const err = new AppError("missing ticker", 404, "TICKER_NOT_FOUND");

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: "TICKER_NOT_FOUND",
          message: "missing ticker",
          requestId: "req-123",
        },
      });
      expect(captureException).not.toHaveBeenCalled();
    });

    it("maps a plain Error to a 500 INTERNAL_ERROR envelope", () => {
      const res = makeRes();
      const err = new Error("boom");

      filter.catch(err, makeHost(res));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_ERROR",
          message: "boom",
          requestId: "req-123",
        },
      });
    });

    it("maps a non-Error thrown value to a generic 500 envelope", () => {
      const res = makeRes();

      filter.catch("just a string", makeHost(res));

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
          requestId: "req-123",
        },
      });
    });
  });

  describe("Sentry reporting", () => {
    it("captures 5xx exceptions and tags the request id", () => {
      const res = makeRes();
      const setTag = jest.fn();
      withScope.mockImplementationOnce((cb: (scope: { setTag: jest.Mock }) => void) =>
        cb({ setTag }),
      );
      const err = new Error("server blew up");

      filter.catch(err, makeHost(res, "req-xyz"));

      expect(withScope).toHaveBeenCalledTimes(1);
      expect(setTag).toHaveBeenCalledWith("request_id", "req-xyz");
      expect(captureException).toHaveBeenCalledWith(err);
    });

    it("reports 5xx HttpExceptions too", () => {
      const res = makeRes();
      filter.catch(
        new HttpException("upstream", HttpStatus.BAD_GATEWAY), // 502
        makeHost(res),
      );
      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });

  describe("headersSent guard", () => {
    it("skips writing the JSON envelope when headers already sent", () => {
      const res = makeRes(true);

      filter.catch(new Error("late"), makeHost(res));

      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it("still reports the 5xx to Sentry even if the response is already sent", () => {
      const res = makeRes(true);
      filter.catch(new Error("late"), makeHost(res));
      expect(captureException).toHaveBeenCalledTimes(1);
    });
  });
});
