export const correlationKeys = {
  matrix: (opts: object) => ['correlation-matrix', opts] as const,
  pair: (a: string, b: string, window?: number, lag?: number) => ['correlation', a, b, window, lag] as const,
};
