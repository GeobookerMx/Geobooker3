import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

function hardResetScroll() {
  try {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    window.scrollTo(0, 0);

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    const root = document.getElementById('root');
    if (root) root.scrollTop = 0;

    const scrollContainers = document.querySelectorAll(
      '[data-scroll-container="true"], .scroll-container, .main-scroll, .page-scroll'
    );

    scrollContainers.forEach((el) => {
      el.scrollTop = 0;
      el.scrollLeft = 0;
    });
  } catch (error) {
    console.warn('[ScrollLockManager] No se pudo resetear scroll:', error);
  }
}

export default function ScrollLockManager() {
  const location = useLocation();

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useEffect(() => {
    hardResetScroll();

    const timers = [
      setTimeout(hardResetScroll, 50),
      setTimeout(hardResetScroll, 150),
      setTimeout(hardResetScroll, 350),
      setTimeout(hardResetScroll, 800),
      setTimeout(hardResetScroll, 1400),
    ];

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    const onLoad = () => hardResetScroll();
    const onHashChange = () => {
      setTimeout(hardResetScroll, 50);
      setTimeout(hardResetScroll, 250);
    };
    const onVisibilityChange = () => {
      if (!document.hidden) {
        setTimeout(hardResetScroll, 100);
        setTimeout(hardResetScroll, 500);
      }
    };

    window.addEventListener('load', onLoad);
    window.addEventListener('hashchange', onHashChange);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('hashchange', onHashChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  return null;
}
