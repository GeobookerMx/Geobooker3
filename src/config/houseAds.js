import {
  Megaphone,
  Trophy,
  MapPin,
  Target,
  TrendingUp
} from 'lucide-react';

export const HOUSE_AD_CAMPAIGNS = [
  {
    id: 'world-stage',
    title: 'Tu marca puede jugar en grande esta temporada',
    subtitle:
      'Hero banner, mapa destacado y CTA directo para negocios que quieren aprovechar el ruido futbolero 2026.',
    cta: 'Anunciate aqui',
    badge: 'Hero premium',
    slot: 'Hero home / ciudad',
    placement: 'Portada, home city y espacios de alto impacto',
    metricHook: 'Mas alcance al inicio del recorrido',
    gradient: 'from-emerald-700 via-green-600 to-lime-500',
    icon: Trophy,
    targetHref: '/advertise#catalogo-publicidad',
    chips: ['Hero local', 'Mas visibilidad', 'Temporada 2026'],
    proofPoints: ['CTA directo', 'Visibilidad alta', 'Ideal para sponsors'],
    score: '2026'
  },
  {
    id: 'city-domination',
    title: 'Domina tu ciudad antes que tu competencia',
    subtitle:
      'Sponsor de ciudad, carrusel destacado y pin premium para liderar una plaza clave.',
    cta: 'Ver paquetes',
    badge: 'Sponsor local',
    slot: 'Carrusel / sponsor local',
    placement: 'Resultados destacados, cards premium y ciudad sponsor',
    metricHook: 'Mejor recordacion por repeticion visual',
    gradient: 'from-blue-800 via-sky-700 to-cyan-500',
    icon: MapPin,
    targetHref: '/advertise#catalogo-publicidad',
    chips: ['Ciudad', 'Carrusel', 'Mapa'],
    proofPoints: ['Presencia por plaza', 'Refuerzo local', 'CTA comercial'],
    score: '3X'
  },
  {
    id: 'announce-here',
    title: 'Anunciate aqui en Geobooker',
    subtitle:
      'Convierte espacios vacios en clientes reales con banners, tarjetas patrocinadas y pines dentro del mapa.',
    cta: 'Ver espacios',
    badge: 'House ad',
    slot: 'Card promocional',
    placement: 'Cards internas, mosaicos y modulos de autopromocion',
    metricHook: 'Empuja decision comercial desde navegacion normal',
    gradient: 'from-slate-950 via-slate-700 to-slate-600',
    icon: Megaphone,
    targetHref: '/advertise#catalogo-publicidad',
    chips: ['Banners', 'Tarjetas', 'Pins'],
    proofPoints: ['Inventario propio', 'Lead interno', 'Venta recurrente'],
    score: 'GO'
  },
  {
    id: 'promo-launch',
    title: 'Lanzamiento comercial con precios accesibles',
    subtitle:
      'Impulso Local y Sponsor de Ciudad para negocios que quieren entrar fuerte sin irse directo a enterprise.',
    cta: 'Cotizar mi espacio',
    badge: 'Promo activa',
    slot: 'Sticky CTA',
    placement: 'Footer flotante, recordatorio de scroll y CTA persistente',
    metricHook: 'Convierte trafico tibio en contacto',
    gradient: 'from-orange-700 via-amber-500 to-yellow-400',
    icon: TrendingUp,
    targetHref: '/advertise#catalogo-publicidad',
    chips: ['Impulso Local', 'Sponsor', 'Promo'],
    proofPoints: ['Precios de entrada', 'Contacto rapido', 'Ideal para pruebas'],
    score: '50%'
  },
  {
    id: 'seasonal-surge',
    title: 'Haz que tu negocio meta gol esta temporada',
    subtitle:
      'Creativos tematicos, segmentacion por ciudad y reportes claros para marcas que quieren verse profesionales.',
    cta: 'Conocer reportes',
    badge: 'Reportes claros',
    slot: 'Modulo de cierre',
    placement: 'Bloques de confianza, media kit y etapas finales de venta',
    metricHook: 'Cierra objeciones con claridad operativa',
    gradient: 'from-fuchsia-700 via-rose-600 to-red-500',
    icon: Target,
    targetHref: '/advertise#reportes-publicidad',
    chips: ['Impresiones', 'Clics', 'CTR'],
    proofPoints: ['Datos reales', 'Sin humo', 'Mas profesionalismo'],
    score: 'CTR'
  }
];

export function getHouseAdMessage(index = 0) {
  return HOUSE_AD_CAMPAIGNS[index % HOUSE_AD_CAMPAIGNS.length];
}
