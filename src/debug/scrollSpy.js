// src/debug/scrollSpy.js

export function installScrollSpy() {
  if (typeof window === 'undefined') return;

  if (window.__GEOBOOKER_SCROLL_SPY_INSTALLED__) return;
  window.__GEOBOOKER_SCROLL_SPY_INSTALLED__ = true;

  console.log('[ScrollSpy] instalado');

  const originalScrollTo = window.scrollTo.bind(window);
  const originalScrollBy = window.scrollBy.bind(window);
  const originalElementScrollIntoView = Element.prototype.scrollIntoView;
  const originalFocus = HTMLElement.prototype.focus;

  window.scrollTo = function patchedScrollTo(...args) {
    console.warn('[ScrollSpy] window.scrollTo llamado:', args);
    console.trace('[ScrollSpy] stack scrollTo');
    return originalScrollTo(...args);
  };

  window.scrollBy = function patchedScrollBy(...args) {
    console.warn('[ScrollSpy] window.scrollBy llamado:', args);
    console.trace('[ScrollSpy] stack scrollBy');
    return originalScrollBy(...args);
  };

  Element.prototype.scrollIntoView = function patchedScrollIntoView(...args) {
    console.warn('[ScrollSpy] scrollIntoView llamado en:', this, args);
    console.trace('[ScrollSpy] stack scrollIntoView');
    return originalElementScrollIntoView.apply(this, args);
  };

  HTMLElement.prototype.focus = function patchedFocus(...args) {
    console.warn('[ScrollSpy] focus llamado en:', this, args);
    console.trace('[ScrollSpy] stack focus');
    return originalFocus.apply(this, args);
  };

  window.addEventListener(
    'scroll',
    () => {
      const y =
        window.scrollY ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        0;

      if (y > 20) {
        console.warn('[ScrollSpy] scroll detectado. y =', y);
      }
    },
    { passive: true }
  );
}
