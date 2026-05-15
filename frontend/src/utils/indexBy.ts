export default function indexBy<T>(
  array: T[] | null | undefined,
  key: keyof T | ((item: T) => string),
): Record<string, T> {
  if (!array) return {};
  return Object.fromEntries(array.map((item) => [typeof key === 'function' ? key(item) : String(item[key]), item]));
}
