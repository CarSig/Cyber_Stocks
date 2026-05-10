export class AppError extends Error {
  readonly status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = "AppError";
    this.status = status;
  }
}

export const notFound      = (msg: string) => new AppError(msg, 404);
export const badRequest    = (msg: string) => new AppError(msg, 400);
export const unauthorized  = (msg: string) => new AppError(msg, 401);
export const unprocessable = (msg: string) => new AppError(msg, 422);
export const unavailable   = (msg: string) => new AppError(msg, 503);

export function toAppError(e: unknown): { status: number; message: string; original: unknown } {
  if (e instanceof AppError) return { status: e.status, message: e.message, original: e };
  if (e instanceof Error)    return { status: 500,       message: e.message, original: e };
  return { status: 500, message: "Internal server error", original: e };
}
