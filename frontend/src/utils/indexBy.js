export default function indexBy(array, key) {
  if (!array) return {};
  return Object.fromEntries(array.map((item) => [typeof key === 'function' ? key(item) : item[key], item]));
}
