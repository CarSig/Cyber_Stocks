export const GROUPED_SENTIMENT_COLORS: Record<string, string> = {
  positive: 'var(--color-green)',
  negative: 'var(--color-red)',
  neutral: 'var(--color-amber)',
};

export const LAG_WINDOW_OPTS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

export const LAG_SELECTOR_OPTS = [1, 2, 3, 5, 7, 14];

export const MATRIX_LAG_OPTS = [0, 1, 3, 7];

export const MATRIX_DATA_START = '2024-01-01';
