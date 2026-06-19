import { APP_LINKS } from '../config/appLinks';

const normalizeText = (value) => String(value || '').trim();

const isLocalPreviewHost = (hostname = window.location.hostname) =>
  ['localhost', '127.0.0.1'].includes(hostname) || hostname.endsWith('.local');

export const buildCanonicalShareUrl = (path = '/') => {
  const safePath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    return `${APP_LINKS.web}${safePath}`;
  }

  if (isLocalPreviewHost(window.location.hostname) || window.location.protocol === 'capacitor:') {
    return `${APP_LINKS.web}${safePath}`;
  }

  return `${window.location.origin}${safePath}`;
};

export const buildBusinessShareMessage = ({
  name,
  category,
  address,
  city,
  sourceLabel = 'Geobooker'
}) => {
  const safeName = normalizeText(name) || 'este negocio';
  const safeCategory = normalizeText(category);
  const safeAddress = normalizeText(address);
  const safeCity = normalizeText(city);

  const locationLine = safeAddress || safeCity;
  const categoryLine = safeCategory ? `${safeCategory}` : 'negocio recomendado';

  return [
    `Descubre ${safeName} en ${sourceLabel}.`,
    `${categoryLine}${locationLine ? ` en ${locationLine}` : ''}.`,
    'Revisalo en el mapa, contactalo y compartelo facilmente.'
  ].join('\n');
};
