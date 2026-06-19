function normalizeIteratee(iteratee) {
  if (typeof iteratee === "function") return iteratee;
  if (typeof iteratee === "string") {
    return (item) => item?.[iteratee];
  }
  return (item) => item;
}

export default function sumBy(array, iteratee) {
  if (!Array.isArray(array)) return 0;
  const fn = normalizeIteratee(iteratee);
  return array.reduce((sum, item) => sum + (Number(fn(item)) || 0), 0);
}
