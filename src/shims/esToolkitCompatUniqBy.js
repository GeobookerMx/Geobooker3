function normalizeIteratee(iteratee) {
  if (typeof iteratee === "function") return iteratee;
  if (typeof iteratee === "string") {
    return (item) => item?.[iteratee];
  }
  return (item) => item;
}

export default function uniqBy(array, iteratee) {
  if (!Array.isArray(array)) return [];

  const fn = normalizeIteratee(iteratee);
  const seen = new Set();
  const result = [];

  for (const item of array) {
    const key = fn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}
