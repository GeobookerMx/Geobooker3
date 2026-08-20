import {
  Gift,
  MapPin,
  Megaphone,
  Target,
  TrendingUp
} from 'lucide-react';

export const HOUSE_AD_CAMPAIGNS = [
  {
    id: 'fiestas-patrias-premium',
    title: 'Fiestas Patrias: sube tu negocio con Premium GRATIS',
    subtitle:
      'Geobooker está regalando Premium para que los negocios de México agreguen fotos, contacto, redes y más visibilidad durante esta temporada.',
    cta: 'Subir mi negocio',
    badge: 'Fiestas Patrias',
    slot: 'Hero home / ciudad',
    placement: 'Portada, home city y espacios de alto impacto',
    metricHook: 'Más confianza antes de que el cliente te contacte',
    gradient: 'from-emerald-700 via-white to-red-700',
    icon: Gift,
    targetHref: '/business/register',
    chips: ['Premium gratis', 'Fotos', 'Negocio local'],
    proofPoints: ['Sin tarjeta', 'Acceso completo', 'Campaña México'],
    score: 'MX'
  },
  {
    id: 'city-domination',
    title: 'Haz que tu negocio destaque en tu ciudad',
    subtitle:
      'Publica tu negocio, agrega información clara y aprovecha Premium gratis para verte más profesional en búsquedas locales.',
    cta: 'Registrar negocio',
    badge: 'Visibilidad local',
    slot: 'Carrusel / sponsor local',
    placement: 'Resultados destacados, cards premium y ciudad sponsor',
    metricHook: 'Mejor recordación por repetición visual',
    gradient: 'from-blue-800 via-sky-700 to-cyan-500',
    icon: MapPin,
    targetHref: '/business/register',
    chips: ['Ciudad', 'Mapa', 'Clientes cerca'],
    proofPoints: ['Presencia por plaza', 'Perfil completo', 'CTA comercial'],
    score: '3X'
  },
  {
    id: 'announce-here',
    title: 'Tu negocio también puede aparecer aquí',
    subtitle:
      'Convierte espacios vacíos en clientes reales con perfiles completos, fotos, tarjetas destacadas y pines dentro del mapa.',
    cta: 'Activar visibilidad',
    badge: 'House ad',
    slot: 'Card promocional',
    placement: 'Cards internas, mosaicos y módulos de autopromoción',
    metricHook: 'Empuja decisión comercial desde navegación normal',
    gradient: 'from-slate-950 via-slate-700 to-slate-600',
    icon: Megaphone,
    targetHref: '/business/register',
    chips: ['Perfil', 'Fotos', 'Mapa'],
    proofPoints: ['Inventario propio', 'Lead interno', 'Venta recurrente'],
    score: 'GO'
  },
  {
    id: 'promo-launch',
    title: 'Premium gratis para fortalecer tu perfil',
    subtitle:
      'Activa herramientas completas durante el lanzamiento: más fotos, redes sociales, métricas y mejor presentación para tus clientes.',
    cta: 'Activar Premium',
    badge: 'Promo activa',
    slot: 'Sticky CTA',
    placement: 'Footer flotante, recordatorio de scroll y CTA persistente',
    metricHook: 'Convierte tráfico tibio en registro',
    gradient: 'from-orange-700 via-amber-500 to-yellow-400',
    icon: TrendingUp,
    targetHref: '/dashboard/upgrade',
    chips: ['Full access', 'Sin costo', 'Perfil fuerte'],
    proofPoints: ['Fotos', 'Redes', 'Métricas'],
    score: 'FREE'
  },
  {
    id: 'seasonal-surge',
    title: 'Aprovecha la temporada mexicana para vender más',
    subtitle:
      'En fechas de alto movimiento, un perfil con fotos, ubicación y contacto claro ayuda a que el cliente decida más rápido.',
    cta: 'Mejorar mi perfil',
    badge: 'Temporada local',
    slot: 'Módulo de cierre',
    placement: 'Bloques de confianza, media kit y etapas finales de venta',
    metricHook: 'Cierra objeciones con claridad operativa',
    gradient: 'from-fuchsia-700 via-rose-600 to-red-500',
    icon: Target,
    targetHref: '/business/register',
    chips: ['Fiestas Patrias', 'Confianza', 'Clientes'],
    proofPoints: ['Datos claros', 'Sin humo', 'Más profesionalismo'],
    score: 'CTR'
  }
];

export function getHouseAdMessage(index = 0) {
  return HOUSE_AD_CAMPAIGNS[index % HOUSE_AD_CAMPAIGNS.length];
}
