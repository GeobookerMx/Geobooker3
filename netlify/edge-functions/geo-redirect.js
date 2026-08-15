// netlify/edge-functions/geo-redirect.js
// Geobooker — Edge Geolocation: sugiere ciudad ancla basada en el país del visitante
// Se ejecuta en los nodos CDN de Netlify antes de servir la respuesta (< 1ms overhead)

export default async function handler(request, context) {
  const url = new URL(request.url);

  // Solo actuar en la raíz "/" — no interferir con rutas específicas
  if (url.pathname !== '/') {
    return context.next();
  }

  // Verificar si ya tiene el parámetro de ciudad sugerida (evitar loop)
  if (url.searchParams.has('geo_city')) {
    return context.next();
  }

  // Leer código de país de los headers de Netlify Edge
  const countryCode = (
    context.geo?.country?.code ||
    request.headers.get('x-nf-country-code') ||
    request.headers.get('x-country-code') ||
    ''
  ).toUpperCase();

  // Mapa de país → ciudad ancla canónica en Geobooker
  const COUNTRY_TO_CITY = {
    // Tier 1
    US: 'new-york',
    CA: 'toronto',
    GB: 'london',
    DE: 'berlin',
    FR: 'paris',
    JP: 'tokyo',
    IT: 'milan',
    ES: 'madrid',
    NL: 'amsterdam',
    MX: null, // México va a geobooker.com.mx — no redirigir
    BR: 'sao-paulo',
    // Tier 2
    AU: 'sydney',
    CH: 'zurich',
    SG: 'singapore',
    KR: 'seoul',
    AE: 'dubai',
    // Tier 3
    IE: 'dublin',
    SE: 'stockholm',
    AT: 'vienna',
    BE: 'amsterdam',
    CO: 'bogota',
    CL: 'santiago',
    // LATAM
    AR: 'buenos-aires',
    PE: 'lima',
    PT: 'lisbon',
  };

  const anchorCity = COUNTRY_TO_CITY[countryCode];

  // Si es México → geobooker.com.mx (solo si viene de geobooker.com)
  if (countryCode === 'MX' && url.hostname.includes('geobooker.com') && !url.hostname.includes('geobooker.com.mx')) {
    return Response.redirect('https://geobooker.com.mx/', 302);
  }

  // Si hay ciudad ancla mapeada → añadir `?geo_city=<city>` como hint (no redirigir, solo sugerir)
  // La homepage lo lee y pre-selecciona la ciudad en el buscador
  if (anchorCity) {
    url.searchParams.set('geo_city', anchorCity);
    url.searchParams.set('geo_country', countryCode);

    const response = await context.next(new Request(url.toString(), request));
    const newResponse = new Response(response.body, response);

    // Pasar ciudad ancla como header para que el SW o app lean sin necesidad de query param
    newResponse.headers.set('X-Geo-City', anchorCity);
    newResponse.headers.set('X-Geo-Country', countryCode);
    newResponse.headers.set('Cache-Control', 'no-store'); // no cachear respuestas personalizadas por país

    return newResponse;
  }

  return context.next();
}

export const config = {
  path: '/',
};
