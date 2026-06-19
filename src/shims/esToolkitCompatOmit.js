export default function omit(object, keysToOmit = []) {
  if (object == null || typeof object !== "object") return {};
  const omitSet = new Set(keysToOmit);
  return Object.fromEntries(
    Object.entries(object).filter(([key]) => !omitSet.has(key))
  );
}
