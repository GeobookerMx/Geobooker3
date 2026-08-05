import {
  BarChart3,
  BookOpen,
  Brain,
  Building2,
  CheckCircle2,
  Compass,
  HeartHandshake,
  LineChart,
  MapPinned,
  Megaphone,
  Scale,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Wrench
} from 'lucide-react';

export const libraryStats = [
  { value: '12', labelEs: 'documentos base', labelEn: 'base documents' },
  { value: '26K+', labelEs: 'palabras editoriales', labelEn: 'editorial words' },
  { value: '360', labelEs: 'visión de negocio', labelEn: 'business view' },
  { value: '2026', labelEs: 'edición inicial', labelEn: 'initial edition' }
];

export const libraryAudiences = [
  {
    icon: Sparkles,
    titleEs: 'Quiero abrir un negocio',
    titleEn: 'I want to open a business',
    textEs: 'Empieza desde idea, cliente, ubicación, costos, operación, paciencia y validación.',
    textEn: 'Start from idea, customer, location, costs, operations, patience and validation.'
  },
  {
    icon: Building2,
    titleEs: 'Ya tengo un negocio',
    titleEn: 'I already run a business',
    textEs: 'Diagnostica ventas, operación, reputación, visibilidad, sostenibilidad y seguimiento.',
    textEn: 'Diagnose sales, operations, reputation, visibility, sustainability and follow-up.'
  },
  {
    icon: Users,
    titleEs: 'Construyo equipo o marca',
    titleEn: 'I build a team or brand',
    textEs: 'Ordena liderazgo, criterio, confianza, publicidad responsable y relación con clientes.',
    textEn: 'Organize leadership, judgment, trust, responsible advertising and customer relationships.'
  }
];

export const libraryDocuments = [
  {
    no: '00',
    slug: 'punto-de-partida-geobooker',
    fileName: '00-presentacion-editorial-biblioteca-geobooker-2026.md',
    icon: BookOpen,
    title: 'Presentación editorial de la Biblioteca Geobooker 2026',
    editorialName: 'El punto de partida Geobooker',
    collection: 'Fundamentos editoriales',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Explica el propósito, alcance, principios y estructura editorial de la Biblioteca.',
    tags: ['método', 'editorial', 'visión']
  },
  {
    no: '01',
    slug: 'liderar-sin-cargo',
    fileName: '01-liderazgo-en-pequena-escala.md',
    icon: HeartHandshake,
    title: 'Liderazgo en pequeña escala',
    editorialName: 'Liderar sin cargo',
    collection: 'Operación y capital humano',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Ayuda a influir, ordenar conversaciones y asumir responsabilidad en equipos pequeños.',
    tags: ['liderazgo', 'equipo', 'responsabilidad']
  },
  {
    no: '02',
    slug: 'radiografia-del-negocio',
    fileName: '02-como-diagnosticar-el-estado-actual-de-un-negocio.md',
    icon: BarChart3,
    title: 'Cómo diagnosticar el estado actual de un negocio',
    editorialName: 'Radiografía del negocio',
    collection: 'Diagnóstico',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Permite revisar salud comercial, operativa y financiera antes de decidir qué mejorar.',
    tags: ['diagnóstico', 'prioridades', 'control']
  },
  {
    no: '03',
    slug: 'abrir-con-criterio',
    fileName: '03-antes-de-abrir-un-negocio-decisiones-que-debes-tomar.md',
    icon: Compass,
    title: 'Antes de abrir un negocio: decisiones que debes tomar',
    editorialName: 'Abrir con criterio',
    collection: 'Guía para abrir',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Ordena validación, cliente, inversión, ubicación y pruebas antes de abrir.',
    tags: ['apertura', 'validación', 'idea']
  },
  {
    no: '04',
    slug: 'encontrar-al-cliente-correcto',
    fileName: '04-cliente-ideal-ubicacion-y-demanda-local.md',
    icon: Target,
    title: 'Cliente ideal, ubicación y demanda local',
    editorialName: 'Encontrar al cliente correcto',
    collection: 'Marketing Local',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Conecta cliente ideal, territorio, demanda y búsquedas reales de los usuarios.',
    tags: ['cliente', 'ubicación', 'demanda']
  },
  {
    no: '05',
    slug: 'numeros-que-sostienen',
    fileName: '05-finanzas-basicas-para-negocios-locales.md',
    icon: LineChart,
    title: 'Finanzas básicas para negocios locales',
    editorialName: 'Números que sostienen',
    collection: 'Finanzas y control',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Explica costos, margen, flujo, promociones y decisiones financieras básicas.',
    tags: ['finanzas', 'margen', 'flujo']
  },
  {
    no: '06',
    slug: 'ordenar-la-operacion',
    fileName: '06-operacion-diaria-procesos-y-control.md',
    icon: Wrench,
    title: 'Operación diaria, procesos y control',
    editorialName: 'Ordenar la operación',
    collection: 'Operación',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Convierte tareas repetidas en procesos, responsables, indicadores y checklists.',
    tags: ['operación', 'procesos', 'indicadores']
  },
  {
    no: '07',
    slug: 'vender-atender-y-regresar',
    fileName: '07-ventas-atencion-y-seguimiento-al-cliente.md',
    icon: Users,
    title: 'Ventas, atención y seguimiento al cliente',
    editorialName: 'Vender, atender y regresar',
    collection: 'Ventas y servicio',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Ayuda a convertir contactos en relaciones con atención, seguimiento y postventa.',
    tags: ['ventas', 'atención', 'postventa']
  },
  {
    no: '08',
    slug: 'aparecer-donde-el-cliente-busca',
    fileName: '08-marketing-local-y-visibilidad-digital.md',
    icon: MapPinned,
    title: 'Marketing local y visibilidad digital',
    editorialName: 'Aparecer donde el cliente busca',
    collection: 'Marketing Local',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Define cómo aparecer por categoría, necesidad, ubicación, confianza y acción.',
    tags: ['visibilidad', 'búsqueda', 'ads']
  },
  {
    no: '09',
    slug: 'confianza-que-se-puede-ver',
    fileName: '09-reputacion-resenas-y-confianza.md',
    icon: ShieldCheck,
    title: 'Reputación, reseñas y confianza',
    editorialName: 'Confianza que se puede ver',
    collection: 'Reputación',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Ordena evidencia, reseñas, respuesta pública y gestión de confianza local.',
    tags: ['reputación', 'reseñas', 'confianza']
  },
  {
    no: '10',
    slug: 'negocio-que-puede-durar',
    fileName: '10-sostenibilidad-del-negocio-local.md',
    icon: CheckCircle2,
    title: 'Sostenibilidad del negocio local',
    editorialName: 'Negocio que puede durar',
    collection: 'Estrategia, riesgo y futuro',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Integra sostenibilidad financiera, operativa, humana, digital, legal y social.',
    tags: ['sostenibilidad', 'riesgo', 'futuro']
  },
  {
    no: '11',
    slug: 'construir-sin-romperse',
    fileName: '11-psicologia-del-constructor-de-negocios.md',
    icon: Brain,
    title: 'Psicología del constructor de negocios',
    editorialName: 'Construir sin romperse',
    collection: 'Capital Humano Evolutivo',
    status: 'Edición profesional',
    priority: 'Alta',
    summary: 'Trabaja paciencia, criterio, energía, ego, incertidumbre y estrategia personal.',
    tags: ['psicología', 'paciencia', 'estrategia']
  }
];

export const upcomingDocuments = [
  { no: '12', title: 'Aspectos Legales, Fiscales y Riesgos Básicos', name: 'Crecer Con Reglas Claras', icon: Scale },
  { no: '13', title: 'Capital Humano Evolutivo Geobooker', name: 'Talento Que Aprende', icon: Users },
  { no: '14', title: 'Tecnología e IA Para Negocios Locales', name: 'Herramientas Para Decidir Mejor', icon: Sparkles },
  { no: '15', title: 'Guía De Mejora Continua Para Negocios', name: 'Mejorar Sin Perder El Rumbo', icon: Compass },
  { no: '16', title: 'Publicidad Local: Expectativas, Métricas y Buenas Prácticas', name: 'Anunciar Sin Prometer De Más', icon: Megaphone },
  { no: '17', title: 'CRM, Seguimiento y Relación Con Clientes', name: 'Convertir Contactos En Relaciones', icon: HeartHandshake }
];

export const readingRoutes = [
  {
    titleEs: 'Para abrir desde cero',
    titleEn: 'To start from zero',
    itemsEs: ['Psicología del constructor', 'Abrir con criterio', 'Cliente ideal', 'Finanzas', 'Operación', 'Sostenibilidad'],
    itemsEn: ['Builder psychology', 'Start with judgment', 'Ideal customer', 'Finance', 'Operations', 'Sustainability']
  },
  {
    titleEs: 'Para mejorar un negocio existente',
    titleEn: 'To improve an existing business',
    itemsEs: ['Radiografía del negocio', 'Liderazgo', 'Operación', 'Ventas', 'Reputación', 'Marketing local'],
    itemsEn: ['Business diagnosis', 'Leadership', 'Operations', 'Sales', 'Reputation', 'Local marketing']
  },
  {
    titleEs: 'Para crecer con Geobooker',
    titleEn: 'To grow with Geobooker',
    itemsEs: ['Visibilidad', 'Confianza', 'Ads responsables', 'CRM', 'Mejora continua', 'Versiones por categoría'],
    itemsEn: ['Visibility', 'Trust', 'Responsible ads', 'CRM', 'Continuous improvement', 'Category editions']
  }
];

export const downloadLinks = {
  pdf: '/biblioteca/biblioteca-geobooker-2026-edicion-profesional.pdf'
};


export const getLibraryDocumentBySlug = (slug) =>
  libraryDocuments.find((doc) => doc.slug === slug);

export const getLibraryDocumentDownloadPath = (doc) =>
  doc?.fileName ? `/biblioteca/documentos/${doc.fileName}` : '';

export const getLibraryDocumentPdfPath = (doc) =>
  doc?.no && doc?.slug ? `/biblioteca/pdfs/${doc.no}-${doc.slug}.pdf` : '';
