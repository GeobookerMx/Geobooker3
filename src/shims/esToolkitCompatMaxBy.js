function normalizeIteratee(iteratee) {
  if (typeof iteratee === "function") return iteratee;
  if (typeof iteratee === "string") {
    return (item) => item?.[iteratee];
  }
  return (item) => item;
}

export default function maxBy(array, iteratee) {
  if (!Array.isArray(array) || array.length === 0) return undefined;
  const fn = normalizeIteratee(iteratee);
  return array.reduce((maxItem, current) =>
    fn(current) > fn(maxItem) ? current : maxItem
  );
}
