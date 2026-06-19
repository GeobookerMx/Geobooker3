export default function throttle(fn, wait = 0) {
  let lastCallTime = 0;
  let timeoutId = null;
  let lastArgs = null;

  const invoke = (context, args) => {
    lastCallTime = Date.now();
    timeoutId = null;
    fn.apply(context, args);
  };

  const throttled = function (...args) {
    const now = Date.now();
    const remaining = wait - (now - lastCallTime);
    lastArgs = args;

    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      invoke(this, args);
    } else if (!timeoutId) {
      timeoutId = setTimeout(() => invoke(this, lastArgs), remaining);
    }
  };

  throttled.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return throttled;
}
