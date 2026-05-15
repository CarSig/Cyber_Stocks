export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(message: string, status = 500, code?: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code ?? statusToCode(status);
  }
}

function statusToCode(status: number): string {
  switch (status) {
    case 400: return "BAD_REQUEST";
    case 401: return "UNAUTHORIZED";
    case 403: return "FORBIDDEN";
    case 404: return "NOT_FOUND";
    case 408: return "REQUEST_TIMEOUT";
    case 422: return "UNPROCESSABLE";
    case 503: return "SERVICE_UNAVAILABLE";
    default:  return status >= 500 ? "INTERNAL_ERROR" : "ERROR";
  }
}

export const notFound      = (msg: string, code?: string) => new AppError(msg, 404, code);
export const badRequest    = (msg: string, code?: string) => new AppError(msg, 400, code);
export const unauthorized  = (msg: string, code?: string) => new AppError(msg, 401, code);
export const unprocessable = (msg: string, code?: string) => new AppError(msg, 422, code);
export const unavailable   = (msg: string, code?: string) => new AppError(msg, 503, code);

export function toAppError(e: unknown): { status: number; message: string; code: string; original: unknown } {
  if (e instanceof AppError) return { status: e.status, message: e.message, code: e.code, original: e };
  if (e instanceof Error)    return { status: 500, message: e.message, code: "INTERNAL_ERROR", original: e };
  return { status: 500, message: "Internal server error", code: "INTERNAL_ERROR", original: e };
}
