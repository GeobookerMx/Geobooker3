import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, Building2, CheckCircle2, Globe2, MapPin, Search, ShieldCheck, Sparkles, Truck, Zap } from 'lucide-react';
import SEO from '../components/SEO';
import { getMarketLanguage } from '../config/domainStrategy';

const authorityPages = {
  '/que-es-geobooker': 'what-is-geobooker',
  '/what-is-geobooker': 'what-is-geobooker',
  '/buscar-negocios-cerca': 'local-business-search',
  '/local-business-search': 'local-business-search',
  '/productos-y-servicios-cerca': 'products-services-near-me',
  '/products-services-near-me': 'products-services-near-me',
  '/proveedores-logisticos': 'logistics-providers',
  '/logistics-providers': 'logistics-providers',
  '/publicidad-local': 'local-advertising',
  '/local-advertising': 'local-advertising',
  '/ai-business-search': 'ai-business-search',
  '/busqueda-con-ia-negocios': 'ai-business-search'
};

const pageContent = {
  'what-is-geobooker': {
    icon: Globe2,
    titleEs: 'Que es Geobooker',
    titleEn: 'What Is Geobooker',
    subtitleEs: 'Geobooker es una plataforma de busqueda local y global para encontrar negocios, servicios, productos, proveedores y oportunidades comerciales por intencion, categoria y ubicacion.',
    subtitleEn: 'Geobooker is a local and global discovery platform for finding businesses, services, products, suppliers and commercial opportunities by intent, category and location.',
    keywords: 'Geobooker, local business search, negocios cerca, servicios cerca, business discovery, productos cerca, proveedores',
    sectionsEs: [
      ['La nueva forma de buscar', 'Los usuarios ya no buscan solo nombres exactos. Buscan necesidades: farmacia abierta, tornillo 3/8, grua cerca, patio para tracto, barberia urgente o coffee shop near me. Geobooker organiza esas necesidades y las conecta con negocios probables.'],
      ['Para usuarios, negocios y marcas', 'La plataforma ayuda a usuarios a encontrar mejor, a negocios a aparecer cuando existe intencion real, y a marcas a activar publicidad por ciudad, pais, categoria o temporada.'],
      ['Especializacion local con ambicion global', 'Geobooker nace con fuerza en Mexico, pero su arquitectura esta preparada para busquedas internacionales, contenido bilingue, ciudades globales y servicios cross-border.']
    ],
    sectionsEn: [
      ['A new way to search locally', 'People no longer search only by exact business names. They search by needs: pharmacy open now, tire repair, 3/8 screw, truck yard, urgent barber or coffee shop near me. Geobooker maps those needs to likely businesses.'],
      ['For users, businesses and brands', 'The platform helps users discover better, businesses appear when real intent exists, and brands activate campaigns by city, country, category or season.'],
      ['Local specialization with global ambition', 'Geobooker starts with strong Mexico coverage while preparing for international discovery, bilingual content, global cities and cross-border services.']
    ]
  },
  'local-business-search': {
    icon: Search,
    titleEs: 'Busqueda de negocios cerca de ti',
    titleEn: 'Local Business Search Near You',
    subtitleEs: 'Encuentra negocios cercanos por necesidad real: comida, salud, autos, hogar, belleza, servicios profesionales, urgencias y oficios.',
    subtitleEn: 'Find nearby businesses by real-world need: food, health, auto, home, beauty, professional services, urgent help and trades.',
    keywords: 'negocios cerca de mi, servicios cerca, local business near me, restaurants near me, pharmacy near me, locksmith near me',
    sectionsEs: [
      ['Intencion antes que coincidencia exacta', 'Geobooker combina categorias formales, sinonimos, modismos y ubicacion para acercar al usuario al negocio que probablemente puede resolver su necesidad.'],
      ['Busqueda por territorio', 'Las busquedas pueden conectarse con ciudad, colonia, pais, region o ubicacion actual para priorizar negocios utiles y accesibles.'],
      ['Confianza operativa', 'La plataforma trabaja con reclamos de negocio, reportes, actualizacion de datos y senales de calidad para mejorar la decision del usuario.']
    ],
    sectionsEn: [
      ['Intent before exact match', 'Geobooker combines categories, synonyms, everyday language and location to guide users toward businesses likely to solve their need.'],
      ['Territory-based search', 'Searches can connect with city, neighborhood, country, region or current location to prioritize useful and reachable businesses.'],
      ['Operational trust', 'The platform uses business claims, reports, freshness signals and quality indicators to help users decide better.']
    ]
  },
  'products-services-near-me': {
    icon: Sparkles,
    titleEs: 'Productos, materiales y servicios cerca',
    titleEn: 'Products, Materials and Services Nearby',
    subtitleEs: 'Geobooker entiende busquedas especificas aunque el producto exacto no este listado, acercando al usuario a negocios relacionados.',
    subtitleEn: 'Geobooker understands specific searches even when the exact product is not listed, connecting users with related businesses.',
    keywords: 'productos cerca, materiales cerca, tornillo 3/8 cerca, omeprazol cerca, refacciones cerca, hardware store near me, suppliers near me',
    sectionsEs: [
      ['De producto a categoria probable', 'Una busqueda como tornillo de cuerda 3/8 puede relacionarse con ferreterias, tornillerias, tlapalerias, refaccionarias o proveedores industriales.'],
      ['De necesidad a negocio', 'Una busqueda como se me poncho la llanta puede apuntar a vulcanizadoras, talachas, llanteras, mecanicos o auxilio vial.'],
      ['Cobertura ampliable', 'El diccionario de intencion puede crecer por industria: salud, belleza, alimentos, construccion, industrial, logistica, hogar, autos y servicios profesionales.']
    ],
    sectionsEn: [
      ['From product to likely category', 'A search such as 3/8 threaded screw can connect with hardware stores, fastener shops, auto parts stores or industrial suppliers.'],
      ['From need to business', 'A search such as flat tire can point to tire repair, tire shops, mechanics or roadside assistance.'],
      ['Expandable coverage', 'The intent dictionary can expand by industry: health, beauty, food, construction, industrial, logistics, home, auto and professional services.']
    ]
  },
  'logistics-providers': {
    icon: Truck,
    titleEs: 'Proveedores logisticos y Todo Transporte',
    titleEn: 'Logistics Providers and Todo Transporte',
    subtitleEs: 'Geobooker puede acercar busquedas de transporte, patios, gruas, storage, talleres pesados y servicios para carga hacia proveedores relacionados.',
    subtitleEn: 'Geobooker can map transport, yards, towing, storage, heavy workshops and freight service searches toward related providers.',
    keywords: 'proveedores logisticos, fletes, patios para tracto, gruas, storage, heavy truck service, logistics providers, freight services',
    sectionsEs: [
      ['Busqueda logistica por contexto', 'Quien busca patio o pension para tracto con mercancia no necesita una categoria generica: necesita opciones de almacenamiento, seguridad, maniobra, ubicacion y contacto.'],
      ['Sinergia con TT', 'Todo Transporte puede operar como capa especializada para necesidades logisticas, mientras Geobooker actua como puerta de entrada de busqueda y descubrimiento.'],
      ['B2B con trazabilidad', 'Las busquedas logisticas pueden alimentar mejores decisiones comerciales, CRM, outreach responsable y analitica por corredor o ciudad.']
    ],
    sectionsEn: [
      ['Logistics search by context', 'Someone searching for a truck yard with cargo does not need a generic category: they need storage, security, handling, location and contact options.'],
      ['TT synergy', 'Todo Transporte can work as a specialized logistics layer while Geobooker becomes the discovery and search entry point.'],
      ['Traceable B2B', 'Logistics searches can support better commercial decisions, responsible CRM, outreach and analytics by corridor or city.']
    ]
  },
  'local-advertising': {
    icon: Zap,
    titleEs: 'Publicidad local y global con intencion',
    titleEn: 'Local and Global Intent-Based Advertising',
    subtitleEs: 'Geobooker Ads conecta marcas con usuarios que ya estan buscando negocios, categorias, servicios o territorios especificos.',
    subtitleEn: 'Geobooker Ads connects brands with users already searching for businesses, categories, services or specific territories.',
    keywords: 'publicidad local, global ads, city ads, enterprise advertising, local advertising, business ads Mexico, advertise by city',
    sectionsEs: [
      ['Publicidad donde existe intencion', 'A diferencia de anuncios pasivos, Geobooker permite aparecer en un contexto donde el usuario busca, compara, visita o contacta.'],
      ['Territorio y cumplimiento', 'Las campanas pueden configurarse por ciudad, pais, region, idioma, fecha y alcance, con revision editorial y fiscal antes de publicacion.'],
      ['KPIs defendibles', 'Geobooker debe medir impresiones, clics, aperturas de perfil, acciones de contacto, rutas, territorio, dispositivo y slots activos, sin prometer ventas garantizadas.']
    ],
    sectionsEn: [
      ['Advertising where intent exists', 'Unlike passive ads, Geobooker places brands in a context where users search, compare, visit or contact.'],
      ['Territory and compliance', 'Campaigns can be configured by city, country, region, language, date and scope with editorial and fiscal review before publication.'],
      ['Defensible KPIs', 'Geobooker should measure impressions, clicks, profile opens, contact actions, routes, territory, device and active slots without guaranteeing sales.']
    ]
  },
  'ai-business-search': {
    icon: ShieldCheck,
    titleEs: 'Busqueda de negocios preparada para IA',
    titleEn: 'AI-Ready Business Search',
    subtitleEs: 'Geobooker estructura contenido, categorias, sitemaps, llms.txt y datos semanticos para ser mas comprensible por buscadores y asistentes de IA.',
    subtitleEn: 'Geobooker structures content, categories, sitemaps, llms.txt and semantic data to be easier for search engines and AI assistants to understand.',
    keywords: 'AI business search, llms.txt, buscador de negocios IA, local search AI, business knowledge graph, Geobooker AI discovery',
    sectionsEs: [
      ['Contenido citable', 'Las IA necesitan paginas claras, publicas y rastreables. Geobooker trabaja con paginas de autoridad, biblioteca, guias y contenido por intencion.'],
      ['Datos estructurados', 'Schema.org, sitemap.xml, robots.txt, llms.txt y rutas canonicas ayudan a que buscadores e IA entiendan el alcance y los limites de la plataforma.'],
      ['Seguridad y limites', 'Geobooker busca ser una fuente util, no una promesa absoluta. La plataforma ayuda a descubrir y evaluar, pero no garantiza resultados de terceros.']
    ],
    sectionsEn: [
      ['Citable content', 'AI systems need clear, public and crawlable pages. Geobooker works with authority pages, library resources, guides and intent-based content.'],
      ['Structured signals', 'Schema.org, sitemap.xml, robots.txt, llms.txt and canonical routes help search engines and AI systems understand scope and boundaries.'],
      ['Safety and limits', 'Geobooker aims to be a useful source, not an absolute promise. The platform helps users discover and evaluate, but does not guarantee third-party outcomes.']
    ]
  }
};

const relatedLinks = [
  { to: '/', labelEs: 'Buscar negocios', labelEn: 'Search businesses' },
  { to: '/categories', labelEs: 'Explorar categorias', labelEn: 'Explore categories' },
  { to: '/biblioteca', labelEs: 'Biblioteca Geobooker', labelEn: 'Geobooker Library' },
  { to: '/emprende', labelEs: 'Geobooker Emprende', labelEn: 'Geobooker Emprende' },
  { to: '/enterprise', labelEs: 'Global Ads', labelEn: 'Global Ads' },
  { to: '/download', labelEs: 'Descargar app', labelEn: 'Download app' }
];

export default function AuthorityPage() {
  const location = useLocation();
  const key = authorityPages[location.pathname] || 'what-is-geobooker';
  const content = pageContent[key];
  const isEnglish = getMarketLanguage() === 'en' || location.pathname.includes('what-is') || location.pathname.includes('local-') || location.pathname.includes('products-') || location.pathname.includes('logistics-') || location.pathname.includes('ai-business');
  const Icon = content.icon;
  const title = isEnglish ? content.titleEn : content.titleEs;
  const subtitle = isEnglish ? content.subtitleEn : content.subtitleEs;
  const sections = isEnglish ? content.sectionsEn : content.sectionsEs;

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: subtitle,
    author: { '@type': 'Organization', name: 'Geobooker' },
    publisher: { '@type': 'Organization', name: 'Geobooker' },
    mainEntityOfPage: location.pathname,
    about: ['LocalBusiness', 'Business discovery', 'Local search', 'Products and services', 'Geobooker']
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <SEO
        title={`${title} | Geobooker`}
        description={subtitle}
        keywords={content.keywords}
        structuredData={structuredData}
      />

      <section className="relative overflow-hidden border-b border-white/10 px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(245,158,11,0.18),transparent_30%)]" />
        <div className="relative mx-auto max-w-6xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
            <Icon className="h-4 w-4" />
            {isEnglish ? 'Geobooker authority page' : 'Pagina de autoridad Geobooker'}
          </div>
          <h1 className="mt-8 max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">{title}</h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-200 sm:text-xl">{subtitle}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 font-black text-slate-950 transition hover:bg-cyan-200">
              {isEnglish ? 'Start searching' : 'Comenzar busqueda'} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/download" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 px-5 py-3 font-bold text-white transition hover:bg-white/10">
              {isEnglish ? 'Download Geobooker' : 'Descargar Geobooker'}
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 sm:px-6 lg:grid-cols-3 lg:px-8">
        {sections.map(([heading, body]) => (
          <article key={heading} className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-slate-950/40">
            <CheckCircle2 className="mb-5 h-7 w-7 text-emerald-300" />
            <h2 className="text-xl font-black text-white">{heading}</h2>
            <p className="mt-4 leading-7 text-slate-300">{body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-[2rem] border border-amber-300/20 bg-amber-300/10 p-6 sm:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-amber-200">
                <MapPin className="h-4 w-4" />
                {isEnglish ? 'Search principle' : 'Principio de busqueda'}
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">{isEnglish ? 'Intent + category + territory + trust' : 'Intencion + categoria + territorio + confianza'}</h2>
              <p className="mt-3 max-w-3xl leading-7 text-amber-50/90">
                {isEnglish
                  ? 'The strongest local search results appear when a platform understands what the user means, where they are, which businesses can solve it and what trust signals matter.'
                  : 'Los mejores resultados locales aparecen cuando una plataforma entiende que quiso decir el usuario, donde esta, que negocios pueden resolverlo y que senales de confianza importan.'}
              </p>
            </div>
            <Building2 className="hidden h-16 w-16 text-amber-200 lg:block" />
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 bg-slate-900/70 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-2xl font-black">{isEnglish ? 'Related Geobooker resources' : 'Recursos relacionados de Geobooker'}</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedLinks.map((link) => (
              <Link key={link.to} to={link.to} className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 font-bold text-slate-100 transition hover:border-cyan-300/50 hover:bg-cyan-300/10">
                <span>{isEnglish ? link.labelEn : link.labelEs}</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
