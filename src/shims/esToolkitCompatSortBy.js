function normalizeIteratee(iteratee) {
  if (typeof iteratee === "function") return iteratee;
  if (typeof iteratee === "string") {
    return (item) => item?.[iteratee];
  }
  return (item) => item;
}

export default function sortBy(collection, iteratees = []) {
  const array = Array.isArray(collection) ? [...collection] : [];
  const fns = (Array.isArray(iteratees) ? iteratees : [iteratees]).map(normalizeIteratee);

  return array.sort((a, b) => {
    for (const fn of fns) {
      const av = fn(a);
      const bv = fn(b);
      if (av == null && bv == null) continue;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av < bv) return -1;
      if (av > bv) return 1;
    }
    return 0;
  });
}
