export type FormStyle = { label: string; color: string };

export const FORM_PATTERNS: { pattern: RegExp; label: string; color: string }[] = [
  { pattern: /^10-K/i, label: '10-K', color: '#4f8ef7' },
  { pattern: /^10-Q/i, label: '10-Q', color: '#7c6af7' },
  { pattern: /^8-K\/A/i, label: '8-K/A', color: '#f7c44f' },
  { pattern: /^8-K/i, label: '8-K', color: '#f7a84f' },
  { pattern: /^DEFA14A/i, label: 'DEFA14A', color: '#4fc9f7' },
  { pattern: /^DEF\s?14A/i, label: 'DEF 14A', color: '#4fc9f7' },
  { pattern: /^SC\s?13G/i, label: 'SC 13G', color: '#a0f74f' },
  { pattern: /^SC\s?13D/i, label: 'SC 13D', color: '#f74f4f' },
  { pattern: /^3\/A$/i, label: '3/A', color: '#e879f9' },
  { pattern: /^3$/i, label: '3', color: '#e879f9' },
  { pattern: /^4\/A$/i, label: '4/A', color: '#c026d3' },
  { pattern: /^4$/i, label: '4', color: '#c026d3' },
  { pattern: /^5\/A$/i, label: '5/A', color: '#a21caf' },
  { pattern: /^5$/i, label: '5', color: '#a21caf' },
];

export function getFormStyle(form?: string): FormStyle | null {
  if (!form) return null;
  return FORM_PATTERNS.find((p) => p.pattern.test(form)) ?? null;
}
