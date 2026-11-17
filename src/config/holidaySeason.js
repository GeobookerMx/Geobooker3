// Inclusive local-calendar dates; the seasonal content expires without an app update.
export function getHolidaySeason(date = new Date(), language = 'es') {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return null;
  const day = date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
  if (day < 20261115 || day > 20270106) return null;
  const english = !String(language).toLowerCase().startsWith('es');
  const newYear = day >= 20261226;
  return {
    id: 'holidays-2026',
    title: english ? (newYear ? 'Start 2027 close to home' : 'Christmas 2026, close to you')
      : (newYear ? 'Empieza 2027 cerca de ti' : 'Navidad 2026, cerca de ti'),
    description: english ? 'Shop local and find places for gifts and gatherings.'
      : 'Compra local y encuentra lugares para tus regalos y reuniones.',
    dismiss: english ? 'Hide holiday suggestions' : 'Ocultar sugerencias de temporada',
    suggestions: english ? ['Gift shops', 'Restaurants', 'Bakeries', 'Florists', 'Toy stores', 'Event venues']
      : ['Tiendas de regalos', 'Restaurantes', 'Pastelerías', 'Florerías', 'Jugueterías', 'Salones de fiestas'],
  };
}
