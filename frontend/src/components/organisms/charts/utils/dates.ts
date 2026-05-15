function localDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateString(d);
}

export function todayString(): string {
  return localDateString(new Date());
}
