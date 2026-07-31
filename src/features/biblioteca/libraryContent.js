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
  { value: '360', labelEs: 'vision de negocio', labelEn: 'business view' },
  { value: '2026', labelEs: 'edicion inicial', labelEn: 'initial edition' }
];

export const libraryAudiences = [
  {
    icon: Sparkles,
    titleEs: 'Quiero abrir un negocio',
    titleEn: 'I want to open a business',
    textEs: 'Empieza desde idea, cliente, ubicacion, costos, operacion, paciencia y validacion.',
    textEn: 'Start from idea, customer, location, costs, operations, patience and validation.'
  },
  {
    icon: Building2,
    titleEs: 'Ya tengo un negocio',
    titleEn: 'I already run a business',
    textEs: 'Diagnostica ventas, operacion, reputacion, visibilidad, sostenibilidad y seguimiento.',
    textEn: 'Diagnose sales, operations, reputation, visibility, sustainability and follow-up.'
  },
  {
    icon: Users,
    titleEs: 'Construyo equipo o marca',
    titleEn: 'I build a team or brand',
    textEs: 'Ordena liderazgo, criterio, confianza, publicidad responsable y relacion con clientes.',
    textEn: 'Organize leadership, judgment, trust, responsible advertising and customer relationships.'
  }
];

export const libraryDocuments = [
  {
    no: '00',
    slug: 'punto-de-partida-geobooker',
    fileName: '00-presentacion-editorial-biblioteca-geobooker-2026.md',
    icon: BookOpen,
    title: 'Presentacion Editorial de la Biblioteca Geobooker 2026',
    editorialName: 'El Punto De Partida Geobooker',
    collection: 'Fundamentos Editoriales',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Explica el proposito, alcance, principios y estructura editorial de la Biblioteca.',
    tags: ['metodo', 'editorial', 'vision']
  },
  {
    no: '01',
    slug: 'liderar-sin-cargo',
    fileName: '01-liderazgo-en-pequena-escala.md',
    icon: HeartHandshake,
    title: 'Liderazgo en Pequena Escala',
    editorialName: 'Liderar Sin Cargo',
    collection: 'Operacion y Capital Humano',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Ayuda a influir, ordenar conversaciones y asumir responsabilidad en equipos pequenos.',
    tags: ['liderazgo', 'equipo', 'responsabilidad']
  },
  {
    no: '02',
    slug: 'radiografia-del-negocio',
    fileName: '02-como-diagnosticar-el-estado-actual-de-un-negocio.md',
    icon: BarChart3,
    title: 'Como Diagnosticar el Estado Actual de un Negocio',
    editorialName: 'Radiografia Del Negocio',
    collection: 'Diagnostico',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Permite revisar salud comercial, operativa y financiera antes de decidir que mejorar.',
    tags: ['diagnostico', 'prioridades', 'control']
  },
  {
    no: '03',
    slug: 'abrir-con-criterio',
    fileName: '03-antes-de-abrir-un-negocio-decisiones-que-debes-tomar.md',
    icon: Compass,
    title: 'Antes de Abrir un Negocio: Decisiones que Debes Tomar',
    editorialName: 'Abrir Con Criterio',
    collection: 'Guia Para Abrir',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Ordena validacion, cliente, inversion, ubicacion y pruebas antes de abrir.',
    tags: ['apertura', 'validacion', 'idea']
  },
  {
    no: '04',
    slug: 'encontrar-al-cliente-correcto',
    fileName: '04-cliente-ideal-ubicacion-y-demanda-local.md',
    icon: Target,
    title: 'Cliente Ideal, Ubicacion y Demanda Local',
    editorialName: 'Encontrar Al Cliente Correcto',
    collection: 'Marketing Local',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Conecta cliente ideal, territorio, demanda y busquedas reales de los usuarios.',
    tags: ['cliente', 'ubicacion', 'demanda']
  },
  {
    no: '05',
    slug: 'numeros-que-sostienen',
    fileName: '05-finanzas-basicas-para-negocios-locales.md',
    icon: LineChart,
    title: 'Finanzas Basicas para Negocios Locales',
    editorialName: 'Numeros Que Sostienen',
    collection: 'Finanzas y Control',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Explica costos, margen, flujo, promociones y decisiones financieras basicas.',
    tags: ['finanzas', 'margen', 'flujo']
  },
  {
    no: '06',
    slug: 'ordenar-la-operacion',
    fileName: '06-operacion-diaria-procesos-y-control.md',
    icon: Wrench,
    title: 'Operacion Diaria, Procesos y Control',
    editorialName: 'Ordenar La Operacion',
    collection: 'Operacion',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Convierte tareas repetidas en procesos, responsables, indicadores y checklists.',
    tags: ['operacion', 'procesos', 'indicadores']
  },
  {
    no: '07',
    slug: 'vender-atender-y-regresar',
    fileName: '07-ventas-atencion-y-seguimiento-al-cliente.md',
    icon: Users,
    title: 'Ventas, Atencion y Seguimiento al Cliente',
    editorialName: 'Vender, Atender Y Regresar',
    collection: 'Ventas y Servicio',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Ayuda a convertir contactos en relaciones con atencion, seguimiento y postventa.',
    tags: ['ventas', 'atencion', 'postventa']
  },
  {
    no: '08',
    slug: 'aparecer-donde-el-cliente-busca',
    fileName: '08-marketing-local-y-visibilidad-digital.md',
    icon: MapPinned,
    title: 'Marketing Local y Visibilidad Digital',
    editorialName: 'Aparecer Donde El Cliente Busca',
    collection: 'Marketing Local',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Define como aparecer por categoria, necesidad, ubicacion, confianza y accion.',
    tags: ['visibilidad', 'busqueda', 'ads']
  },
  {
    no: '09',
    slug: 'confianza-que-se-puede-ver',
    fileName: '09-reputacion-resenas-y-confianza.md',
    icon: ShieldCheck,
    title: 'Reputacion, Resenas y Confianza',
    editorialName: 'Confianza Que Se Puede Ver',
    collection: 'Reputacion',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Ordena evidencia, reseñas, respuesta publica y gestion de confianza local.',
    tags: ['reputacion', 'resenas', 'confianza']
  },
  {
    no: '10',
    slug: 'negocio-que-puede-durar',
    fileName: '10-sostenibilidad-del-negocio-local.md',
    icon: CheckCircle2,
    title: 'Sostenibilidad Del Negocio Local',
    editorialName: 'Negocio Que Puede Durar',
    collection: 'Estrategia, Riesgo y Futuro',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Integra sostenibilidad financiera, operativa, humana, digital, legal y social.',
    tags: ['sostenibilidad', 'riesgo', 'futuro']
  },
  {
    no: '11',
    slug: 'construir-sin-romperse',
    fileName: '11-psicologia-del-constructor-de-negocios.md',
    icon: Brain,
    title: 'Psicologia Del Constructor De Negocios',
    editorialName: 'Construir Sin Romperse',
    collection: 'Capital Humano Evolutivo',
    status: 'Borrador creado',
    priority: 'Alta',
    summary: 'Trabaja paciencia, criterio, energia, ego, incertidumbre y estrategia personal.',
    tags: ['psicologia', 'paciencia', 'estrategia']
  }
];

export const upcomingDocuments = [
  { no: '12', title: 'Aspectos Legales, Fiscales y Riesgos Basicos', name: 'Crecer Con Reglas Claras', icon: Scale },
  { no: '13', title: 'Capital Humano Evolutivo Geobooker', name: 'Talento Que Aprende', icon: Users },
  { no: '14', title: 'Tecnologia e IA Para Negocios Locales', name: 'Herramientas Para Decidir Mejor', icon: Sparkles },
  { no: '15', title: 'Guia De Mejora Continua Para Negocios', name: 'Mejorar Sin Perder El Rumbo', icon: Compass },
  { no: '16', title: 'Publicidad Local: Expectativas, Metricas y Buenas Practicas', name: 'Anunciar Sin Prometer De Mas', icon: Megaphone },
  { no: '17', title: 'CRM, Seguimiento y Relacion Con Clientes', name: 'Convertir Contactos En Relaciones', icon: HeartHandshake }
];

export const readingRoutes = [
  {
    titleEs: 'Para abrir desde cero',
    titleEn: 'To start from zero',
    itemsEs: ['Psicologia del constructor', 'Abrir con criterio', 'Cliente ideal', 'Finanzas', 'Operacion', 'Sostenibilidad'],
    itemsEn: ['Builder psychology', 'Start with judgment', 'Ideal customer', 'Finance', 'Operations', 'Sustainability']
  },
  {
    titleEs: 'Para mejorar un negocio existente',
    titleEn: 'To improve an existing business',
    itemsEs: ['Radiografia del negocio', 'Liderazgo', 'Operacion', 'Ventas', 'Reputacion', 'Marketing local'],
    itemsEn: ['Business diagnosis', 'Leadership', 'Operations', 'Sales', 'Reputation', 'Local marketing']
  },
  {
    titleEs: 'Para crecer con Geobooker',
    titleEn: 'To grow with Geobooker',
    itemsEs: ['Visibilidad', 'Confianza', 'Ads responsables', 'CRM', 'Mejora continua', 'Versiones por categoria'],
    itemsEn: ['Visibility', 'Trust', 'Responsible ads', 'CRM', 'Continuous improvement', 'Category editions']
  }
];

export const downloadLinks = {
  markdown: '/biblioteca/biblioteca-geobooker-2026-compilado-para-word-v3.md',
  text: '/biblioteca/biblioteca-geobooker-2026-compilado-para-word-v3.txt'
};


export const getLibraryDocumentBySlug = (slug) =>
  libraryDocuments.find((doc) => doc.slug === slug);

export const getLibraryDocumentDownloadPath = (doc) =>
  doc?.fileName ? `/biblioteca/documentos/${doc.fileName}` : '';
