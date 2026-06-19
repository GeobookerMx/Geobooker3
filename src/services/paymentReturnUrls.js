import { APP_LINKS } from '../config/appLinks';

const isLocalOrNative = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.location.protocol === 'capacitor:' ||
    ['localhost', '127.0.0.1'].includes(window.location.hostname)
  );
};

export const getPublicAppBaseUrl = () => (
  isLocalOrNative() ? APP_LINKS.web : window.location.origin
);

export const buildPaymentReturnUrl = (path) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getPublicAppBaseUrl()}${normalizedPath}`;
};
