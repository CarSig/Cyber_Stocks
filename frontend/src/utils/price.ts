export const PriceUtils = {
  fmt(v: number | string | null | undefined): string {
    return v != null ? `$${Number(v).toFixed(2)}` : '—';
  },
} as const;
