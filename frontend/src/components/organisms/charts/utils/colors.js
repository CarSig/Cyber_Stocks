export function sentimentScoreStyle(score) {
  if (score === null || score === undefined) return { color: "var(--text-muted)", icon: "?" };
  if (score >= 0.1)  return { color: "var(--color-green)", icon: "▲" };
  if (score <= -0.1) return { color: "var(--color-red)",   icon: "▼" };
  return { color: "var(--color-amber)", icon: "●" };
}

export function sentimentToColor(score) {
  const clamped = Math.max(-1, Math.min(1, score));
  const RED   = [239, 68,  68];
  const AMBER = [234, 179,  8];
  const GREEN = [ 34, 197, 94];
  const [from, to, t] = clamped < 0
    ? [RED,   AMBER, clamped + 1]
    : [AMBER, GREEN, clamped];
  const r = Math.round(from[0] + (to[0] - from[0]) * t);
  const g = Math.round(from[1] + (to[1] - from[1]) * t);
  const b = Math.round(from[2] + (to[2] - from[2]) * t);
  return `rgb(${r},${g},${b})`;
}
