import type { SentimentLabel } from '@/types';

export function sentimentColor(v: number): string {
  return v > 0.1 ? 'var(--color-green, #22c55e)' : v < -0.1 ? 'var(--color-red, #ef4444)' : 'var(--muted-foreground)';
}

export function sentimentLabel(v: number): SentimentLabel {
  if (v > 0.3) return { label: 'Very Positive', color: '#22c55e' };
  if (v > 0.1) return { label: 'Positive', color: '#86efac' };
  if (v > -0.1) return { label: 'Neutral', color: '#999' };
  if (v > -0.3) return { label: 'Negative', color: '#fca5a5' };
  return { label: 'Very Negative', color: '#ef4444' };
}

export function correlationStrength(r: number): SentimentLabel {
  const absR = Math.abs(r);
  const direction = r > 0 ? 'Positive' : r < 0 ? 'Negative' : '';
  let strength = '';
  let color = '#999';

  if (absR < 0.1) {
    strength = 'None';
    color = '#999';
  } else if (absR < 0.3) {
    strength = 'Low';
    color = '#bfdbfe';
  } else if (absR < 0.5) {
    strength = 'Moderate';
    color = '#60a5fa';
  } else if (absR < 0.7) {
    strength = 'Strong';
    color = '#1e40af';
  } else {
    strength = 'Very Strong';
    color = '#0c1140';
  }

  const label = direction && strength !== 'None' ? `${strength} ${direction}` : strength;
  return { label, color };
}
