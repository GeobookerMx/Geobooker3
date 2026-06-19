export default function range(start, end, step = 1) {
  if (end === undefined) {
    end = start;
    start = 0;
  }

  if (step === 0) return [];

  const result = [];
  const ascending = step > 0;

  if (ascending) {
    for (let i = start; i < end; i += step) result.push(i);
  } else {
    for (let i = start; i > end; i += step) result.push(i);
  }

  return result;
}
