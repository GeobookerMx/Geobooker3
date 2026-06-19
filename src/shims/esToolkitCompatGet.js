function toPathSegments(path) {
  if (Array.isArray(path)) return path;
  if (typeof path === "number" || typeof path === "symbol") return [path];
  if (path == null) return [];

  return String(path)
    .replace(/\[(\w+)\]/g, ".$1")
    .replace(/^\./, "")
    .split(".")
    .filter(Boolean);
}

export default function get(object, path, defaultValue) {
  if (object == null) return defaultValue;

  const segments = toPathSegments(path);
  if (!segments.length) return defaultValue;

  let current = object;

  for (const segment of segments) {
    if (current == null) return defaultValue;
    current = current[segment];
  }

  return current === undefined ? defaultValue : current;
}
