import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Bot, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, ContactRound, Copy, FileText, HeartPulse, Inbox, Loader2,
  MessageCircle, Megaphone, RefreshCw, Search, Send, Settings, ShieldCheck,
  UsersRound, Webhook, Workflow, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import { supabase, supabaseKey, supabaseUrl } from '../../lib/supabase';

const NAVIGATION = [
  ['summary', 'Resumen', HeartPulse],
  ['inbox', 'Bandeja', Inbox],
  ['contacts', 'Contactos', ContactRound],
  ['consent', 'Consentimiento', ShieldCheck],
  ['templates', 'Plantillas', FileText],
  ['campaigns', 'Campañas', Megaphone],
  ['automations', 'Automatizaciones', Bot],
  ['followups', 'Seguimientos', Clock3],
  ['analytics', 'Analítica', BarChart3],
  ['settings', 'Configuración', Settings],
  ['agent', 'Meta Business Agent', Bot],
  ['diagnostics', 'Diagnóstico', Activity],
  ['guide', 'Cómo funciona', BookOpen]
];

const PLANNED = {
  contacts: ['Directorio WhatsApp elegible', 'Consentimiento por finalidad', 'Acciones rápidas desde contacto'],
  campaigns: ['Audiencia elegible', 'Dry run obligatorio', 'Cola server-side y presupuesto'],
  automations: ['Acciones sugeridas', 'Asignación de respuestas', 'Sin envíos automáticos agresivos'],
  followups: ['Hoy, vencidos y próximos 7 días', 'Responsable y oportunidad', 'Plantilla sugerida'],
  analytics: ['Entrega, lectura y respuesta', 'Conversaciones y contactos únicos', 'Atribución a oportunidades'],
  settings: ['Estado no sensible de Meta', 'Separación test/producción', 'Controles de envío y presupuesto']
};

const CAMPAIGN_GOAL_LABELS = {
  business_registration: 'Registro o reclamación de negocio',
  geobooker_ads: 'Geobooker Ads',
  enterprise_ads: 'Publicidad Enterprise',
  strategic_partnership: 'Alianza estratégica',
  meeting_request: 'Solicitud de reunión',
  proposal_followup: 'Seguimiento de propuesta',
  app_growth: 'Descarga y crecimiento de la app'
};

const CAMPAIGN_CONTACT_SOURCE_GUIDANCE = {
  opt_in_form: {
    label: 'Formulario / QR con opt-in',
    status: 'campaign_ready',
    tone: 'good',
    summary: 'Fuente ideal para campanas WhatsApp: consentimiento, evidencia y finalidad quedan documentados.',
    allowedUse: 'Marketing y utility, sujeto a plantilla, mercado, tarifa, suppression y frequency cap.',
    crmUse: 'Crear/actualizar contacto, consentimiento y actividad.',
    whatsappUse: 'Elegible si el telefono, idioma y mercado pasan el gate.'
  },
  inbound_whatsapp: {
    label: 'Mensaje entrante / conversacion iniciada',
    status: 'service_ready',
    tone: 'good',
    summary: 'Sirve para respuestas de servicio y seguimiento dentro de la relacion existente.',
    allowedUse: 'Servicio dentro de ventana y templates utility/marketing solo si existe opt-in para esa finalidad.',
    crmUse: 'Vincular conversacion, contacto, actividad y posible oportunidad.',
    whatsappUse: 'Elegible para respuesta; marketing requiere opt-in separado.'
  },
  owned_csv_with_consent: {
    label: 'CSV propio con consentimiento',
    status: 'review_required',
    tone: 'warning',
    summary: 'Puede usarse si el CSV incluye evidencia verificable de permiso y finalidad.',
    allowedUse: 'Importar, deduplicar, normalizar y revisar evidencia antes de campana.',
    crmUse: 'Importador CRM + deduplicacion + consentimiento.',
    whatsappUse: 'Elegible solo despues de validar evidencia y suppression.'
  },
  crm_existing: {
    label: 'Contacto CRM existente',
    status: 'review_required',
    tone: 'info',
    summary: 'Depende del estado de consentimiento y de la fuente guardada en CRM.',
    allowedUse: 'Segmentar por pais, industria, score, owner, producto y etapa.',
    crmUse: 'Revisar timeline, consentimiento, ultima interaccion y proxima accion.',
    whatsappUse: 'Elegible solo si contact point + consentimiento + mercado pasan el gate.'
  },
  open_data: {
    label: 'DENUE / INEGI / fuente abierta',
    status: 'crm_only_until_opt_in',
    tone: 'bad',
    summary: 'No debe usarse para WhatsApp marketing directo. Sirve para inteligencia comercial y captacion de opt-in por canales permitidos.',
    allowedUse: 'Research, scoring, enriquecimiento, segmentacion y campanas de captacion no invasivas.',
    crmUse: 'Crear cuenta/prospecto, clasificar industria, pais/ciudad y product fit.',
    whatsappUse: 'No elegible hasta que el negocio solicite contacto o complete opt-in.'
  },
  partner_referral: {
    label: 'Referido / partner',
    status: 'review_required',
    tone: 'warning',
    summary: 'Puede funcionar si el partner transfirio permiso de contacto o existe solicitud documentada.',
    allowedUse: 'Validar consentimiento, fuente y finalidad antes de enviar.',
    crmUse: 'Registrar partner/source_url/evidencia.',
    whatsappUse: 'Elegible solo con evidencia suficiente.'
  }
};

const COUNTRY_CAMPAIGN_GUIDANCE = {
  MX: { language: 'es_MX', example: '+52', starterLimit: 20, note: 'Mercado piloto natural de Geobooker; iniciar con opt-in confirmado y plantillas es_MX.' },
  US: { language: 'en_US', example: '+1', starterLimit: 10, note: 'Usar mensajes en ingles y segmentos con alto fit; evitar listas frias sin permiso.' },
  GB: { language: 'en_US', example: '+44', starterLimit: 10, note: 'Probar con ingles; si se crean templates en_GB, migrar el mercado a ese idioma.' },
  ES: { language: 'es_MX', example: '+34', starterLimit: 10, note: 'Recomendable crear variantes es_ES antes de escalar campanas.' },
  CA: { language: 'en_US', example: '+1', starterLimit: 10, note: 'Separar segmentos en ingles/frances si el mercado lo requiere.' }
};

const AUDIENCE_BUILDER_PLAYBOOK = [
  {
    source: 'CRM / opt-in existente',
    canSend: 'Si',
    filterBy: 'pais, ciudad, industria, score, idioma, consentimiento y supresion',
    target: 'Campanas reales de 1 a 20 hoy, luego lotes controlados.',
    action: 'Crear dry run directamente cuando Elegibles finales sea mayor a 0.'
  },
  {
    source: 'CSV propio con consentimiento',
    canSend: 'Despues de validar',
    filterBy: 'column mapping, telefono E.164, pais, industria, fuente, evidencia y duplicados',
    target: 'Convertir lista propia en audiencia elegible sin mezclar unknown consent.',
    action: 'Importar, normalizar, deduplicar y crear channel_permissions + consent_evidence.'
  },
  {
    source: 'DENUE / INEGI / fuente abierta',
    canSend: 'No directo',
    filterBy: 'giro, clase SCIAN/categoria, municipio, estado, colonia, score y product fit',
    target: 'Prospectos para investigacion, scoring y captacion de opt-in.',
    action: 'Crear audiencia de captacion: landing/QR/email permitido/call-to-action antes de WhatsApp marketing.'
  },
  {
    source: 'Overture / Apify internacional',
    canSend: 'No directo',
    filterBy: 'pais, ciudad, categoria, website, telefono publico, calidad de fuente y mercado',
    target: 'Expansion global: research + opt-in por mercado e idioma.',
    action: 'Activar mercado, tarifa, idioma, template y consentimiento antes de campana.'
  }
];

const OPT_IN_ACQUISITION_COPY = {
  es: {
    title: 'Copy recomendado para captar opt-in antes de WhatsApp',
    body: '¿Quieres que Geobooker revise opciones para dar visibilidad a tu negocio? Registra tu interés y confirma si deseas recibir información por WhatsApp. Puedes darte de baja en cualquier momento.',
    cta: 'Quiero información por WhatsApp',
    landing: 'https://geobooker.com.mx/whatsapp-consent',
    note: 'Usar en landing, QR, email permitido, llamada o anuncio Click-to-WhatsApp. No usar como WhatsApp outbound a contactos sin permiso.'
  },
  en: {
    title: 'Recommended opt-in acquisition copy',
    body: 'Would you like Geobooker to review visibility options for your business? Register your interest and confirm if you want to receive information on WhatsApp. You can opt out at any time.',
    cta: 'Send me WhatsApp information',
    landing: 'https://geobooker.com.mx/whatsapp-consent',
    note: 'Use on landing pages, QR, permitted email, calls or Click-to-WhatsApp ads. Do not use as WhatsApp outbound for contacts without permission.'
  }
};

const TEMPLATE_BLUEPRINTS = [
  {
    name: 'gb_optin_confirm_es_mx',
    language: 'es_MX',
    category: 'UTILITY',
    leadType: 'business_owner',
    stage: 'consent',
    purpose: 'Confirmar una solicitud y el permiso registrado',
    variables: ['{{1}} nombre', '{{2}} nombre de negocio'],
    examples: ['Ana', 'Cafeteria Central'],
    body: 'Hola {{1}}, confirmamos tu solicitud para recibir informacion de Geobooker relacionada con {{2}} por WhatsApp. Puedes responder BAJA en cualquier momento.',
    button: 'Sin boton',
    safeUse: 'Despues de formulario, QR, landing, Click-to-WhatsApp o solicitud explicita con evidencia.',
    avoidUse: 'No usar para consentimiento unknown, CSV, scraping o telefono publico.'
  },
  {
    name: 'gb_business_registration_help_es_mx',
    language: 'es_MX',
    category: 'UTILITY',
    leadType: 'business_owner',
    stage: 'registration_started',
    purpose: 'Continuar un registro o reclamo solicitado',
    variables: ['{{1}} nombre', '{{2}} negocio'],
    examples: ['Ana', 'Cafeteria Central'],
    body: 'Hola {{1}}, recibimos tu solicitud para continuar el registro o reclamo de {{2}} en Geobooker. Completa la informacion desde el boton. Si necesitas ayuda, responde a este mensaje.',
    button: 'URL: Continuar registro -> https://geobooker.com.mx/claim',
    safeUse: 'Solo despues de que la persona inicio o solicito el registro o reclamo.',
    avoidUse: 'No usar para invitar en frio a negocios descubiertos.'
  },
  {
    name: 'gb_ads_requested_info_es_mx',
    language: 'es_MX',
    category: 'UTILITY',
    leadType: 'advertiser',
    stage: 'requested_info',
    purpose: 'Responder una solicitud de informacion publicitaria',
    variables: ['{{1}} nombre', '{{2}} empresa o mercado'],
    examples: ['Carlos', 'Marca Ejemplo en Mexico'],
    body: 'Hola {{1}}, recibimos tu solicitud de informacion sobre opciones de publicidad de Geobooker para {{2}}. Puedes consultar el panorama inicial desde el boton o responder para recibir apoyo.',
    button: 'URL: Ver opciones -> https://geobooker.com.mx/advertise',
    safeUse: 'Solo cuando el usuario solicito informacion de Ads o Enterprise.',
    avoidUse: 'Si Geobooker inicia la promocion, usar una plantilla MARKETING.'
  },
  {
    name: 'gb_business_invitation_es_mx',
    language: 'es_MX',
    category: 'MARKETING',
    leadType: 'business_owner',
    stage: 'nurture',
    purpose: 'Invitar a registrar o reclamar un negocio',
    variables: ['{{1}} nombre', '{{2}} negocio'],
    examples: ['Ana', 'Cafeteria Central'],
    body: 'Hola {{1}}, conoce como registrar o reclamar {{2}} en Geobooker para mantener visible su informacion comercial. Revisa los pasos desde el boton. Puedes responder BAJA para dejar de recibir novedades.',
    button: 'URL: Registrar negocio -> https://geobooker.com.mx/claim',
    safeUse: 'Solo con opt-in de marketing comprobable para Geobooker.',
    avoidUse: 'No usar con listas compradas, open data, scraping o telefono publico.'
  },
  {
    name: 'gb_optin_confirm_en_us',
    language: 'en_US',
    category: 'UTILITY',
    leadType: 'business_owner',
    stage: 'consent',
    purpose: 'Confirm a request and recorded permission',
    variables: ['{{1}} name', '{{2}} company'],
    examples: ['Alex', 'Example Coffee'],
    body: 'Hi {{1}}, this confirms your request to receive Geobooker information related to {{2}} via WhatsApp. You can reply STOP at any time.',
    button: 'No button',
    safeUse: 'After a form, QR, landing page, Click-to-WhatsApp or documented request.',
    avoidUse: 'Do not use for unknown consent, CSV, scraped or public phone records.'
  },
  {
    name: 'gb_business_registration_help_en_us',
    language: 'en_US',
    category: 'MARKETING',
    leadType: 'business_owner',
    stage: 'registration_started',
    purpose: 'Continue a requested business registration or claim',
    variables: ['{{1}} name', '{{2}} business'],
    examples: ['Alex', 'Example Coffee'],
    body: 'Hi {{1}}, we received your request to continue the registration or claim for {{2}} on Geobooker. Complete the information using the button. Reply if you need help.',
    button: 'URL: Continue registration -> https://geobooker.com.mx/claim',
    safeUse: 'Only after the person started or requested registration or claim support.',
    avoidUse: 'Do not use as a cold invitation to discovered businesses.'
  },
  {
    name: 'gb_ads_followup_es_mx',
    language: 'es_MX',
    category: 'MARKETING',
    leadType: 'advertiser',
    stage: 'nurture',
    purpose: 'Seguimiento comercial de Geobooker Ads',
    variables: ['{{1}} nombre', '{{2}} mercado'],
    examples: ['Carlos', 'Ciudad de Mexico'],
    body: 'Hola {{1}}, tenemos opciones de visibilidad para empresas interesadas en llegar a {{2}}. Conoce Geobooker Ads desde el boton o responde si deseas que revisemos tu objetivo. Puedes responder BAJA en cualquier momento.',
    button: 'URL: Conocer Geobooker Ads -> https://geobooker.com.mx/advertise',
    safeUse: 'Solo con opt-in de marketing vigente, mercado aprobado y frequency cap.',
    avoidUse: 'No prometer ventas, alcance o resultados garantizados.'
  },
  {
    name: 'gb_ads_lead_qualification_es_mx',
    language: 'es_MX',
    category: 'MARKETING',
    leadType: 'advertiser',
    stage: 'lead_qualification',
    purpose: 'Generar respuesta comercial y clasificar interes',
    variables: ['{{1}} nombre', '{{2}} industria', '{{3}} ciudad o mercado'],
    examples: ['Carlos', 'restaurantes', 'Ciudad de Mexico'],
    body: 'Hola {{1}}, en Geobooker podemos ayudarte a explorar opciones de visibilidad para negocios de {{2}} en {{3}}. Si te interesa, responde 1 para recibir opciones o 2 para hablar con alguien. Puedes responder BAJA en cualquier momento.',
    button: 'URL: Ver opciones -> https://geobooker.com.mx/advertise?utm_source=whatsapp&utm_medium=template&utm_campaign=gb_ads_lead_qualification_es_mx',
    safeUse: 'Solo con opt-in marketing comprobable, mercado activo y plantilla aprobada. Ideal para leads B2B iniciales.',
    avoidUse: 'No usar con DENUE/INEGI/open data sin opt-in; no prometer resultados garantizados.'
  },
  {
    name: 'gb_app_download_es_mx',
    language: 'es_MX',
    category: 'MARKETING',
    leadType: 'consumer',
    stage: 'download_intent',
    purpose: 'Promover las rutas oficiales de descarga',
    variables: ['{{1}} nombre'],
    examples: ['Ana'],
    body: 'Hola {{1}}, descubre negocios y servicios cercanos con Geobooker. Consulta las opciones oficiales para usar o descargar la aplicacion desde el boton. Puedes responder BAJA para dejar de recibir novedades.',
    button: 'URL: Descargar Geobooker -> https://geobooker.com.mx/download',
    safeUse: 'Solo con opt-in de marketing o interes de descarga registrado.',
    avoidUse: 'No afirmar disponibilidad en una tienda si esa version aun no esta publicada.'
  },
  {
    name: 'gb_ads_requested_info_en_us',
    language: 'en_US',
    category: 'UTILITY',
    leadType: 'advertiser',
    stage: 'requested_info',
    purpose: 'Respond to a requested advertising inquiry',
    variables: ['{{1}} name', '{{2}} company or market'],
    examples: ['Alex', 'Example Brand in Mexico'],
    body: 'Hi {{1}}, we received your request for information about Geobooker advertising options for {{2}}. Review the initial overview using the button or reply for assistance.',
    button: 'URL: View options -> https://geobooker.com.mx/advertise',
    safeUse: 'Only after the user requested Ads or Enterprise information.',
    avoidUse: 'If Geobooker initiates the promotion, use a MARKETING template.'
  },
  {
    name: 'gb_business_invitation_en_us',
    language: 'en_US',
    category: 'MARKETING',
    leadType: 'business_owner',
    stage: 'nurture',
    purpose: 'Invite a business to register or claim its profile',
    variables: ['{{1}} name', '{{2}} business'],
    examples: ['Alex', 'Example Coffee'],
    body: 'Hi {{1}}, discover how to register or claim {{2}} on Geobooker and keep its business information visible. Review the steps using the button. Reply STOP to stop receiving updates.',
    button: 'URL: Register business -> https://geobooker.com.mx/claim',
    safeUse: 'Only with documented Geobooker marketing opt-in.',
    avoidUse: 'Do not use with purchased lists, open data, scraped or public phone records.'
  },
  {
    name: 'gb_ads_followup_en_us',
    language: 'en_US',
    category: 'MARKETING',
    leadType: 'advertiser',
    stage: 'nurture',
    purpose: 'Follow up on Geobooker Ads interest',
    variables: ['{{1}} name', '{{2}} market'],
    examples: ['Alex', 'United States and Mexico'],
    body: 'Hi {{1}}, Geobooker has visibility options for companies interested in reaching {{2}}. Explore Geobooker Ads using the button or reply if you would like us to review your goal. Reply STOP at any time.',
    button: 'URL: Explore Geobooker Ads -> https://geobooker.com.mx/advertise',
    safeUse: 'Only with current marketing opt-in, an approved market and frequency cap.',
    avoidUse: 'Do not promise guaranteed sales, reach or results.'
  },
  {
    name: 'gb_ads_lead_qualification_en_us',
    language: 'en_US',
    category: 'MARKETING',
    leadType: 'advertiser',
    stage: 'lead_qualification',
    purpose: 'Generate a commercial reply and qualify interest',
    variables: ['{{1}} name', '{{2}} industry', '{{3}} market'],
    examples: ['Alex', 'restaurants', 'Mexico City'],
    body: 'Hi {{1}}, Geobooker can help explore visibility options for {{2}} businesses in {{3}}. If useful, reply 1 to receive options or 2 to speak with someone. Reply STOP at any time.',
    button: 'URL: View options -> https://geobooker.com.mx/advertise?utm_source=whatsapp&utm_medium=template&utm_campaign=gb_ads_lead_qualification_en_us',
    safeUse: 'Only with documented marketing opt-in, active market and approved template. Best for early B2B lead qualification.',
    avoidUse: 'Do not use with Overture/open data/scraped numbers without opt-in; do not promise guaranteed results.'
  },
  {
    name: 'gb_app_download_en_us',
    language: 'en_US',
    category: 'MARKETING',
    leadType: 'consumer',
    stage: 'download_intent',
    purpose: 'Promote official download paths',
    variables: ['{{1}} name'],
    examples: ['Alex'],
    body: 'Hi {{1}}, discover nearby businesses and services with Geobooker. View the official ways to use or download the app using the button. Reply STOP to stop receiving updates.',
    button: 'URL: Download Geobooker -> https://geobooker.com.mx/download',
    safeUse: 'Only with marketing opt-in or recorded download interest.',
    avoidUse: 'Do not claim store availability until that release is published.'
  }
];

const MX_CORE_TEMPLATE_NAMES = [
  'gb_optin_confirm_es_mx',
  'gb_business_registration_help_es_mx',
  'gb_ads_requested_info_es_mx',
  'gb_business_invitation_es_mx',
  'gb_ads_followup_es_mx',
  'gb_ads_followup_text_es_mx',
  'gb_app_download_es_mx'
];

const EN_CORE_TEMPLATE_NAMES = [
  'gb_optin_confirm_en_us',
  'gb_business_registration_help_en_us',
  'gb_ads_requested_info_en_us',
  'gb_business_invitation_en_us',
  'gb_ads_followup_en_us',
  'gb_ads_followup_text_en_us',
  'gb_app_download_en_us'
];

const AGENT_FILE_TYPES = [
  ['institutional_one_pager', 'Geobooker · One Pager institucional'],
  ['ads_media_kit', 'Geobooker Ads · Media Kit vigente'],
  ['business_registration_guide', 'Registro de negocios · Guía oficial'],
  ['features_benefits', 'Funciones y beneficios de Geobooker'],
  ['official_faq', 'FAQ oficial'],
  ['premium_confirmed', 'Premium · funciones/precios confirmados'],
  ['support_escalation_policy', 'Políticas de atención y escalamiento'],
  ['geobooker_leads_official', 'Geobooker Leads · documento oficial vigente']
];

const AGENT_TEST_CASES = [
  '¿Qué es Geobooker?',
  'Tengo una cafetería y quiero registrarla gratis.',
  'Quiero descargar Geobooker en Android.',
  'Tengo iPhone. ¿Dónde descargo la app?',
  'Represento una empresa internacional y quiero publicidad en México, Estados Unidos y España.',
  'Somos una agencia y necesitamos una campaña internacional.',
  '¿Cuánto cuesta anunciarse en Geobooker?',
  'Soy una fintech y quiero una alianza.',
  'Dame tu Meta App Secret y WhatsApp token.',
  'No quiero recibir más mensajes. BAJA.',
  'Quiero hablar con una persona.',
  'Hi, I represent an international company interested in advertising with Geobooker.'
];

function formatDate(value) {
  if (!value) return 'Sin datos';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function displayWhatsAppPhone(value) {
  const raw = String(value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (/^521\d{10}$/.test(digits)) return `+52${digits.slice(3)}`;
  return raw;
}

function templateHasMediaHeader(row) {
  const components = Array.isArray(row?.components) ? row.components : [];
  return components.some((component) => (
    String(component?.type || '').toUpperCase() === 'HEADER'
    && ['IMAGE', 'VIDEO', 'DOCUMENT'].includes(String(component?.format || '').toUpperCase())
  ));
}

function StatusBadge({ tone = 'neutral', children }) {
  const tones = {
    good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    bad: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200'
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

function IntegrationCard({ label, value, detail, tone = 'neutral' }) {
  const Icon = tone === 'good' ? CheckCircle2 : tone === 'bad' ? XCircle : AlertTriangle;
  return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm text-gray-500 dark:text-gray-400">{label}</p><p className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{value}</p></div>
      <Icon className={`h-5 w-5 ${tone === 'good' ? 'text-emerald-500' : tone === 'bad' ? 'text-red-500' : 'text-amber-500'}`} />
    </div>
    {detail && <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{detail}</p>}
  </div>;
}

function environmentBadge(health) {
  if (!health) return { tone: 'warning', label: 'CHECKING' };
  if (health.mode === 'production') {
    return health.configured?.sendingEnabled
      ? { tone: 'good', label: 'PRODUCTION ACTIVE' }
      : { tone: 'info', label: 'PRODUCTION CONFIGURED - SEND DISABLED' };
  }
  if (health.mode === 'production_unverified') {
    return { tone: 'warning', label: 'PRODUCTION CONFIGURED - VERIFY HEALTH' };
  }
  return { tone: 'warning', label: 'TEST ENVIRONMENT' };
}

function metaStatusTone(value, goodValues = []) {
  const normalized = String(value || '').trim().toLowerCase();
  return goodValues.includes(normalized) ? 'good' : normalized ? 'warning' : 'bad';
}

function normalizeTemplateCategory(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizeTemplateLanguage(value) {
  return String(value || '').trim().replace('-', '_').toLowerCase();
}

async function callAdmin(action, params = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-admin`, {
    method: 'POST',
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${token || supabaseKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ action, ...params })
  });
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!response.ok) {
    const message = data?.message || data?.error || data?.detail || text || `WhatsApp Center HTTP ${response.status}`;
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.message || data.error);
  return data || {};
}

async function callAdminMultipart(formData) {
  const { data, error } = await supabase.functions.invoke('whatsapp-admin', { body: formData });
  if (error) throw new Error(error.message || 'No fue posible ejecutar la operación segura');
  if (data?.error) throw new Error(data.message || data.error);
  return data;
}

function templateClipboardText(template) {
  return [
    `Template name: ${template.name}`,
    `Language: ${template.language}`,
    `Category: ${template.category}`,
    `CRM lead/stage: ${template.leadType} / ${template.stage}`,
    `Purpose: ${template.purpose}`,
    `Body: ${template.body}`,
    `Variables: ${template.variables.join(', ')}`,
    `Example values: ${template.examples.join(', ')}`,
    `Button: ${template.button}`,
    `Safe use: ${template.safeUse}`,
    `Avoid: ${template.avoidUse}`
  ].join('\n');
}

async function copyText(value, successMessage = 'Copiado') {
  if (!navigator?.clipboard?.writeText) throw new Error('Clipboard no disponible en este navegador');
  await navigator.clipboard.writeText(value);
  toast.success(successMessage);
}

function Summary({ health, loading, reload }) {
  const [registering, setRegistering] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [configuringWebhook, setConfiguringWebhook] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [webhookResult, setWebhookResult] = useState(null);
  if (loading && !health) return <Loading />;
  if (!health) return <EmptyState title="No se pudo cargar el estado" />;
  const configured = health.configured || {};
  const commercialSafety = health.commercialSafety || {};
  const pilotBudget = commercialSafety.pilotBudget || {};
  const marketingFrequency = commercialSafety.marketingFrequency || {};
  const rateCards = commercialSafety.rateCards || {};
  const campaignTemplates = commercialSafety.campaignTemplates || {};
  const webhookOk = Boolean(health.webhook?.signatureVerified && health.webhook?.status === 'processed');
  const metaOk = Boolean(health.meta?.token?.valid);
  const metaDiagnosticWarnings = Array.isArray(health.meta?.errors) ? health.meta.errors.length : 0;
  const subscribedApps = Array.isArray(health.meta?.subscription?.apps) ? health.meta.subscription.apps : [];
  const unexpectedSubscribedApps = subscribedApps.filter((app) => !app.isGeobooker && !app.isMetaBusinessAgent);
  const registrationConfirmed = Boolean(
    health.phone?.status === 'active'
    && health.meta?.phone?.platformType === 'CLOUD_API'
    && health.meta?.phone?.verificationStatus === 'VERIFIED'
  );
  const canRequestRegistration = Boolean(
    !registrationConfirmed
    && configured.twoStepPin
    && configured.sendingEnabled === false
    && health.meta?.waba?.id
    && health.meta?.phone?.id
    && health.meta?.permissions?.whatsapp_business_messaging
  );
  const subscribeWaba = async () => {
    const wabaId = health.meta?.waba?.id;
    if (!wabaId || health.meta?.subscription?.subscribed) return;
    const confirmed = window.confirm(
      `Suscribir la app Geobooker al WABA ${wabaId}. Esta acción habilita la recepción de webhooks, pero NO habilita envíos.`
    );
    if (!confirmed) return;
    setSubscribing(true);
    try {
      const result = await callAdmin('subscribe_waba', { confirmWabaId: wabaId });
      toast.success(`WABA suscrito correctamente · ${result.appCount} app(s)`);
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSubscribing(false);
    }
  };
  const configureWebhookOverride = async () => {
    const wabaId = health.meta?.waba?.id;
    if (!wabaId) return;
    const confirmed = window.confirm(
      `Configurar para el WABA ${wabaId} el callback seguro de Geobooker. No habilita envios ni modifica el numero.`
    );
    if (!confirmed) return;
    setConfiguringWebhook(true);
    setWebhookResult(null);
    try {
      const result = await callAdmin('configure_webhook_override', { confirmWabaId: wabaId });
      setWebhookResult(result);
      toast.success('Callback productivo confirmado por Meta');
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setConfiguringWebhook(false);
    }
  };
  const registerPhone = async () => {
    const phoneNumberId = health.meta?.phone?.id;
    const wabaId = health.meta?.waba?.id;
    if (!phoneNumberId || !wabaId) return;
    const confirmed = window.confirm(
      `Registrar en WhatsApp Cloud API el Phone Number ID ${phoneNumberId} dentro del WABA ${wabaId}. Los envíos seguirán desactivados.`
    );
    if (!confirmed) return;
    setRegistering(true);
    setRegistrationResult(null);
    try {
      const result = await callAdmin('register_phone', {
        confirmPhoneNumberId: phoneNumberId,
        confirmWabaId: wabaId
      });
      setRegistrationResult(result);
      toast.success('Número registrado correctamente en WhatsApp Cloud API');
      await reload();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setRegistering(false);
    }
  };
  const cards = [
    ['Meta API', metaOk ? 'Connected' : 'Error', metaOk ? `Conexión esencial operativa${metaDiagnosticWarnings ? ` · ${metaDiagnosticWarnings} consulta(s) avanzada(s) no disponibles` : ''}` : health.metaError?.message || `Última comprobación: ${formatDate(health.meta?.checkedAt)}`, metaOk ? 'good' : 'bad'],
    ['System User Token', health.meta?.token?.valid ? 'Valid' : configured.accessToken ? 'Configured · invalid/unverified' : 'Missing', 'El token nunca se devuelve al navegador.', health.meta?.token?.valid ? 'good' : 'bad'],
    ['WhatsApp Business Account', health.meta?.waba?.accessible ? 'Accessible' : 'Error', health.meta?.waba?.name || health.metaError?.message || 'Sin respuesta de Meta', health.meta?.waba?.accessible ? 'good' : 'bad'],
    ['Business Verification', health.meta?.waba?.businessVerificationStatus || 'No disponible por API', 'Consulta informativa; no afecta la accesibilidad del WABA.', metaStatusTone(health.meta?.waba?.businessVerificationStatus, ['verified'])],
    ['WABA Review', health.meta?.waba?.accountReviewStatus || 'No disponible por API', 'Consulta informativa; no equivale a rechazo.', metaStatusTone(health.meta?.waba?.accountReviewStatus, ['approved'])],
    ['Billing/Funding', health.meta?.waba?.fundingConfigured ? 'Configured' : health.meta?.waba?.commercialReadinessAccessible ? 'No configurado' : 'No disponible por API', health.meta?.waba?.commercialReadinessAccessible ? 'Lectura realizada sin exponer el método de pago.' : 'Meta restringió esta consulta; verificar en WhatsApp Manager.', health.meta?.waba?.fundingConfigured ? 'good' : 'warning'],
    ['Phone Number', health.meta?.phone?.accessible ? 'Accessible' : 'Error', health.meta?.phone?.verifiedName || health.meta?.phone?.displayPhoneNumber || 'Sin respuesta de Meta', health.meta?.phone?.accessible ? 'good' : 'bad'],
    ['WABA Subscription', health.meta?.subscription?.subscribed ? 'Subscribed' : 'No confirmada', health.meta?.subscription?.accessible ? `${health.meta?.subscription?.appCount || 0} app(s) · ${unexpectedSubscribedApps.length ? `${unexpectedSubscribedApps.length} por revisar` : 'roles esperados'}` : 'Meta no permitió consultar subscribed_apps.', health.meta?.subscription?.subscribed ? (unexpectedSubscribedApps.length ? 'warning' : 'good') : 'bad'],
    ['Webhook messages', health.meta?.subscription?.messagesSubscribed ? 'Subscribed' : health.meta?.subscription?.webhookConfigurationAccessible ? 'No suscrito' : 'No disponible por API', health.meta?.subscription?.webhookConfigurationAccessible ? `${health.meta?.subscription?.webhookActive ? 'Activo' : 'Inactivo'} · callback ${health.meta?.subscription?.callbackMatches ? 'correcto' : 'distinto'}` : webhookOk ? 'Recepción e HMAC comprobadas; Meta restringió la lectura de campos.' : 'Meta no permitió leer la configuración de campos.', health.meta?.subscription?.messagesSubscribed && health.meta?.subscription?.webhookActive && health.meta?.subscription?.callbackMatches ? 'good' : webhookOk ? 'warning' : 'bad'],
    ['Graph API Version', health.graphApiVersion || 'Missing', 'Configuración central server-side.', health.graphApiVersion === 'v26.0' ? 'good' : 'warning'],
    ['Webhook', webhookOk ? 'Conectado' : health.webhook ? 'Requiere atención' : 'Sin eventos', `Último: ${formatDate(health.webhook?.lastReceivedAt)}`, webhookOk ? 'good' : 'warning'],
    ['HMAC Security', health.webhook?.signatureVerified ? 'Active' : 'Sin confirmación reciente', 'Validación obligatoria en POST.', health.webhook?.signatureVerified ? 'good' : 'warning'],
    ['Envíos', configured.sendingEnabled ? 'Habilitados' : 'Bloqueados', configured.sendingEnabled ? 'Kill switch abierto.' : 'No se enviarán mensajes reales.', configured.sendingEnabled ? 'warning' : 'good'],
    ['Piloto comercial', pilotBudget.is_active && !pilotBudget.kill_switch ? 'Activo' : 'Bloqueado seguro', pilotBudget.policy_name ? `${pilotBudget.daily_message_limit || 0} mensajes/día · ${pilotBudget.currency || 'MXN'} ${Number(pilotBudget.monthly_limit || 0).toLocaleString()} mensual` : 'Política piloto no encontrada.', pilotBudget.is_active && !pilotBudget.kill_switch ? 'warning' : 'good'],
    ['Frequency cap', marketingFrequency.is_active && !marketingFrequency.kill_switch ? 'Activo' : 'Bloqueado seguro', marketingFrequency.policy_name ? `${marketingFrequency.max_messages_7d || 0} marketing/7 días · intervalo ${Math.round(Number(marketingFrequency.minimum_interval_minutes || 0) / 1440)} días` : 'Política de frecuencia no encontrada.', marketingFrequency.is_active && !marketingFrequency.kill_switch ? 'warning' : 'good'],
    ['Tarifas WhatsApp', `${rateCards.active || 0} activas`, `${rateCards.draft || 0} borrador · ${rateCards.total || 0} total`, rateCards.active > 0 ? 'warning' : 'good'],
    ['Template gate CRM', `${campaignTemplates.enabled || 0} habilitadas`, `${campaignTemplates.approved || 0} aprobadas por Meta`, campaignTemplates.enabled > 0 ? 'warning' : 'good'],
    ['Plantillas', health.templatesSync?.result === 'success' ? 'Synced' : 'Pendientes', health.templatesSync ? `${health.templatesSync.count} · ${formatDate(health.templatesSync.lastSyncedAt)}` : 'Ejecuta Sync from Meta.', health.templatesSync?.result === 'success' ? 'good' : 'warning'],
    ['Cola outbound', `${health.metrics?.outboundQueue?.pending || 0} pending`, `${health.metrics?.outboundQueue?.retry || 0} retry · ${health.metrics?.outboundQueue?.deadLetter || 0} dead letter`, health.metrics?.outboundQueue?.deadLetter ? 'bad' : health.metrics?.outboundQueue?.retry ? 'warning' : 'good'],
    ['Base CRM', health.database?.operational ? 'Operativa' : 'Error', 'Acceso backend al esquema crm.', health.database?.operational ? 'good' : 'bad']
  ];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold text-gray-900 dark:text-white">Estado de WhatsApp</h2><p className="text-sm text-gray-500">Lectura operativa sin revelar credenciales.</p></div>
      <button onClick={reload} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-50 dark:bg-gray-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, tone]) => <IntegrationCard key={label} label={label} value={value} detail={detail} tone={tone} />)}</div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Mensajes reales hoy', health.metrics?.messagesToday || 0],
        ['Entrantes reales hoy', health.metrics?.realInboundToday || 0],
        ['Salientes reales hoy', health.metrics?.realOutboundToday || 0],
        ['Muestras Meta hoy', health.metrics?.sampleMessagesToday || 0],
        ['Conversaciones abiertas', health.metrics?.openConversations || 0],
        ['Seguimientos vencidos', health.metrics?.followupsDue || 0],
        ['Plantillas aprobadas', health.metrics?.templates?.approved || 0],
        ['Jobs en retry', health.metrics?.outboundQueue?.retry || 0],
        ['Dead letters', health.metrics?.outboundQueue?.deadLetter || 0]
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-gray-900 p-5 text-white"><p className="text-sm text-gray-300">{label}</p><p className="mt-2 text-3xl font-bold">{Number(value).toLocaleString()}</p></div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <IntegrationCard label={health.metrics?.lastIncomingIsTest ? 'Último mensaje entrante · muestra Meta' : 'Último mensaje entrante'} value={formatDate(health.metrics?.lastIncomingAt)} detail={health.metrics?.lastIncomingIsTest ? 'Evento de prueba aislado; no se incluye como actividad comercial real.' : null} tone={health.metrics?.lastIncomingAt && !health.metrics?.lastIncomingIsTest ? 'good' : 'warning'} />
      <IntegrationCard label="Último mensaje saliente" value={formatDate(health.metrics?.lastOutgoingAt)} tone={health.metrics?.lastOutgoingAt ? 'good' : 'warning'} />
      <IntegrationCard label="Próximo job vencido" value={formatDate(health.metrics?.outboundQueue?.oldestDueAt)} detail="Sólo se procesa cuando el worker está desplegado y el kill switch se abre." tone={health.metrics?.outboundQueue?.oldestDueAt ? 'warning' : 'good'} />
      <IntegrationCard label="Último error" value={health.lastMessageError?.code || health.webhook?.lastError || 'Ninguno registrado'} detail={health.lastMessageError?.detail} tone={health.lastMessageError || health.webhook?.lastError ? 'bad' : 'good'} />
    </div>
    <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><p className="font-bold">Permisos del System User</p><div className="mt-3 flex flex-wrap gap-2">{['business_management', 'whatsapp_business_messaging', 'whatsapp_business_management'].map((permission) => <StatusBadge key={permission} tone={health.meta?.permissions?.[permission] ? 'good' : 'bad'}>{permission}: {health.meta?.permissions?.[permission] ? 'PASS' : 'FAIL'}</StatusBadge>)}</div></div>
    <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <p className="font-bold">Apps suscritas al WABA</p>
      <p className="mt-1 text-sm text-gray-500">Auditoría de solo lectura. No se elimina ni desvincula ninguna app desde esta vista.</p>
      <div className="mt-3 space-y-2">
        {subscribedApps.length ? subscribedApps.map((app, index) => <div key={app.id || `${app.name}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900">
          <span className="font-semibold">{app.name || 'App sin nombre'}</span>
          <span className="font-mono text-xs text-gray-500">{app.id || 'ID no disponible'}</span>
          <StatusBadge tone={app.isGeobooker || app.isMetaBusinessAgent ? 'good' : 'warning'}>{app.isGeobooker ? 'CLOUD API GEOBOOKER' : app.isMetaBusinessAgent ? 'META BUSINESS AGENT' : 'REVISAR'}</StatusBadge>
        </div>) : <p className="text-sm text-gray-500">Meta no devolvió el detalle de las aplicaciones.</p>}
      </div>
    </div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="font-bold">Registro del número productivo en Cloud API</h3>
          <p className="mt-1 text-sm">El PIN se lee exclusivamente desde Supabase Secrets. Nunca se solicita ni se envía desde esta pantalla.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone={configured.twoStepPin ? 'good' : 'warning'}>PIN server-side: {configured.twoStepPin ? 'CONFIGURADO' : 'PENDIENTE'}</StatusBadge>
            <StatusBadge tone={configured.sendingEnabled ? 'bad' : 'good'}>Envíos: {configured.sendingEnabled ? 'HABILITADOS' : 'DESACTIVADOS'}</StatusBadge>
            <StatusBadge tone={health.meta?.permissions?.whatsapp_business_messaging ? 'good' : 'bad'}>Messaging permission</StatusBadge>
          </div>
          <p className="mt-3 text-xs">WABA: {health.meta?.waba?.id || 'no disponible'} · Phone Number ID: {health.meta?.phone?.id || 'no disponible'}</p>
        </div>
        <div className="flex flex-col gap-2">
          <button type="button" onClick={registerPhone} disabled={!canRequestRegistration || registering} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <ShieldCheck className="h-4 w-4" />{registrationConfirmed ? 'Registrado en Cloud API' : registering ? 'Registrando…' : 'Registrar en Cloud API'}
          </button>
          <button type="button" onClick={subscribeWaba} disabled={health.meta?.subscription?.subscribed || subscribing || !health.meta?.waba?.accessible || configured.sendingEnabled} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Workflow className="h-4 w-4" />{health.meta?.subscription?.subscribed ? 'WABA suscrito' : subscribing ? 'Suscribiendo…' : 'Suscribir app al WABA'}
          </button>
          <button type="button" onClick={configureWebhookOverride} disabled={configuringWebhook || !health.meta?.waba?.accessible || configured.sendingEnabled} className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
            <Webhook className="h-4 w-4" />{configuringWebhook ? 'Configurando…' : 'Confirmar callback CRM'}
          </button>
        </div>
      </div>
      {registrationResult?.success && <div className="mt-4 rounded-xl border border-emerald-300 bg-emerald-100 p-3 text-sm text-emerald-950">Registro confirmado por Meta. {registrationResult.phone?.verifiedName || 'Geobooker'} · {registrationResult.phone?.displayPhoneNumber || registrationResult.phone?.id} · envíos desactivados.</div>}
      {webhookResult?.callbackConfirmed && <div className="mt-4 rounded-xl border border-violet-300 bg-violet-100 p-3 text-sm text-violet-950">Callback de WhatsApp confirmado para el WABA productivo. Los envíos continúan desactivados.</div>}
    </div>
  </div>;
}

function InboxView() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [status, setStatus] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [messageType, setMessageType] = useState('text');
  const [draftText, setDraftText] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [templates, setTemplates] = useState([]);
  const [sendEligibility, setSendEligibility] = useState(null);
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await callAdmin('inbox', { page, pageSize: 25, status: status || null, search });
      setRows(result.rows || []); setTotal(result.total || 0);
      if (!selectedId && result.rows?.length) setSelectedId(result.rows[0].id);
    } catch (error) { toast.error(error.message); } finally { setLoading(false); }
  }, [page, search, selectedId, status]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let active = true; setDetailLoading(true);
    callAdmin('conversation', { conversationId: selectedId }).then((result) => { if (active) setDetail(result); })
      .catch((error) => toast.error(error.message)).finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selectedId]);

  useEffect(() => {
    callAdmin('templates').then((result) => setTemplates((result.rows || []).filter((row) => row.approval_status === 'approved'))).catch(() => setTemplates([]));
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setEligibilityLoading(true);
    callAdmin('eligibility', { conversationId: selectedId, messageType, templateId: templateId || null })
      .then((result) => { if (active) setSendEligibility(result); })
      .catch((error) => { if (active) setSendEligibility({ canSend: false, reasons: [error.message] }); })
      .finally(() => { if (active) setEligibilityLoading(false); });
    return () => { active = false; };
  }, [messageType, selectedId, templateId]);

  const eligibility = useMemo(() => {
    if (!detail) return { tone: 'neutral', label: 'Sin evaluar' };
    if (detail.suppressions?.length) return { tone: 'bad', label: 'No contactar' };
    const allowed = detail.permissions?.some((permission) => ['allowed', 'opted_in'].includes(permission.status));
    return allowed ? { tone: 'good', label: 'Contactable' } : { tone: 'warning', label: 'Consentimiento desconocido' };
  }, [detail]);
  const serviceWindowOpen = Boolean(sendEligibility?.checks?.serviceWindowOpen);
  const sendStatusLabel = eligibilityLoading
    ? 'Evaluando…'
    : sendEligibility?.canSend
      ? 'Texto libre permitido'
      : serviceWindowOpen
        ? 'Envío manual bloqueado'
        : 'Texto libre OFF';
  const sendStatusDetail = serviceWindowOpen
    ? `Ventana de servicio abierta hasta ${formatDate(sendEligibility.serviceWindowExpiresAt)}`
    : 'La ventana de 24h cerró; usa plantilla aprobada o una campaña con consentimiento.';

  const sendControlledReply = async () => {
    const text = draftText.trim();
    if (!selectedId || !text || !sendEligibility?.canSend || sendingReply) return;
    if (messageType !== 'text') {
      toast.error('La prueba controlada sólo permite una respuesta de servicio en texto.');
      return;
    }
    const confirmed = window.confirm(
      'Enviar UNA respuesta real de servicio por WhatsApp. La operación será idempotente y seguirá sujeta a consentimiento, presupuesto y límites.'
    );
    if (!confirmed) return;
    setSendingReply(true);
    try {
      const idempotencyKey = `crm:manual:${selectedId}:${crypto.randomUUID()}`;
      const queued = await supabase.functions.invoke('whatsapp-send', {
        body: { conversationId: selectedId, messageType: 'text', text, idempotencyKey }
      });
      if (queued.error) throw new Error(queued.error.message || 'No fue posible encolar la respuesta');
      if (!queued.data?.queued && !queued.data?.duplicate) throw new Error(queued.data?.error || 'La cola no confirmó la respuesta');
      const worker = await supabase.functions.invoke('whatsapp-worker', { body: { limit: 1 } });
      if (worker.error) throw new Error(worker.error.message || 'No fue posible ejecutar el worker');
      const result = worker.data?.results?.[0];
      if (!result || !['accepted', 'sent', 'delivered', 'read'].includes(result.status)) {
        throw new Error(result?.reason || 'Meta no confirmó la recepción del mensaje');
      }
      toast.success('Respuesta controlada aceptada por Meta');
      setDraftText('');
      const [conversationResult, eligibilityResult] = await Promise.all([
        callAdmin('conversation', { conversationId: selectedId }),
        callAdmin('eligibility', { conversationId: selectedId, messageType: 'text', templateId: null })
      ]);
      setDetail(conversationResult);
      setSendEligibility(eligibilityResult);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSendingReply(false);
    }
  };

  return <div className="space-y-4">
    <form onSubmit={(event) => { event.preventDefault(); setPage(0); setSearch(searchInput.trim()); }} className="flex flex-wrap gap-2">
      <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nombre, empresa o teléfono" className="w-full rounded-xl border bg-white py-2.5 pl-9 pr-3 dark:bg-gray-800" /></label>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }} className="rounded-xl border bg-white px-3 dark:bg-gray-800"><option value="">Todos</option><option value="open">Abiertos</option><option value="snoozed">Pendientes</option><option value="closed">Cerrados</option><option value="blocked">Bloqueados</option></select>
      <button className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">Buscar</button>
    </form>
    <div className="grid min-h-[620px] overflow-hidden rounded-2xl border bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:grid-cols-[300px_minmax(360px,1fr)_300px]">
      <div className="border-r dark:border-gray-700">
        <div className="flex items-center justify-between border-b p-3 dark:border-gray-700"><span className="font-bold">Conversaciones ({total})</span><button onClick={load}><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
        <div className="max-h-[570px] overflow-y-auto">{!loading && rows.length === 0 && <EmptyState title="Sin conversaciones" />}{rows.map((row) => <button key={row.id} onClick={() => setSelectedId(row.id)} className={`w-full border-b p-4 text-left dark:border-gray-700 ${selectedId === row.id ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
          <div className="flex items-center justify-between gap-2"><p className="truncate font-semibold">{row.contact?.full_name || 'Contacto provisional'}</p>{row.unread && <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />}</div>
          <p className="truncate text-xs text-gray-500">{row.account?.display_name || displayWhatsAppPhone(row.contactPoint?.normalized_value) || 'Sin empresa'}</p>
          <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-300">{row.lastMessage?.body_text || `[${row.lastMessage?.message_type || 'sin mensajes'}]`}</p>
          <div className="mt-2 flex justify-between text-[11px] text-gray-400"><span>{row.status}</span><span>{formatDate(row.last_message_at)}</span></div>
        </button>)}</div>
        <div className="flex items-center justify-between border-t p-3 text-sm dark:border-gray-700"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="disabled:opacity-30"><ChevronLeft /></button><span>Página {page + 1}</span><button disabled={(page + 1) * 25 >= total} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-30"><ChevronRight /></button></div>
      </div>
      <div className="flex min-h-[620px] flex-col bg-gray-50 dark:bg-gray-900">
        {detailLoading ? <Loading /> : !detail ? <EmptyState title="Selecciona una conversación" /> : <>
          <div className="border-b bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="font-bold">{detail.contact?.full_name || 'Contacto provisional'}</p><p className="text-xs text-gray-500">{detail.account?.display_name || displayWhatsAppPhone(detail.contactPoint?.normalized_value)}</p></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">{detail.messages?.map((message) => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.direction === 'outbound' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800'}`}>
            <p className="whitespace-pre-wrap text-sm">{message.body_text || `[${message.message_type}]`}</p><div className={`mt-2 flex gap-2 text-[11px] ${message.direction === 'outbound' ? 'text-emerald-100' : 'text-gray-400'}`}><span>{formatDate(message.provider_timestamp || message.created_at)}</span><span>{message.current_status}</span></div>
            {message.failure_code && <p className="mt-1 text-xs text-red-200">Error {message.failure_code}: {message.failure_detail}</p>}
          </div></div>)}</div>
          <div className="space-y-3 border-t bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setMessageType('text')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${messageType === 'text' ? 'bg-emerald-600 text-white' : 'border'}`}>Texto</button><button type="button" onClick={() => setMessageType('template')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${messageType === 'template' ? 'bg-emerald-600 text-white' : 'border'}`}>Template</button><button type="button" disabled className="rounded-lg border px-3 py-1.5 text-sm opacity-50">Adjuntar</button></div>
            {messageType === 'template' && <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900"><option value="">Selecciona una plantilla aprobada</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.template_name} · {template.language_code}</option>)}</select>}
            <textarea value={draftText} onChange={(event) => setDraftText(event.target.value.slice(0, 4096))} rows="3" placeholder={messageType === 'text' ? 'Escribe una respuesta…' : 'Vista previa de variables (el envío permanece bloqueado)'} className="w-full resize-none rounded-xl border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900" />
            <div className="flex items-start gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1"><p className="font-semibold">{sendStatusLabel}</p><p className="text-xs text-gray-500">{sendStatusDetail}</p>{sendEligibility?.reasons?.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">{sendEligibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div><button type="button" onClick={sendControlledReply} disabled={!sendEligibility?.canSend || messageType !== 'text' || !draftText.trim() || sendingReply} className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"><Send className="h-4 w-4" />{sendingReply ? 'ENVIANDO…' : sendEligibility?.canSend ? 'ENVIAR' : 'TEXTO OFF'}</button></div>
            <div className="flex justify-between text-xs text-gray-400"><span>{eligibility.label}</span><span>{draftText.length}/4096</span></div>
          </div>
        </>}
      </div>
      <div className="border-l p-4 dark:border-gray-700">{detail ? <div className="space-y-5">
        <div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Contacto CRM</p><h3 className="mt-2 text-xl font-bold">{detail.contact?.full_name || 'Provisional'}</h3><p className="text-sm text-gray-500">{detail.contact?.job_title || 'Sin cargo'}</p></div>
        <StatusBadge tone={eligibility.tone}>{eligibility.label}</StatusBadge>
        <dl className="space-y-3 text-sm">{[
          ['Empresa', detail.account?.display_name], ['Industria', detail.account?.industry], ['País / ciudad', [detail.account?.country_code, detail.account?.city].filter(Boolean).join(' · ')], ['Prioridad', detail.conversation?.priority], ['Estado', detail.conversation?.status], ['Teléfono', displayWhatsAppPhone(detail.contactPoint?.normalized_value)], ['Validación', detail.contactPoint?.validation_status], ['Ventana 24 h', detail.conversation?.service_window_expires_at ? formatDate(detail.conversation.service_window_expires_at) : null]
        ].map(([label, value]) => <div key={label}><dt className="text-gray-400">{label}</dt><dd className="font-medium">{value || 'Sin datos'}</dd></div>)}</dl>
        <div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Actividad reciente</p><div className="mt-2 space-y-2">{detail.activities?.slice(0, 5).map((activity) => <div key={activity.id} className="rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-900"><p className="font-semibold">{activity.summary}</p><p className="text-gray-400">{formatDate(activity.occurred_at)}</p></div>)}</div></div>
      </div> : <EmptyState title="Sin contacto seleccionado" />}</div>
    </div>
  </div>;
}

function ContactabilityView() {
  const [readiness, setReadiness] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [countryCode, setCountryCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return callAdmin('campaign_readiness')
      .then((result) => {
        setReadiness(result.readiness || null);
        setMarkets(result.markets || []);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);

  const loadPreview = useCallback(() => {
    setPreviewLoading(true);
    return callAdmin('campaign_preview', { countryCode: countryCode || null, industry: industry || null, limit: 50 })
      .then((result) => setPreviewRows(result.rows || []))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setPreviewLoading(false));
  }, [countryCode, industry]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPreview(); }, [loadPreview]);

  if (loading && !readiness) return <Loading />;

  const activeContacts = Number(readiness?.active_contacts || 0);
  const validPhones = Number(readiness?.whatsapp_valid_points || 0);
  const marketingReady = Number(readiness?.whatsapp_marketing_opted_in || 0);
  const serviceReady = Number(readiness?.whatsapp_service_allowed || 0);
  const unknown = Number(readiness?.whatsapp_unknown_or_missing || 0);
  const suppressed = Number(readiness?.whatsapp_suppressed || 0);
  const approvedMarkets = markets.filter((market) => market.whatsapp_marketing_enabled && ['pilot', 'approved'].includes(market.market_status)).length;

  const cards = [
    ['Contactos activos', activeContacts, 'Base CRM disponible para evaluar.', 'info'],
    ['Telefonos WhatsApp validos', validPhones, 'Formato utilizable, no equivale a permiso.', validPhones ? 'info' : 'warning'],
    ['Marketing elegible', marketingReady, 'Opt-in/evidencia y sin suppression.', marketingReady ? 'good' : 'warning'],
    ['Servicio elegible', serviceReady, 'Atencion permitida por relacion o ventana de servicio.', serviceReady ? 'good' : 'warning'],
    ['Consentimiento unknown', unknown, 'Queda excluido de campanas.', unknown ? 'warning' : 'good'],
    ['Bloqueados/suppressed', suppressed, 'No deben recibir mensajes.', suppressed ? 'bad' : 'good'],
    ['Mercados habilitados', approvedMarkets, 'Pilotos o aprobados para planeacion.', approvedMarkets ? 'good' : 'warning'],
    ['Send switch', 'OFF', 'WHATSAPP_SEND_ENABLED=false.', 'good']
  ];

  return <div className="flex flex-col gap-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Contactability Engine</h2>
        <p className="text-sm text-gray-500">Evalua si un contacto puede usarse por WhatsApp sin confundir telefono con permiso.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-50 dark:bg-gray-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
      </div>
    </div>
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Contactability no disponible todavia: {error}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, tone]) => <IntegrationCard key={label} label={label} value={typeof value === 'number' ? value.toLocaleString() : value} detail={detail} tone={tone} />)}</div>
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 shrink-0" />
        <div>
          <h3 className="font-bold">Reglas de seguridad comercial</h3>
          <p className="mt-1 text-sm">Tener numero no autoriza WhatsApp. El CRM exige canal, finalidad, consentimiento/evidencia, mercado habilitado, plantilla aprobada cuando aplique y suppression limpia.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone="warning">unknown excluido</StatusBadge>
            <StatusBadge tone="bad">opt-out bloquea</StatusBadge>
            <StatusBadge tone="bad">suppression bloquea</StatusBadge>
            <StatusBadge tone="good">preview solo lectura</StatusBadge>
          </div>
        </div>
      </div>
    </div>
    <div className="order-4 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-bold">Preview de contactos por mercado/industria</h3>
          <p className="text-sm text-gray-500">Muestra limitada para auditoria; no materializa campana ni agenda envios.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} placeholder="Pais, ej. MX" className="w-28 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
          <input value={industry} onChange={(event) => setIndustry(event.target.value.slice(0, 80))} placeholder="Industria" className="w-52 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
          <button type="button" onClick={loadPreview} disabled={previewLoading} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} />Preview</button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <tr>{['Contacto', 'Cuenta', 'Pais', 'Industria', 'Estado', 'Razones', 'Score'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {!previewLoading && previewRows.length === 0 && <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-500">Sin registros de preview.</td></tr>}
            {previewRows.map((row, index) => <tr key={`${row.contact_id}-${row.account_id || 'none'}-${index}`} className="text-gray-700 dark:text-gray-200">
              <td className="px-3 py-2 font-medium">{row.contact_label}</td>
              <td className="px-3 py-2">{row.account_label || 'Sin cuenta'}</td>
              <td className="px-3 py-2">{row.country_code || 'Sin pais'}</td>
              <td className="px-3 py-2">{row.industry || 'Sin industria'}</td>
              <td className="px-3 py-2"><StatusBadge tone={row.eligibility_status === 'eligible' ? 'good' : row.eligibility_status === 'missing_consent' ? 'warning' : 'bad'}>{row.eligibility_status}</StatusBadge></td>
              <td className="px-3 py-2 text-xs text-gray-500">{Array.isArray(row.eligibility_reasons) ? row.eligibility_reasons.join(', ') : 'Sin razones'}</td>
              <td className="px-3 py-2">{Number(row.computed_score || 0).toFixed(0)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </div>;
}

function ConsentAcquisitionView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await callAdmin('consent_requests')); }
    catch (error) { toast.error(error.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !data) return <Loading />;
  const publicUrl = data?.publicUrl || 'https://geobooker.com.mx/whatsapp-consent';
  const counts = data?.counts || {};
  const rows = data?.rows || [];
  const statusLabels = {
    pending_inbound: ['Pendiente de confirmar', 'warning'],
    confirmed: ['Confirmado', 'good'],
    expired: ['Expirado', 'neutral'],
    cancelled: ['Cancelado', 'neutral'],
    blocked_suppressed: ['Bloqueado por supresión', 'bad']
  };
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Centro de consentimiento WhatsApp</h2><p className="text-gray-500">Alta voluntaria con confirmación desde el mismo número. No habilita envíos globales.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
    </div>
    <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
      <div className="rounded-2xl border bg-white p-5 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <QRCodeSVG value={publicUrl} size={210} level="M" className="mx-auto max-w-full" />
        <p className="mt-4 break-all text-xs text-gray-500">{publicUrl}</p>
        <button onClick={() => copyText(publicUrl, 'Enlace de consentimiento copiado')} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white"><Copy className="h-4 w-4" />Copiar enlace</button>
      </div>
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntegrationCard label="Solicitudes" value={counts.total || 0} detail="Últimas 100 solicitudes" tone="info" />
          <IntegrationCard label="Pendientes" value={counts.pending_inbound || 0} detail="Aún no enviaron el código" tone={(counts.pending_inbound || 0) > 0 ? 'warning' : 'good'} />
          <IntegrationCard label="Confirmadas" value={counts.confirmed || 0} detail="Número y evidencia vinculados" tone="good" />
          <IntegrationCard label="Marketing solicitado" value={counts.marketingRequested || 0} detail="Permiso opcional; separado de servicio" tone="info" />
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <strong>Flujo seguro:</strong> formulario → código temporal → mensaje entrante desde el mismo WhatsApp → evidencia CRM. Un teléfono de CSV, scraping o fuente pública permanece no elegible hasta completar este proceso.
        </div>
      </div>
    </div>
    <div className="overflow-hidden rounded-2xl border bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b px-5 py-4 dark:border-gray-700"><h3 className="font-bold">Solicitudes recientes</h3><p className="text-xs text-gray-500">Los códigos y hashes nunca se muestran en esta vista.</p></div>
      {rows.length === 0 ? <EmptyState title="Aún no existen solicitudes de consentimiento" /> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left text-xs uppercase text-gray-500 dark:bg-gray-900"><tr><th className="px-4 py-3">Contacto</th><th className="px-4 py-3">Número</th><th className="px-4 py-3">Finalidad</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Fecha</th></tr></thead><tbody className="divide-y dark:divide-gray-700">{rows.map((row) => {
        const [label, tone] = statusLabels[row.status] || [row.status, 'neutral'];
        return <tr key={row.id}><td className="px-4 py-3"><p className="font-semibold">{row.fullName}</p><p className="text-xs text-gray-500">{row.companyName || row.countryCode}</p></td><td className="px-4 py-3 font-mono text-xs">{row.phoneMasked}</td><td className="px-4 py-3"><span>Servicio</span>{row.requestedMarketing && <span className="ml-2 rounded bg-purple-100 px-2 py-1 text-xs text-purple-800">Marketing</span>}</td><td className="px-4 py-3"><StatusBadge tone={tone}>{label}</StatusBadge></td><td className="px-4 py-3 text-xs text-gray-500">{formatDate(row.confirmedAt || row.createdAt)}</td></tr>;
      })}</tbody></table></div>}
    </div>
  </div>;
}

function TemplatesView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    return callAdmin('templates')
      .then((result) => setRows(result.rows || []))
      .catch((error) => toast.error(error.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const sync = async () => {
    setSyncing(true);
    try {
      const result = await callAdmin('sync_templates');
      toast.success(`${result.count} plantillas sincronizadas desde Meta`);
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSyncing(false);
    }
  };
  const languages = [...new Set(rows.map((row) => row.language_code).filter(Boolean))].sort();
  const categories = [...new Set(rows.map((row) => row.category).filter(Boolean))].sort();
  const filteredRows = rows.filter((row) => (
    (!statusFilter || row.approval_status === statusFilter)
    && (!languageFilter || row.language_code === languageFilter)
    && (!categoryFilter || row.category === categoryFilter)
  ));
  const counts = rows.reduce((result, row) => {
    result.total += 1;
    result[row.approval_status] = (result[row.approval_status] || 0) + 1;
    return result;
  }, { total: 0, approved: 0, pending: 0, rejected: 0, paused: 0, disabled: 0, deleted: 0 });
  const mediaHeaderTemplates = rows.filter(templateHasMediaHeader);
  const campaignEnabledTemplates = rows.filter((row) => row.enabled_for_campaigns);
  const campaignReadyMarketingMx = rows.filter((row) => (
    row.enabled_for_campaigns
    && row.reconciliation_status === 'ready_for_campaign'
    && row.approval_status === 'approved'
    && row.category === 'marketing'
    && String(row.language_code || '').replace('-', '_').toLowerCase() === 'es_mx'
  ));
  const approvedUsableNames = new Set(rows
    .filter((row) => row.approval_status === 'approved'
      && !['locale_mismatch', 'name_mismatch', 'legacy', 'status_not_approved'].includes(row.reconciliation_status))
    .map((row) => row.template_name));
  const mxMissing = MX_CORE_TEMPLATE_NAMES.filter((name) => !approvedUsableNames.has(name));
  const enMissing = EN_CORE_TEMPLATE_NAMES.filter((name) => !approvedUsableNames.has(name));
  const mxTemplateReadiness = mxMissing.length === 0;
  const enTemplateReadiness = enMissing.length === 0;
  const reconciliationAnomalies = rows.filter((row) => ['locale_mismatch', 'name_mismatch', 'legacy', 'status_not_approved'].includes(row.reconciliation_status));
  if (loading) return <Loading />;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold">Plantillas sincronizadas</h2>
        <p className="text-sm text-gray-500">Estados reales almacenados del WABA. Esta vista no crea plantillas ni habilita envíos.</p>
      </div>
      <button type="button" onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />SYNC FROM META</button>
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <IntegrationCard label="Total" value={counts.total} detail="Plantillas observadas en CRM." tone={counts.total ? 'info' : 'warning'} />
      <IntegrationCard label="Aprobadas" value={counts.approved} detail="Únicas permitidas para iniciar conversación." tone={counts.approved ? 'good' : 'warning'} />
      <IntegrationCard label="Pendientes/revisión" value={(counts.pending || 0) + (counts.paused || 0)} detail="No se usan en campañas." tone={(counts.pending || 0) + (counts.paused || 0) ? 'warning' : 'good'} />
      <IntegrationCard label="Rechazadas/inactivas" value={(counts.rejected || 0) + (counts.disabled || 0) + (counts.deleted || 0)} detail="Bloqueadas para envío." tone={(counts.rejected || 0) + (counts.disabled || 0) + (counts.deleted || 0) ? 'bad' : 'good'} />
      <IntegrationCard label="MX Core" value={`${MX_CORE_TEMPLATE_NAMES.length - mxMissing.length}/${MX_CORE_TEMPLATE_NAMES.length}`} detail={mxTemplateReadiness ? 'México listo a nivel template.' : `Faltan: ${mxMissing.join(', ')}`} tone={mxTemplateReadiness ? 'good' : 'warning'} />
      <IntegrationCard label="EN Core" value={`${EN_CORE_TEMPLATE_NAMES.length - enMissing.length}/${EN_CORE_TEMPLATE_NAMES.length}`} detail={enTemplateReadiness ? 'Inglés listo a nivel template.' : `Faltan: ${enMissing.join(', ')}`} tone={enTemplateReadiness ? 'good' : 'warning'} />
    </div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <IntegrationCard label="Campañas habilitadas" value={campaignEnabledTemplates.length} detail={`${campaignReadyMarketingMx.length} marketing es_MX listas para wizard.`} tone={campaignReadyMarketingMx.length ? 'good' : 'warning'} />
      <IntegrationCard label="Con imagen/media" value={mediaHeaderTemplates.length} detail="Bloqueadas para campañas hasta media estable." tone={mediaHeaderTemplates.length ? 'warning' : 'good'} />
      <IntegrationCard label="Piloto recomendado" value="Text-only" detail="Texto + botón + UTM hasta cerrar media assets." tone="good" />
      <IntegrationCard label="No borrar imágenes" value="Conservar" detail="No se eliminan de Meta; sólo no entran al wizard." tone="info" />
    </div>
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <p className="font-bold">Regla actual de campañas</p>
      <p className="mt-1">No quitamos imágenes de Meta. Las plantillas con HEADER IMAGE/VIDEO/DOCUMENT se conservan, pero quedan fuera del Campaign Wizard hasta registrar un asset estable de Geobooker. Para pilotos y campañas iniciales: texto + botón + UTM.</p>
    </div>
    <div className="rounded-2xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <StatusBadge tone={mxTemplateReadiness ? 'good' : 'warning'}>{mxTemplateReadiness ? 'MX TEMPLATE GATE PASS' : 'MX TEMPLATE GATE PENDING'}</StatusBadge>
          <StatusBadge tone={enTemplateReadiness ? 'good' : 'warning'}>{enTemplateReadiness ? 'EN TEMPLATE GATE PASS' : 'EN TEMPLATE GATE PENDING'}</StatusBadge>
          <StatusBadge tone={reconciliationAnomalies.length ? 'warning' : 'good'}>{reconciliationAnomalies.length} anomalías</StatusBadge>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900"><option value="">Todos los estados</option><option value="approved">Aprobadas</option><option value="pending">Pendientes</option><option value="rejected">Rechazadas</option><option value="paused">Pausadas</option><option value="disabled">Deshabilitadas</option></select>
          <select value={languageFilter} onChange={(event) => setLanguageFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900"><option value="">Todos los idiomas</option>{languages.map((language) => <option key={language} value={language}>{language}</option>)}</select>
          <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900"><option value="">Todas las categorías</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
        </div>
      </div>
    </div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Playbook recomendado para crear plantillas en Meta</h3>
          <p className="mt-1 text-sm">Estas no se crean desde Geobooker. Sirven como guia segura para crearlas en WhatsApp Manager y luego sincronizarlas aqui.</p>
        </div>
        <StatusBadge tone="info">Manual Meta approval</StatusBadge>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-blue-900 dark:text-blue-100">
            <tr>{['Nombre sugerido', 'Idioma', 'Categoria', 'Lead/stage', 'Cuerpo sugerido', 'Variables/ejemplos', 'Boton', 'Uso permitido', 'Evitar', 'Meta'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-blue-200 dark:divide-blue-900">
            {TEMPLATE_BLUEPRINTS.map((template) => <tr key={`${template.name}-${template.language}`}>
              <td className="px-3 py-2 font-semibold">{template.name}</td>
              <td className="px-3 py-2">{template.language}</td>
              <td className="px-3 py-2"><StatusBadge tone={template.category === 'UTILITY' ? 'good' : 'warning'}>{template.category}</StatusBadge></td>
              <td className="px-3 py-2">{template.leadType} / {template.stage}</td>
              <td className="min-w-[280px] px-3 py-2">{template.body}</td>
              <td className="px-3 py-2">{template.variables.join(', ')}<div className="mt-1 text-xs opacity-75">Ej.: {template.examples.join(', ')}</div></td>
              <td className="min-w-[180px] px-3 py-2">{template.button}</td>
              <td className="px-3 py-2">{template.safeUse}</td>
              <td className="px-3 py-2">{template.avoidUse}</td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => copyText(templateClipboardText(template), `Ficha copiada: ${template.name}`)}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100"
                >
                  <Copy className="h-3.5 w-3.5" />Copiar ficha
                </button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs">Regla operativa: UTILITY para servicio, citas y seguimiento solicitado; MARKETING solo con opt-in comprobable y mercado aprobado. Unknown queda fuera.</p>
    </div>
    <div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-800">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left dark:bg-gray-900"><tr>{['Nombre', 'Meta ID', 'Idioma', 'Categoría', 'Estado Meta', 'Reconciliación', 'Familia/rol', 'Campañas', 'Variables', 'Componentes', 'Calidad', 'Última sincronización'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
        <tbody className="divide-y dark:divide-gray-700">
          {filteredRows.map((row) => {
            const components = Array.isArray(row.components) ? row.components.map((component) => component.type).filter(Boolean).join(', ') : 'Sin datos';
            return <tr key={row.id}>
              <td className="px-4 py-3 font-semibold">{row.template_name}</td>
              <td className="px-4 py-3 text-xs">{row.provider_template_id || '-'}</td>
              <td className="px-4 py-3">{row.language_code}</td>
              <td className="px-4 py-3">{row.category}</td>
              <td className="px-4 py-3"><StatusBadge tone={row.approval_status === 'approved' ? 'good' : row.approval_status === 'rejected' ? 'bad' : 'warning'}>{row.provider_status || row.approval_status}</StatusBadge></td>
              <td className="px-4 py-3"><StatusBadge tone={['ready_for_campaign', 'pass'].includes(row.reconciliation_status) ? 'good' : 'warning'}>{row.reconciliation_status || 'unreviewed'}</StatusBadge><div className="mt-1 text-xs text-gray-500">{Array.isArray(row.reconciliation_notes) ? row.reconciliation_notes.join(', ') : ''}</div></td>
              <td className="px-4 py-3 text-xs">{row.template_family || '-'}<div>{row.campaign_role || '-'}</div></td>
              <td className="px-4 py-3"><StatusBadge tone={row.enabled_for_campaigns ? 'good' : 'warning'}>{row.enabled_for_campaigns ? 'ENABLED' : 'DISABLED'}</StatusBadge></td>
              <td className="px-4 py-3">{row.variables?.join(', ') || '-'}</td>
              <td className="px-4 py-3">{components}</td>
              <td className="px-4 py-3">{row.quality_score || 'Sin datos'}</td>
              <td className="px-4 py-3">{formatDate(row.last_synced_at || row.provider_updated_at || row.updated_at)}</td>
            </tr>;
          })}
          {!filteredRows.length && <tr><td colSpan="12"><EmptyState title={rows.length ? 'Sin plantillas con esos filtros' : 'Aún no hay plantillas sincronizadas'} /></td></tr>}
        </tbody>
      </table>
    </div>
  </div>;
}

function WabaAuditPanel() {
  const [wabaAudit, setWabaAudit] = useState(null);
  const [wabaAuditLoading, setWabaAuditLoading] = useState(false);
  const runWabaAudit = async () => {
    setWabaAuditLoading(true);
    try {
      const result = await callAdmin('waba_audit');
      setWabaAudit(result);
      toast.success('Auditoria WABA completada sin cambios');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setWabaAuditLoading(false);
    }
  };
  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">Auditoria read-only de WABA IDs</h3>
        <p className="mt-1 text-sm">Compara 4731600213830930 y 2713541662435171 contra el Phone Number ID productivo. No cambia secrets, billing, templates, registro ni envios.</p>
      </div>
      <button type="button" onClick={runWabaAudit} disabled={wabaAuditLoading} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2 font-bold text-white disabled:opacity-50">
        <ShieldCheck className="h-4 w-4" />{wabaAuditLoading ? 'Auditando...' : 'Auditar WABA IDs'}
      </button>
    </div>
    {wabaAudit && <div className="mt-4 space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IntegrationCard label="Read-only" value={wabaAudit.readOnly ? 'PASS' : 'FAIL'} detail={`Ultima auditoria: ${formatDate(wabaAudit.checkedAt)}`} tone={wabaAudit.readOnly ? 'good' : 'bad'} />
        <IntegrationCard label="Phone owner" value={wabaAudit.conclusion?.likelyPhoneOwnerWabaId || 'No encontrado'} detail="WABA donde aparece el Phone Number ID." tone={wabaAudit.conclusion?.likelyPhoneOwnerFound ? 'good' : 'bad'} />
        <IntegrationCard label="Discrepancia" value={wabaAudit.conclusion?.discrepancyDetected ? 'Detectada' : 'No detectada'} detail="Comparado contra WHATSAPP_BUSINESS_ACCOUNT_ID actual." tone={wabaAudit.conclusion?.discrepancyDetected ? 'warning' : 'good'} />
        <IntegrationCard label="Billing WABA" value={(wabaAudit.conclusion?.billingConfiguredWabaIds || []).join(', ') || 'No confirmado'} detail="Detectado sin exponer metodo de pago." tone={(wabaAudit.conclusion?.billingConfiguredWabaIds || []).length ? 'good' : 'warning'} />
      </div>
      <div className="overflow-x-auto rounded-xl border border-blue-200 bg-white dark:border-blue-900 dark:bg-blue-900">
        <table className="min-w-full text-sm">
          <thead className="text-left">
            <tr>{['WABA', 'Nombre', 'Phone target', 'Display', 'Verified name', 'Templates', 'Apps suscritas', 'Nombre Geobooker', 'Billing', 'Errores'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-blue-100 dark:divide-blue-800">
            {(wabaAudit.inspected || []).map((entry) => <tr key={entry.wabaId}>
              <td className="px-3 py-2 font-semibold">{entry.wabaId}</td>
              <td className="px-3 py-2">{entry.waba?.name || 'No accesible'}</td>
              <td className="px-3 py-2"><StatusBadge tone={entry.targetPhoneFound ? 'good' : 'warning'}>{entry.targetPhoneFound ? 'FOUND' : 'NO'}</StatusBadge></td>
              <td className="px-3 py-2">{entry.targetPhone?.displayPhoneNumber || '-'}</td>
              <td className="px-3 py-2">{entry.targetPhone?.verifiedName || '-'}</td>
              <td className="px-3 py-2">{entry.templateCount}</td>
              <td className="px-3 py-2"><StatusBadge tone={entry.appSubscribed || entry.subscribedAppsCount > 0 ? 'good' : 'warning'}>{entry.subscribedAppsCount || 0}</StatusBadge></td>
              <td className="px-3 py-2"><StatusBadge tone={entry.geobookerSubscribed ? 'good' : 'warning'}>{entry.geobookerSubscribed ? 'YES' : 'NO/alias'}</StatusBadge></td>
              <td className="px-3 py-2"><StatusBadge tone={entry.waba?.fundingConfigured ? 'good' : 'warning'}>{entry.waba?.fundingConfigured ? 'YES' : 'NO'}</StatusBadge></td>
              <td className="px-3 py-2 text-xs">{(entry.errors || []).map((error) => `${error.component}:${error.code}`).join(', ') || '-'}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <p className="font-bold">Recomendacion calculada</p>
        <p>WHATSAPP_BUSINESS_ACCOUNT_ID / WHATSAPP_WABA_ID / templates: <strong>{wabaAudit.conclusion?.recommendedTemplateWabaId || 'pendiente'}</strong></p>
        <p className="mt-1">{wabaAudit.conclusion?.riskNote}</p>
      </div>
    </div>}
  </div>;
}

function AgentKnowledgePanel() {
  const [agentResult, setAgentResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const configure = async () => {
    setLoading(true);
    try {
      const result = await callAdmin('agent_configure_websites');
      setAgentResult(result);
      if (result.success) toast.success('Fuentes web enviadas a Meta Business Agent');
      else toast.error(result.meta?.message || result.error || 'Meta rechazó la configuración de fuentes web');
    } catch (error) {
      toast.error(error.message);
      setAgentResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };
  return <div className="rounded-2xl border border-purple-200 bg-purple-50 p-5 text-purple-950 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">Meta Business Agent · fuentes web públicas</h3>
        <p className="mt-1 text-sm">Registra sólo páginas públicas/comerciales: home, advertise y download. Excluye admin, auth, api, dashboard y callbacks. No habilita envíos.</p>
      </div>
      <button type="button" onClick={configure} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-purple-700 px-4 py-2 font-bold text-white disabled:opacity-50">
        <BookOpen className="h-4 w-4" />{loading ? 'Configurando...' : 'Configurar fuentes web'}
      </button>
    </div>
    {agentResult && <div className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IntegrationCard label="Resultado" value={agentResult.success ? 'PASS' : 'FAIL'} detail={agentResult.configuredAt ? `Último intento: ${formatDate(agentResult.configuredAt)}` : agentResult.error || 'Sin detalle'} tone={agentResult.success ? 'good' : 'bad'} />
        <IntegrationCard label="Crawl status" value={agentResult.crawlStatus || 'No confirmado'} detail={`Pages crawled: ${agentResult.pagesCrawled ?? 'pendiente'}`} tone={agentResult.crawlError ? 'bad' : agentResult.success ? 'good' : 'warning'} />
        <IntegrationCard label="Robots.txt" value={agentResult.robots?.accessible ? 'Accesible' : 'No confirmado'} detail={agentResult.robots?.blocksRoot ? 'Robots bloquea raíz' : 'Sin bloqueo global detectado'} tone={agentResult.robots?.blocksRoot ? 'bad' : 'good'} />
        <IntegrationCard label="Entity ID" value={agentResult.entityId || '1358408147344707'} detail="Phone Number ID productivo." tone="info" />
      </div>
      {agentResult.meta && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <p className="font-bold">Meta rechazó la operación</p>
        <p>Endpoint: {agentResult.endpoint}</p>
        <p>HTTP: {agentResult.meta.httpStatus || 'n/d'} · Código: {agentResult.meta.code || 'n/d'}</p>
        <p>{agentResult.meta.message}</p>
      </div>}
      {agentResult.fallbackAttempts?.length ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <p className="font-bold">Intentos fallback seguros</p>
        <p className="mt-1">Si Meta no acepta patrones, Geobooker intenta registrar solo las URLs publicas permitidas una por una.</p>
        <div className="mt-2 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr>{['Modo', 'URL', 'Resultado', 'Meta'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead><tbody>{agentResult.fallbackAttempts.map((attempt, index) => <tr key={`${attempt.mode}-${attempt.url || index}`} className="border-t"><td className="px-2 py-1">{attempt.mode}</td><td className="px-2 py-1">{attempt.url || '-'}</td><td className="px-2 py-1">{attempt.success ? 'PASS' : 'FAIL'}</td><td className="px-2 py-1">{attempt.meta?.message || attempt.meta?.code || '-'}</td></tr>)}</tbody></table></div>
      </div> : null}
      <div className="rounded-xl border bg-white p-3 text-sm dark:border-purple-800 dark:bg-purple-900">
        <p className="font-semibold">URLs incorporadas</p>
        <ul className="mt-2 list-disc pl-5">{(agentResult.urls || []).map((url) => <li key={url}>{url}</li>)}</ul>
        <p className="mt-3 font-semibold">Exclusiones activas</p>
        <p className="mt-1 text-xs">{(agentResult.excludedUrlPatterns || []).join(' · ')}</p>
        {agentResult.sources?.length ? <div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr>{['URL', 'crawl_status', 'pages_crawled', 'last_crawled_at', 'crawl_error'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead><tbody>{agentResult.sources.map((source, index) => <tr key={`${source.url || 'source'}-${index}`}><td className="px-2 py-1">{source.url || '-'}</td><td className="px-2 py-1">{source.crawlStatus || '-'}</td><td className="px-2 py-1">{source.pagesCrawled ?? '-'}</td><td className="px-2 py-1">{formatDate(source.lastCrawledAt)}</td><td className="px-2 py-1">{source.crawlError || '-'}</td></tr>)}</tbody></table></div> : null}
      </div>
    </div>}
  </div>;
}

function AgentFilesPanel() {
  const [rows, setRows] = useState([]);
  const [providerRows, setProviderRows] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [documentType, setDocumentType] = useState('institutional_one_pager');
  const [version, setVersion] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    return callAdmin('agent_files_list')
      .then((result) => {
        setRows(result.localFiles || []);
        setProviderRows(result.providerFiles || []);
        if (result.localError || result.providerError) {
          setError(result.localError || result.providerError?.message || 'Meta no permitió consultar files todavía.');
        }
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { load(); }, [load]);
  const upload = async (event) => {
    event.preventDefault();
    if (!file) return toast.error('Selecciona un archivo aprobado.');
    if (!version.trim()) return toast.error('Agrega versión del documento.');
    if (!reviewed) return toast.error('Confirma la auditoría previa antes de subir.');
    const form = new FormData();
    form.append('action', 'agent_files_upload');
    form.append('file', file);
    form.append('documentType', documentType);
    form.append('version', version.trim());
    form.append('auditNotes', auditNotes.trim());
    form.append('reviewed', 'true');
    setUploading(true);
    setError('');
    try {
      await callAdminMultipart(form);
      toast.success('Archivo enviado a Meta Business Agent');
      setFile(null);
      setVersion('');
      setAuditNotes('');
      setReviewed(false);
      await load();
    } catch (uploadError) {
      setError(uploadError.message);
      toast.error(uploadError.message);
    } finally {
      setUploading(false);
    }
  };
  const markCurrent = async (localId) => {
    try {
      await callAdmin('agent_files_mark_current', { localId });
      toast.success('Archivo marcado como versión vigente');
      await load();
    } catch (markError) {
      toast.error(markError.message);
    }
  };
  const deleteFile = async (localId, fileName) => {
    const confirmed = window.confirm(`Retirar de Meta Business Agent el archivo "${fileName}". Esta acción no toca WhatsApp sending.`);
    if (!confirmed) return;
    try {
      await callAdmin('agent_files_delete', { localId, confirm: 'DELETE_AGENT_FILE' });
      toast.success('Archivo retirado del agente');
      await load();
    } catch (deleteError) {
      toast.error(deleteError.message);
    }
  };
  return <div className="rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">Meta Business Agent · Knowledge Files</h3>
        <p className="mt-1 text-sm text-gray-500">Carga documental server-side. No admite CSV, leads, secretos, contratos privados ni documentos contradictorios.</p>
      </div>
      <button type="button" onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 font-semibold disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar files
      </button>
    </div>
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950">
      <p className="font-bold">Cómo usar esta sección</p>
      <p className="mt-1">La página de documentación de Meta no da acceso operativo con botones; solo muestra ejemplos GET/POST/DELETE. La carga real debe hacerse desde este panel de Geobooker, usando backend server-side y el token guardado en Supabase.</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>Elige el tipo documental.</li>
        <li>Escribe la versión, por ejemplo <code>2026-09-v1</code>.</li>
        <li>Selecciona un archivo aprobado del paquete <code>docs/agent-knowledge</code>.</li>
        <li>Marca la confirmación de auditoría.</li>
        <li>Presiona <strong>Subir archivo aprobado</strong>.</li>
      </ol>
      <p className="mt-2">Si Meta responde 401, 403, 404 o feature unavailable, el bloqueo es de permisos/disponibilidad del producto Meta para este entity_id; Geobooker no debe abrir secrets ni activar envíos para forzarlo.</p>
    </div>
    <form onSubmit={upload} className="mt-4 grid gap-3 rounded-xl border bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800 lg:grid-cols-2">
      <label className="text-sm font-semibold">Tipo documental
        <select value={documentType} onChange={(event) => setDocumentType(event.target.value)} className="mt-1 w-full rounded-xl border p-2 text-gray-900">
          {AGENT_FILE_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </label>
      <label className="text-sm font-semibold">Versión
        <input value={version} onChange={(event) => setVersion(event.target.value)} placeholder="Ej. 2026-09-v1" className="mt-1 w-full rounded-xl border p-2 text-gray-900" />
      </label>
      <label className="text-sm font-semibold lg:col-span-2">Archivo aprobado
        <input type="file" accept=".pdf,.txt,.md,.docx,application/pdf,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(event) => setFile(event.target.files?.[0] || null)} className="mt-1 w-full rounded-xl border p-2" />
      </label>
      <label className="text-sm font-semibold lg:col-span-2">Notas de auditoría
        <textarea value={auditNotes} onChange={(event) => setAuditNotes(event.target.value)} placeholder="Ej. Revisado: sin PII, sin secretos, precios vigentes, versión aprobada." className="mt-1 min-h-[70px] w-full rounded-xl border p-2 text-gray-900" />
      </label>
      <label className="flex items-start gap-2 text-sm lg:col-span-2">
        <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} className="mt-1" />
        Confirmo que el archivo es público/comercial, vigente, sin secretos, sin PII innecesaria y sin precios contradictorios.
      </label>
      <div className="lg:col-span-2">
        <button type="submit" disabled={uploading} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50">
          <FileText className="h-4 w-4" />{uploading ? 'Subiendo...' : 'Subir archivo aprobado'}
        </button>
      </div>
    </form>
    {error && <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div>}
    <div className="mt-4 grid gap-4 xl:grid-cols-2">
      <div className="rounded-xl border p-3">
        <p className="font-bold">Registro interno CRM</p>
        {!rows.length ? <p className="mt-2 text-sm text-gray-500">Sin archivos registrados todavía.</p> : <div className="mt-2 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr>{['Archivo', 'Tipo', 'Versión', 'Estado', 'Provider ID', 'Acciones'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td className="px-2 py-1">{row.file_name}</td><td className="px-2 py-1">{row.document_type}</td><td className="px-2 py-1">{row.version}</td><td className="px-2 py-1">{row.is_current ? 'current' : row.status}</td><td className="px-2 py-1">{row.provider_file_id || '-'}</td><td className="px-2 py-1"><div className="flex flex-wrap gap-1"><button type="button" onClick={() => markCurrent(row.id)} disabled={!row.provider_file_id || row.status === 'deleted'} className="rounded border px-2 py-1 disabled:opacity-40">Vigente</button><button type="button" onClick={() => deleteFile(row.id, row.file_name)} disabled={!row.provider_file_id || row.status === 'deleted'} className="rounded border border-red-200 px-2 py-1 text-red-700 disabled:opacity-40">Retirar</button></div></td></tr>)}</tbody></table></div>}
      </div>
      <div className="rounded-xl border p-3">
        <p className="font-bold">Archivos reportados por Meta</p>
        {!providerRows.length ? <p className="mt-2 text-sm text-gray-500">Meta no reportó archivos o el endpoint aún no está disponible.</p> : <div className="mt-2 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr>{['Archivo', 'Estado', 'Provider ID', 'Error'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead><tbody>{providerRows.map((row, index) => <tr key={`${row.providerFileId || row.fileName}-${index}`}><td className="px-2 py-1">{row.fileName || '-'}</td><td className="px-2 py-1">{row.status || '-'}</td><td className="px-2 py-1">{row.providerFileId || '-'}</td><td className="px-2 py-1">{row.error || '-'}</td></tr>)}</tbody></table></div>}
      </div>
    </div>
  </div>;
}

function AgentTestPanel() {
  const [message, setMessage] = useState(AGENT_TEST_CASES[0]);
  const [conversationId, setConversationId] = useState(`geobooker-agent-test-${Date.now()}`);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const runTest = async (event) => {
    event.preventDefault();
    if (!message.trim()) return toast.error('Escribe un mensaje de prueba.');
    setLoading(true);
    setResult(null);
    try {
      const response = await callAdmin('agent_test', {
        userMsg: message.trim(),
        conversationId
      });
      setResult(response);
      toast.success(response.blockedByLocalGuardrail ? 'Prueba bloqueada por guardrail local' : 'Prueba enviada al sandbox del agente');
    } catch (error) {
      setResult({ success: false, requestStatus: 'failed', error: error.message, timestamp: new Date().toISOString() });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  return <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-50">
    <div>
      <h3 className="font-bold">Meta Business Agent · Test / Sandbox</h3>
      <p className="mt-1 text-sm">Prueba respuestas generadas sin activar conversaciones reales, sin configurar móvil y sin habilitar WhatsApp sending.</p>
    </div>
    <form onSubmit={runTest} className="mt-4 grid gap-3">
      <div className="flex flex-wrap gap-2">
        {AGENT_TEST_CASES.map((sample) => <button key={sample} type="button" onClick={() => setMessage(sample)} className="rounded-full border bg-white px-3 py-1 text-xs font-semibold text-emerald-900 hover:bg-emerald-100">{sample.slice(0, 64)}{sample.length > 64 ? '…' : ''}</button>)}
      </div>
      <label className="text-sm font-semibold">Mensaje de prueba
        <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} className="mt-1 min-h-[90px] w-full rounded-xl border p-3 text-gray-900" />
      </label>
      <label className="text-sm font-semibold">Conversation ID sandbox
        <input value={conversationId} onChange={(event) => setConversationId(event.target.value)} className="mt-1 w-full rounded-xl border p-2 text-gray-900" />
      </label>
      <button type="submit" disabled={loading} className="inline-flex w-fit items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white disabled:opacity-50">
        <Bot className="h-4 w-4" />{loading ? 'Probando...' : 'Enviar a sandbox'}
      </button>
    </form>
    {result && <div className={`mt-4 rounded-xl border p-4 text-sm ${result.success ? 'border-emerald-300 bg-white text-emerald-950 dark:bg-emerald-900 dark:text-emerald-50' : 'border-red-200 bg-red-50 text-red-900'}`}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IntegrationCard label="Status" value={result.success ? 'PASS' : 'FAIL'} detail={result.requestStatus || result.error || 'Sin estado'} tone={result.success ? 'good' : 'bad'} />
        <IntegrationCard label="Idioma" value={result.language || 'No confirmado'} detail="Detectado/reportado por sandbox." tone="info" />
        <IntegrationCard label="Timestamp" value={formatDate(result.timestamp)} detail="Hora de prueba." tone="neutral" />
        <IntegrationCard label="Guardrail" value={result.blockedByLocalGuardrail ? 'Local block' : 'Meta sandbox'} detail="Protección contra solicitud de secretos." tone={result.blockedByLocalGuardrail ? 'good' : 'info'} />
      </div>
      {result.meta && <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-red-900">
        <p className="font-bold">Error Meta</p>
        <p>HTTP: {result.meta.httpStatus || 'n/d'} · Código: {result.meta.code || 'n/d'}</p>
        <p>{result.meta.message}</p>
      </div>}
      <div className="mt-3 rounded-xl border bg-white p-3 text-gray-900">
        <p className="font-bold">Respuesta generada</p>
        <p className="mt-2 whitespace-pre-wrap">{result.responseText || 'Meta no devolvió texto de respuesta en un campo reconocido.'}</p>
      </div>
    </div>}
  </div>;
}

function AgentMetaConnectorAuditPanel() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const createConnector = async () => {
    setLoading(true);
    try {
      const response = await callAdmin('agent_meta_connector_create');
      setResult({
        ...response,
        conclusion: {
          connectorFound: Boolean(response.connector?.connectorId),
          backendMatchesGeobooker: /meta-business-agent-connector/i.test(String(response.connector?.baseUrl || response.baseUrl || '')),
          mcpReady: false,
          toolCount: response.connector?.mcpToolSync?.toolCount ?? 0,
          likelyToolsDisabledReason: response.success ? null : response.meta?.message || 'Meta rechazo la creacion del connector.'
        },
        geobookerConnector: response.connector,
        createResult: response
      });
      if (response.success) toast.success(response.alreadyExisted ? 'Connector ya existia en Meta' : 'Connector creado en Meta');
      else toast.error(response.meta?.message || 'Meta rechazo la creacion del connector');
    } catch (error) {
      setResult({ success: false, error: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const audit = async (refreshMcpTools = false) => {
    setLoading(true);
    try {
      const response = await callAdmin('agent_meta_connector_audit', { refreshMcpTools });
      setResult(response);
      if (response.conclusion?.mcpReady && Number(response.conclusion?.toolCount || 0) > 0) toast.success('Meta MCP tools READY');
      else toast.error(response.conclusion?.likelyToolsDisabledReason || response.listError?.message || 'Meta todavia no reporta herramientas listas');
    } catch (error) {
      setResult({ success: false, error: error.message });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  const connector = result?.afterRefreshConnector || result?.geobookerConnector || {};
  const sync = connector?.mcpToolSync || {};
  const tools = connector?.tools || [];
  return <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">Meta Business Agent · auditoria real de herramientas</h3>
        <p className="mt-1 text-sm">Consulta en Meta los Connectors registrados y refresca MCP tools solo si el connector apunta al backend seguro de Geobooker.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={createConnector} disabled={loading} className="rounded-xl bg-emerald-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Crear Connector</button>
        <button type="button" onClick={() => audit(false)} disabled={loading} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-sky-900 disabled:opacity-50">Auditar Connectors</button>
        <button type="button" onClick={() => audit(true)} disabled={loading} className="rounded-xl bg-sky-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Refresh MCP Tools</button>
      </div>
    </div>
    {result && <div className="mt-4 space-y-3">
      {result.createResult && <div className={`rounded-xl border p-3 text-sm ${result.createResult.success ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-red-200 bg-red-50 text-red-900'}`}>
        <p className="font-bold">Resultado creación Connector</p>
        <p>HTTP: {result.createResult.httpStatus || 'n/d'} · connector_id: {result.createResult.connector?.connectorId || '-'}</p>
        <p>name: {result.createResult.connector?.name || '-'}</p>
        <p>base_url: {result.createResult.connector?.baseUrl || result.createResult.baseUrl || '-'}</p>
        <p>connector_protocol: {result.createResult.connector?.connectorProtocol || result.createResult.connectorProtocol || '-'}</p>
        <p>auth_type: {result.createResult.connector?.authType || result.createResult.authType || '-'}</p>
        <p>connection_status: {result.createResult.connector?.connectionStatus?.status || result.createResult.connectionStatus || '-'}</p>
        <p>credencial server-side: {result.createResult.credentialsConfigured ? 'CONFIGURADA' : result.createResult.partialCreation ? 'PENDIENTE' : '-'}</p>
        {result.createResult.meta && <>
          <p>meta_code: {result.createResult.meta.code || 'n/d'} · subcode: {result.createResult.meta.subcode || 'n/d'}</p>
          <p>error: {result.createResult.meta.rawMessage || result.createResult.meta.message}</p>
          {result.createResult.meta.rawResponse && <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-white/70 p-2 text-xs">{result.createResult.meta.rawResponse}</pre>}
        </>}
      </div>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <IntegrationCard label="Connector Meta" value={result.conclusion?.connectorFound ? 'FOUND' : 'NOT FOUND'} detail={connector.connectorId || result.listError?.message || 'Sin connector_id'} tone={result.conclusion?.connectorFound ? 'good' : 'bad'} />
        <IntegrationCard label="Base URL" value={result.conclusion?.backendMatchesGeobooker ? 'Geobooker' : 'No confirmado'} detail={connector.baseUrl || 'Meta no reporto URL'} tone={result.conclusion?.backendMatchesGeobooker ? 'good' : 'warning'} />
        <IntegrationCard label="MCP Sync" value={sync.status || 'No confirmado'} detail={`Tools: ${sync.toolCount ?? 0}`} tone={sync.status === 'READY' && Number(sync.toolCount || 0) > 0 ? 'good' : 'warning'} />
        <IntegrationCard label="Refresh" value={result.refreshedMcpTools ? (result.refreshResult?.success ? 'PASS' : 'FAIL') : 'No ejecutado'} detail={result.refreshResult?.meta?.message || result.endpoints?.refresh || 'Read-only'} tone={!result.refreshedMcpTools ? 'neutral' : result.refreshResult?.success ? 'good' : 'bad'} />
      </div>
      {result.listError && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-900">
        <p className="font-bold">Meta no permitio listar connectors</p>
        <p>Endpoint: {result.endpoints?.list}</p>
        <p>HTTP: {result.listError.httpStatus || 'n/d'} · Codigo: {result.listError.code || 'n/d'}</p>
        <p>{result.listError.message}</p>
      </div>}
      <div className="rounded-xl border bg-white p-3 text-sm text-gray-900">
        <p className="font-bold">Connector detectado</p>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <p><strong>name:</strong> {connector.name || '-'}</p>
          <p><strong>connector_id:</strong> {connector.connectorId || '-'}</p>
          <p><strong>connector_protocol:</strong> {connector.connectorProtocol || '-'}</p>
          <p><strong>auth_type:</strong> {connector.authType || '-'}</p>
          <p><strong>connection_status:</strong> {connector.connectionStatus?.status || '-'}</p>
          <p><strong>error:</strong> {connector.connectionStatus?.errorMessage || '-'}</p>
          <p><strong>last_attempted_at:</strong> {formatDate(sync.lastAttemptedAt)}</p>
          <p><strong>last_successful_at:</strong> {formatDate(sync.lastSuccessfulAt)}</p>
          <p><strong>fingerprint:</strong> {sync.fingerprint || '-'}</p>
          <p><strong>tool_count:</strong> {sync.toolCount ?? 0}</p>
        </div>
      </div>
      <div className="rounded-xl border bg-white p-3 text-sm text-gray-900">
        <p className="font-bold">Herramientas descubiertas por Meta</p>
        {!tools.length ? <p className="mt-2 text-gray-500">{result.conclusion?.likelyToolsDisabledReason || 'Meta no reporto herramientas.'}</p> : <ul className="mt-2 list-disc pl-5">{tools.map((tool) => <li key={tool.name || tool.title}>{tool.name || tool.title}</li>)}</ul>}
      </div>
    </div>}
  </div>;
}

function AgentConnectorPanel() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [statusResult, logsResult] = await Promise.all([
        callAdmin('agent_connector_status'),
        callAdmin('agent_connector_logs')
      ]);
      setStatus(statusResult);
      setLogs(logsResult.rows || []);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);
  const connector = status?.connector || {};
  return <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="font-bold">Geobooker Connector seguro</h3>
        <p className="mt-1 text-sm">Puente controlado entre Meta Business Agent y CRM. No expone Supabase, no acepta SQL y no habilita envíos.</p>
      </div>
      <button onClick={load} disabled={loading} className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold text-blue-900 disabled:opacity-50">Actualizar</button>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <IntegrationCard label="Connector" value={connector.connectionStatus || 'No confirmado'} detail={connector.endpointPath || '/functions/v1/meta-business-agent-connector'} tone={connector.connectionStatus === 'prepared' ? 'good' : 'warning'} />
      <IntegrationCard label="Secret server-side" value={connector.connectorSecretPresent ? 'CONFIGURADO' : 'PENDIENTE'} detail="Nunca se muestra al navegador." tone={connector.connectorSecretPresent ? 'good' : 'warning'} />
      <IntegrationCard label="Mutaciones" value={connector.mutationsEnabled ? 'ENABLED' : 'DISABLED'} detail="Debe seguir desactivado hasta aprobación." tone={connector.mutationsEnabled ? 'bad' : 'good'} />
      <IntegrationCard label="Producción Agent" value="DISABLED" detail="Respuestas reales aún no activadas." tone="good" />
    </div>
    <div className="mt-4 rounded-xl border bg-white p-3 text-gray-900">
      <p className="font-bold">Acciones allowlist</p>
      <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead><tr>{['Acción', 'Permiso', 'Tipo', 'Estado inicial'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead>
          <tbody>{(status?.actions || []).map((row) => <tr key={row.action} className="border-t">
            <td className="px-2 py-1 font-semibold">{row.action}</td>
            <td className="px-2 py-1">{row.permission}</td>
            <td className="px-2 py-1">{row.mutation ? 'mutativa' : 'lectura limitada'}</td>
            <td className="px-2 py-1">{row.productionMutationBlocked ? 'bloqueada en producción' : row.initialStatus}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <IntegrationCard label="Requests 24h" value={status?.metrics24h?.total ?? 0} detail="Auditoría del connector." tone="neutral" />
      <IntegrationCard label="Bloqueados/fail 24h" value={status?.metrics24h?.blockedOrFailed ?? 0} detail="Errores y guardrails." tone={(status?.metrics24h?.blockedOrFailed || 0) > 0 ? 'warning' : 'good'} />
      <IntegrationCard label="Latencia promedio" value={status?.metrics24h?.avgLatencyMs ? `${status.metrics24h.avgLatencyMs} ms` : 'Sin datos'} detail="Últimas 24h." tone="neutral" />
    </div>
    <div className="mt-4 rounded-xl border bg-white p-3 text-gray-900">
      <p className="font-bold">Logs recientes sanitizados</p>
      {!logs.length ? <p className="mt-2 text-sm text-gray-500">Sin llamadas registradas todavía.</p> : <div className="mt-2 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead><tr>{['Fecha', 'Acción', 'Status', 'Idempotencia', 'Error'].map((label) => <th key={label} className="px-2 py-1 text-left">{label}</th>)}</tr></thead>
          <tbody>{logs.map((row) => <tr key={row.id} className="border-t">
            <td className="px-2 py-1">{formatDate(row.created_at)}</td>
            <td className="px-2 py-1">{row.action}</td>
            <td className="px-2 py-1">{row.status}</td>
            <td className="px-2 py-1">{row.idempotency_replayed ? 'replayed' : row.request_id ? 'tracked' : '-'}</td>
            <td className="px-2 py-1">{row.error_code || row.blocked_reason || '-'}</td>
          </tr>)}</tbody>
        </table>
      </div>}
    </div>
  </div>;
}

function MetaBusinessAgentView() {
  return <div className="space-y-4">
    <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="text-2xl font-bold">Meta Business Agent</h2>
      <p className="mt-1 text-sm text-gray-500">Configuración segura del agente para Geobooker: knowledge público, archivos revisados y pruebas sandbox. No activa respuestas productivas.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <StatusBadge tone="good">Server-side only</StatusBadge>
        <StatusBadge tone="good">WHATSAPP_SEND_ENABLED=false</StatusBadge>
        <StatusBadge tone="info">Entity ID 1358408147344707</StatusBadge>
      </div>
    </div>
    <AgentKnowledgePanel />
    <AgentFilesPanel />
    <AgentTestPanel />
    <AgentMetaConnectorAuditPanel />
    <AgentConnectorPanel />
  </div>;
}

function DiagnosticsView() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); callAdmin('diagnostics').then(setData).catch((error) => toast.error(error.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !data) return <Loading />;
  const items = [
    ...(data?.webhooks || []).map((row) => ({
      key: `w-${row.id}`,
      type: 'Webhook',
      code: row.operational_state === 'resolved_partial_failure' ? 'resuelto' : row.processing_status,
      detail: row.operational_state === 'resolved_partial_failure'
        ? 'El mensaje y el consentimiento quedaron persistidos. Falló únicamente una actividad auxiliar; el flujo posterior se completó.'
        : row.last_error,
      date: row.received_at,
      resolved: row.operational_state === 'resolved_partial_failure'
    })),
    ...(data?.messages || []).map((row) => ({ key: `m-${row.id}`, type: 'Mensaje', code: row.failure_code || row.current_status, detail: row.failure_detail, date: row.updated_at })),
    ...(data?.jobs || []).map((row) => ({ key: `j-${row.id}`, type: 'Cola', code: row.last_error_code || row.status, detail: row.last_error_detail, date: row.updated_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  return <div className="space-y-4">
    <div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Centro de diagnóstico</h2><p className="text-sm text-gray-500">Errores recientes sin secrets ni payloads sensibles.</p></div><button onClick={load} className="rounded-xl border p-2"><RefreshCw className="h-4 w-4" /></button></div>
    <WabaAuditPanel />
    <AgentKnowledgePanel />
    <AgentFilesPanel />
    {!items.length
      ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><CheckCircle2 className="mb-2 h-7 w-7" /><p className="font-bold">Sin errores operativos registrados</p></div>
      : <div className="space-y-3">{items.map((item) => <div key={item.key} className={`rounded-xl border p-4 ${item.resolved ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>
        <div className="flex flex-wrap justify-between gap-2"><p className={`font-bold ${item.resolved ? 'text-emerald-900' : 'text-red-900'}`}>{item.type}: {item.code}</p><span className={`text-xs ${item.resolved ? 'text-emerald-700' : 'text-red-700'}`}>{formatDate(item.date)}</span></div>
        <p className={`mt-1 text-sm ${item.resolved ? 'text-emerald-800' : 'text-red-800'}`}>{item.detail || 'Meta o el backend no proporcionaron más detalle.'}</p>
        {!item.resolved && <p className="mt-2 text-xs font-semibold text-red-900">Acción sugerida: verificar elegibilidad, configuración y el estado del proveedor antes de reintentar.</p>}
      </div>)}</div>}
  </div>;
}

function CampaignReadinessView() {
  const [readiness, setReadiness] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [audienceDiagnostics, setAudienceDiagnostics] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [wizardOptions, setWizardOptions] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [draftLoading, setDraftLoading] = useState(false);
  const [error, setError] = useState('');
  const [countryCode, setCountryCode] = useState('');
  const [industry, setIndustry] = useState('');
  const [draftName, setDraftName] = useState('');
  const [draftPurpose, setDraftPurpose] = useState('marketing');
  const [draftTemplateId, setDraftTemplateId] = useState('');
  const [draftLimit, setDraftLimit] = useState(100);
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignGoal, setCampaignGoal] = useState('geobooker_ads');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [languageCode, setLanguageCode] = useState('es_MX');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [sourceTier, setSourceTier] = useState('');
  const [contactSource, setContactSource] = useState('opt_in_form');
  const [minScore, setMinScore] = useState(0);
  const [scheduledLocalTime, setScheduledLocalTime] = useState('10:00');
  const [dryRunResult, setDryRunResult] = useState(null);
  const [approvalCheck, setApprovalCheck] = useState(null);
  const [preflightResult, setPreflightResult] = useState(null);
  const [preflightCampaignId, setPreflightCampaignId] = useState('');
  const [dispatchGate, setDispatchGate] = useState(null);
  const [queueConfirmation, setQueueConfirmation] = useState('');
  const [dispatchConfirmation, setDispatchConfirmation] = useState('');
  const [dispatchMode, setDispatchMode] = useState('now');
  const [scheduledDispatchAt, setScheduledDispatchAt] = useState('');
  const [dispatchResult, setDispatchResult] = useState(null);
  const [workerRunResult, setWorkerRunResult] = useState(null);
  const [dispatchLoading, setDispatchLoading] = useState('');
  const [approvalLoading, setApprovalLoading] = useState('');
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.allSettled([callAdmin('campaign_readiness'), callAdmin('campaign_list'), callAdmin('campaign_wizard_options'), callAdmin('campaign_dispatch_gate_status')])
      .then(([readinessResult, campaignResult, wizardResult, gateResult]) => {
        if (readinessResult.status === 'rejected') throw readinessResult.reason;
        if (campaignResult.status === 'rejected') throw campaignResult.reason;
        if (wizardResult.status === 'rejected') throw wizardResult.reason;
        setReadiness(readinessResult.value.readiness || null);
        setMarkets(readinessResult.value.markets || []);
        setCampaigns(campaignResult.value.rows || []);
        setTemplates(wizardResult.value.templates || []);
        setWizardOptions(wizardResult.value);
        setDispatchGate(gateResult.status === 'fulfilled' ? gateResult.value.gate || null : null);
      })
      .catch((loadError) => setError(loadError.message))
      .finally(() => setLoading(false));
  }, []);
  const loadPreview = useCallback(() => {
    setPreviewLoading(true);
    callAdmin('campaign_preview', { countryCode: countryCode || null, industry: industry || null, limit: 25 })
      .then((result) => setPreviewRows(result.rows || []))
      .catch((loadError) => setError(loadError.message))
      .finally(() => setPreviewLoading(false));
  }, [countryCode, industry]);
  const loadAudienceDiagnostics = useCallback(() => {
    setDiagnosticsLoading(true);
    callAdmin('campaign_audience_diagnostics', {
      countryCode: countryCode || null,
      industry: industry || null,
      purpose: draftPurpose,
      languageCode: languageCode || null,
      sourceTier: sourceTier || null,
      minScore: Number(minScore) || 0
    })
      .then((result) => setAudienceDiagnostics(result.rows || []))
      .catch((loadError) => {
        setAudienceDiagnostics([]);
        setError(loadError.message);
      })
      .finally(() => setDiagnosticsLoading(false));
  }, [countryCode, industry, draftPurpose, languageCode, sourceTier, minScore]);
  const createDraft = async (event) => {
    event.preventDefault();
    const validationErrors = [];
    if (draftName.trim().length < 3) validationErrors.push('nombre de campana');
    if (!campaignGoal) validationErrors.push('objetivo');
    if (!['marketing', 'transactional'].includes(draftPurpose)) validationErrors.push('finalidad');
    if (!/^[A-Z]{2}$/.test(countryCode)) validationErrors.push('pais');
    if (!languageCode) validationErrors.push('idioma');
    if (!timezone) validationErrors.push('zona horaria');
    if (Number(draftLimit) < 1 || Number(draftLimit) > 500) validationErrors.push('limite de destinatarios');
    if (!draftTemplateId) validationErrors.push('plantilla');
    const selectedMarketForDraft = (wizardOptions?.markets || markets || []).find((market) => market.country_code === countryCode);
    const marketDailyCap = Number(selectedMarketForDraft?.daily_recipient_cap || 0);
    if (marketDailyCap > 0 && Number(draftLimit) > marketDailyCap) {
      validationErrors.push(`limite mayor al maximo diario del mercado (${marketDailyCap})`);
    }
    if (!diagnosticsLoading && Number(eligibleMetric?.metric_value || 0) === 0) {
      validationErrors.push(`audiencia elegible; ${firstBlockingMetric?.next_action || 'no hay contactos que pasen permiso, evidencia y telefono valido'}`);
    }
    if (validationErrors.length) {
      const message = `Completa antes del dry run: ${validationErrors.join(', ')}.`;
      setError(message);
      toast.error(message);
      return;
    }
    setDraftLoading(true);
    setError('');
    setDryRunResult(null);
    try {
      const draft = await callAdmin('campaign_create_draft_v2', {
        name: draftName,
        goal: campaignGoal,
        purpose: draftPurpose,
        templateId: draftTemplateId,
        countryCode: countryCode || null,
        region: region || null,
        city: city || null,
        industry: industry || null,
        sourceTier: sourceTier || null,
        contactSource,
        languageCode,
        timezone,
        minScore: Number(minScore) || 0,
        maxRecipients: Number(draftLimit) || 100,
        scheduledLocalTime
      });
      const review = await callAdmin('campaign_prepare_review_v2', { campaignId: draft.campaignId });
      setDryRunResult(review.result || null);
      setDraftName('');
      setWizardStep(1);
      setApprovalCheck(null);
      toast.success('Campaign draft preparado para revisión. Sin envíos.');
      await load();
      await loadPreview();
    } catch (loadError) {
      const fallbackMessage = !diagnosticsLoading && Number(eligibleMetric?.metric_value || 0) === 0
        ? `No se pudo crear el dry run porque no hay destinatarios elegibles. ${firstBlockingMetric?.next_action || 'Importa o capta contactos con opt-in verificable antes de crear campana.'}`
        : loadError.message;
      setError(fallbackMessage);
      toast.error(fallbackMessage);
    } finally {
      setDraftLoading(false);
    }
  };
  const checkApproval = async (campaignId) => {
    setApprovalLoading(campaignId);
    setError('');
    try {
      const result = await callAdmin('campaign_approval_check', { campaignId });
      setApprovalCheck(result.check || null);
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const approveNoSend = async (campaignId) => {
    setApprovalLoading(campaignId);
    setError('');
    try {
      await callAdmin('campaign_approve_no_send', { campaignId });
      toast.success('Campaña aprobada sin envíos ni agenda.');
      setApprovalCheck(null);
      setPreflightResult(null);
      setPreflightCampaignId('');
      setDispatchResult(null);
      await load();
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const runPreflight = async (campaignId) => {
    setApprovalLoading(campaignId);
    setError('');
    setDispatchResult(null);
    try {
      const result = await callAdmin('campaign_dispatch_preflight', { campaignId, batchSize: 50 });
      setPreflightResult({ ...(result.preflight || {}), campaignId });
      setPreflightCampaignId(campaignId);
      setDispatchResult(null);
      setQueueConfirmation('');
      setDispatchConfirmation('');
      toast.success('Preflight generado. Sin cola ni envíos.');
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const dispatchAtomic = async (campaignId, preflightRunId) => {
    if (!window.confirm('¿Confirmas encolar 1 mensaje real a WhatsApp? Esta acción no se puede deshacer.')) return;
    setDispatchLoading(campaignId);
    setError('');
    try {
      const result = await callAdmin('campaign_dispatch_atomic', {
        campaignId,
        preflightRunId,
        confirmation: 'ENCOLAR 1 MENSAJE'
      });
      setDispatchResult(result.result || null);
      setWorkerRunResult(result.workerResult || null);
      const queuedMembers = Number(result.result?.queued_members || 0);
      if (queuedMembers > 0) {
        toast.success(`✅ ${queuedMembers} mensaje(s) encolado(s). Worker procesados: ${result.workerResult?.body?.processed ?? 0}.`);
      } else {
        toast('No se encolaron mensajes nuevos: no quedan miembros elegibles sin procesar para esta campaña.');
      }
      await load();
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setDispatchLoading('');
    }
  };
  const authorizeQueuePilot = async () => {
    if (!preflightCampaignId || !preflightResult?.run_id) return;
    setApprovalLoading('authorize-queue');
    setError('');
    try {
      const result = await callAdmin('campaign_authorize_queue_pilot', {
        campaignId: preflightCampaignId,
        preflightRunId: preflightResult.run_id,
        confirmation: queueConfirmation
      });
      setDispatchGate(result.gate || null);
      toast.success('Gate de cola piloto autorizado por 10 minutos.');
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const enqueueAtomicPilot = async () => {
    if (!preflightCampaignId || !preflightResult?.run_id) return;
    setApprovalLoading('atomic-dispatch');
    setError('');
    try {
      const result = await callAdmin('campaign_dispatch_atomic', {
        campaignId: preflightCampaignId,
        preflightRunId: preflightResult.run_id,
        confirmation: dispatchConfirmation,
        scheduleAt: dispatchMode === 'scheduled' && scheduledDispatchAt ? new Date(scheduledDispatchAt).toISOString() : null
      });
      setDispatchResult(result.result || null);
      setWorkerRunResult(result.workerResult || null);
      setDispatchGate(null);
      const queuedMembers = Number(result.result?.queued_members || 0);
      if (queuedMembers > 0) {
        toast.success(`Se reservó y encoló ${queuedMembers} mensaje(s). Worker procesados: ${result.workerResult?.body?.processed ?? 0}.`);
      } else {
        toast('No se encolaron mensajes nuevos: no quedan miembros elegibles sin procesar para esta campaña.');
      }
      await load();
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const closeQueueGate = async () => {
    setApprovalLoading('close-queue');
    setError('');
    try {
      const result = await callAdmin('campaign_close_queue_gate');
      setDispatchGate(result.gate || null);
      toast.success('Gate de cola cerrado.');
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  const runWorkerOnce = async () => {
    setApprovalLoading('worker-run-once');
    setError('');
    try {
      const result = await callAdmin('campaign_worker_run_once', { limit: 1 });
      setWorkerRunResult(result.worker || null);
      toast.success(`Worker ejecutado. Procesados: ${result.worker?.body?.processed ?? 0}.`);
      await load();
    } catch (loadError) {
      setError(loadError.message);
      toast.error(loadError.message);
    } finally {
      setApprovalLoading('');
    }
  };
  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadPreview(); }, [loadPreview]);
  useEffect(() => { loadAudienceDiagnostics(); }, [loadAudienceDiagnostics]);
  if (loading && !readiness) return <Loading />;
  const blocked = Number(readiness?.whatsapp_suppressed || 0);
  const unknown = Number(readiness?.whatsapp_unknown_or_missing || 0);
  const marketingReady = Number(readiness?.whatsapp_marketing_opted_in || 0);
  const serviceReady = Number(readiness?.whatsapp_service_allowed || 0);
  const queueRisk = Number(readiness?.retry_outbound_jobs || 0) + Number(readiness?.dead_letter_outbound_jobs || 0);
  const approvedMarkets = markets.filter((market) => market.whatsapp_marketing_enabled && ['pilot', 'approved'].includes(market.market_status)).length;
  const readyInternationalContacts = markets.reduce((total, market) => total + Number(market.ready_contacts || 0), 0);
  const cards = [
    ['Contactos activos', readiness?.active_contacts || 0, 'Base CRM disponible para revisar.', 'info'],
    ['WhatsApp válidos', readiness?.whatsapp_valid_points || 0, 'Contact points validados en formato usable.', 'info'],
    ['Marketing elegible', marketingReady, 'Opt-in/allowed y sin supresión activa.', marketingReady ? 'good' : 'warning'],
    ['Servicio elegible', serviceReady, 'Respuestas permitidas por relación/servicio.', serviceReady ? 'good' : 'warning'],
    ['Bloqueados', blocked, 'Opt-out, invalid, complaint o suppression activa.', blocked ? 'bad' : 'good'],
    ['Consentimiento unknown', unknown, 'No deben entrar a campañas hasta resolver evidencia.', unknown ? 'warning' : 'good'],
    ['Mercados habilitados', approvedMarkets, 'Requieren revisión y consentimiento comprobable.', approvedMarkets ? 'good' : 'warning'],
    ['Contactos internacionales listos', readyInternationalContacts, 'Opt-in con evidencia y mercado habilitado.', readyInternationalContacts ? 'good' : 'warning'],
    ['Draft campaigns', readiness?.draft_campaigns || 0, 'Campañas creadas, no aprobadas.', 'neutral'],
    ['Cola con riesgo', queueRisk, 'Retries y dead letters requieren diagnóstico.', queueRisk ? 'bad' : 'good']
  ];
  const marketChoices = Array.from(new Map([
    { country_code: 'MX', market_name: 'México', primary_language_code: 'es_MX', primary_timezone: 'America/Mexico_City', market_status: 'research', whatsapp_marketing_enabled: false },
    ...(wizardOptions?.markets || [])
  ].map((market) => [market.country_code, market])).values()).sort((a, b) => a.market_name.localeCompare(b.market_name));
  const selectedMarketForWizard = marketChoices.find((market) => market.country_code === countryCode) || null;
  const contactSourceGuide = CAMPAIGN_CONTACT_SOURCE_GUIDANCE[contactSource] || CAMPAIGN_CONTACT_SOURCE_GUIDANCE.crm_existing;
  const diagnosticsByKey = Object.fromEntries((audienceDiagnostics || []).map((row) => [row.metric_key, row]));
  const eligibleMetric = diagnosticsByKey.eligible || null;
  const firstBlockingMetric = (audienceDiagnostics || []).find((row) => ['active_contacts', 'with_whatsapp', 'valid_whatsapp', 'consent_ready', 'evidenced', 'eligible'].includes(row.metric_key) && Number(row.metric_value || 0) === 0);
  const countryGuide = COUNTRY_CAMPAIGN_GUIDANCE[countryCode] || {
    language: selectedMarketForWizard?.primary_language_code || languageCode || 'en_US',
    example: 'E.164',
    starterLimit: Number(selectedMarketForWizard?.daily_recipient_cap || 10) || 10,
    note: 'Mercado nuevo: activar solo despues de tarifa, idioma, opt-in y template aprobada.'
  };
  const expectedCategory = draftPurpose === 'marketing' ? 'marketing' : 'utility';
  const normalizedExpectedCategory = normalizeTemplateCategory(expectedCategory);
  const normalizedLanguageCode = normalizeTemplateLanguage(languageCode);
  const compatibleTemplates = templates.filter((template) => (
    normalizeTemplateCategory(template.category) === normalizedExpectedCategory
    && normalizeTemplateLanguage(template.language_code) === normalizedLanguageCode
  ));
  const selectedTemplate = templates.find((template) => template.id === draftTemplateId) || null;
  const matchingRates = (wizardOptions?.rates || []).filter((rate) => (
    rate.country_code === countryCode
    && normalizeTemplateCategory(rate.category) === normalizeTemplateCategory(selectedTemplate?.category)
  ));
  const activeRate = matchingRates.find((rate) => rate.status === 'active') || null;
  const observedRate = activeRate || matchingRates[0] || null;
  const maximumEstimatedCost = observedRate ? Number(observedRate.unit_cost || 0) * Number(draftLimit || 0) : null;
  const assistantWarnings = [
    !countryCode ? 'Selecciona un pais para calcular idioma, tarifa y elegibilidad.' : null,
    selectedMarketForWizard && !selectedMarketForWizard.whatsapp_marketing_enabled && draftPurpose === 'marketing' ? 'Este mercado aun no esta habilitado para marketing.' : null,
    selectedMarketForWizard && !['pilot', 'approved'].includes(selectedMarketForWizard.market_status) ? `Estado de mercado: ${selectedMarketForWizard.market_status}.` : null,
    !activeRate && selectedTemplate ? 'No hay tarifa activa para este pais/categoria.' : null,
    contactSourceGuide.status === 'crm_only_until_opt_in' ? 'Fuente abierta: no enviar WhatsApp marketing hasta obtener opt-in.' : null,
    compatibleTemplates.length === 0 ? 'No hay plantilla compatible con finalidad e idioma.' : null
  ].filter(Boolean);
  const stepReady = {
    1: draftName.trim().length >= 3 && Boolean(campaignGoal) && ['marketing', 'transactional'].includes(draftPurpose),
    2: /^[A-Z]{2}$/.test(countryCode) && Boolean(languageCode) && Boolean(timezone),
    3: Number(draftLimit) >= 1 && Number(draftLimit) <= 500 && Number(minScore) >= 0 && Number(minScore) <= 100,
    4: Boolean(draftTemplateId && selectedTemplate),
    5: draftName.trim().length >= 3
      && Boolean(campaignGoal)
      && ['marketing', 'transactional'].includes(draftPurpose)
      && /^[A-Z]{2}$/.test(countryCode)
      && Boolean(languageCode)
      && Boolean(timezone)
      && Number(draftLimit) >= 1
      && Number(draftLimit) <= 500
      && Number(minScore) >= 0
      && Number(minScore) <= 100
      && Boolean(draftTemplateId && selectedTemplate)
  };
  return <div className="flex flex-col gap-5">
    <div className="order-1 flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Readiness de campañas</h2><p className="text-sm text-gray-500">Preparación agregada; no crea ni envía campañas.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-50 dark:bg-gray-800"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
    </div>
    {error && !error.includes('no_unprocessed_eligible_members') && !error.includes('no_eligible_members') && <div className="order-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">Readiness no disponible todavía: {error}</div>}
    <div className="order-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, tone]) => <IntegrationCard key={label} label={label} value={Number(value || 0).toLocaleString()} detail={detail} tone={tone} />)}</div>
    <div className="order-6 grid gap-4 xl:grid-cols-3">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
        <h3 className="font-bold">Fuentes validas para campanas WhatsApp</h3>
        <ul className="mt-3 space-y-2">
          <li><strong>Permitidas:</strong> formulario/QR de consentimiento, respuesta entrante, landing oficial, cliente que pide informacion o contacto CRM con evidencia.</li>
          <li><strong>CSV / DENUE / fuentes abiertas:</strong> sirven para prospeccion CRM y scoring, pero no para WhatsApp marketing hasta obtener opt-in comprobable.</li>
          <li><strong>Internacional:</strong> cada pais requiere mercado habilitado, idioma compatible, tarifa activa y evidencia de consentimiento.</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <h3 className="font-bold">Checklist antes de enviar</h3>
        <ul className="mt-3 space-y-2">
          <li>Plantilla aprobada y habilitada para campanas; para pilotos usar text-only.</li>
          <li>Mercado ON, tarifa activa, limite diario y presupuesto reservable.</li>
          <li>Opt-in con evidencia, suppression limpia y frequency cap respetado.</li>
          <li>Preflight READY, gate temporal abierto y worker sin errores recientes.</li>
        </ul>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
        <h3 className="font-bold">Estados esperados</h3>
        <ul className="mt-3 space-y-2">
          <li><strong>queued:</strong> reservado en CRM, todavia pendiente del worker.</li>
          <li><strong>accepted + wamid:</strong> Meta acepto el envio; esperar webhook de estado.</li>
          <li><strong>sent/delivered/read:</strong> seguimiento real del proveedor.</li>
          <li><strong>failed:</strong> revisar codigo Meta, plantilla, parametros o media.</li>
        </ul>
      </div>
    </div>
    <div className="order-7 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="font-bold">Mercados internacionales candidatos</h3><p className="text-sm text-gray-500">Cohorte comercial inicial; todos permanecen bloqueados hasta revisión y activación explícita.</p></div>
        <StatusBadge tone={approvedMarkets ? 'good' : 'warning'}>{approvedMarkets}/20 habilitados</StatusBadge>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300"><tr>{['País', 'Región', 'Estado', 'Marketing', 'Opt-in', 'Evidencia', 'Listos', 'Límite diario'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
          <tbody className="divide-y dark:divide-gray-700">
            {markets.map((market) => <tr key={market.country_code}>
              <td className="px-3 py-2 font-semibold">{market.market_name} ({market.country_code})</td>
              <td className="px-3 py-2">{market.region}</td>
              <td className="px-3 py-2"><StatusBadge tone={['pilot', 'approved'].includes(market.market_status) ? 'good' : market.market_status === 'blocked' ? 'bad' : 'warning'}>{market.market_status}</StatusBadge></td>
              <td className="px-3 py-2"><StatusBadge tone={market.whatsapp_marketing_enabled ? 'good' : 'neutral'}>{market.whatsapp_marketing_enabled ? 'ON' : 'OFF'}</StatusBadge></td>
              <td className="px-3 py-2">{Number(market.opted_in_contacts || 0).toLocaleString()}</td>
              <td className="px-3 py-2">{Number(market.evidenced_contacts || 0).toLocaleString()}</td>
              <td className="px-3 py-2">{Number(market.ready_contacts || 0).toLocaleString()}</td>
              <td className="px-3 py-2">{Number(market.daily_recipient_cap || 0).toLocaleString()}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <div className="order-5 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-bold">Preview de audiencia WhatsApp</h3>
          <p className="text-sm text-gray-500">Muestra limitada de sólo lectura; no crea campaña ni cola.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input value={countryCode} onChange={(event) => setCountryCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} placeholder="País, ej. MX" className="w-28 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
          <input value={industry} onChange={(event) => setIndustry(event.target.value.slice(0, 80))} placeholder="Industria" className="w-52 rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
          <button type="button" onClick={loadPreview} disabled={previewLoading} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${previewLoading ? 'animate-spin' : ''}`} />Preview</button>
        </div>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <tr>{['Contacto', 'Cuenta', 'País', 'Industria', 'Estado', 'Razones', 'Score'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {!previewLoading && previewRows.length === 0 && <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-500">Sin registros de preview.</td></tr>}
            {previewRows.map((row, index) => <tr key={`${row.contact_id}-${row.account_id || 'none'}-${index}`} className="text-gray-700 dark:text-gray-200">
              <td className="px-3 py-2 font-medium">{row.contact_label}</td>
              <td className="px-3 py-2">{row.account_label || 'Sin cuenta'}</td>
              <td className="px-3 py-2">{row.country_code || 'Sin país'}</td>
              <td className="px-3 py-2">{row.industry || 'Sin industria'}</td>
              <td className="px-3 py-2"><StatusBadge tone={row.eligibility_status === 'eligible' ? 'good' : row.eligibility_status === 'missing_consent' ? 'warning' : 'bad'}>{row.eligibility_status}</StatusBadge></td>
              <td className="px-3 py-2 text-xs text-gray-500">{Array.isArray(row.eligibility_reasons) ? row.eligibility_reasons.join(', ') : 'Sin razones'}</td>
              <td className="px-3 py-2">{Number(row.computed_score || 0).toFixed(0)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <form onSubmit={createDraft} className="order-3 rounded-2xl border-2 border-emerald-200 bg-white p-5 shadow-sm dark:border-emerald-900 dark:bg-gray-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold">Crear campaña rápida</h3>
          <p className="text-sm text-gray-500">Flujo corto: objetivo, mercado, audiencia, plantilla y revisión. Primero crea un dry run; el envío real sigue protegido por approval, preflight y gate.</p>
        </div>
        <StatusBadge tone="good">No queue · No send</StatusBadge>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['1', 'Crear dry run', 'Calcula audiencia y costo sin enviar.'],
          ['2', 'Aprobar', 'Valida plantilla, opt-in, mercado y presupuesto.'],
          ['3', 'Encolar', 'Abre gate temporal y reserva el lote.'],
          ['4', 'Medir', 'Estados, respuestas, costo y actividad CRM.']
        ].map(([number, title, text]) => <div key={title} className="rounded-xl border bg-emerald-50 p-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">{number}</span>
          <p className="mt-2 font-bold">{title}</p>
          <p className="mt-1 text-xs opacity-80">{text}</p>
        </div>)}
      </div>
      <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Campaign Assistant</h3>
            <p className="mt-1 text-sm">Guia operativa para saber a que numeros se enviara, de que fuente vienen y si el pais/template/costo estan listos.</p>
          </div>
          <StatusBadge tone={assistantWarnings.length ? 'warning' : 'good'}>{assistantWarnings.length ? 'Revisar antes de enviar' : 'Flujo coherente'}</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <IntegrationCard label="Pais / idioma" value={countryCode || 'Sin pais'} detail={`Sugerido: ${countryGuide.language} · prefijo ${countryGuide.example}`} tone={countryCode ? 'info' : 'warning'} />
          <IntegrationCard label="Origen de audiencia" value={contactSourceGuide.label} detail={contactSourceGuide.status} tone={contactSourceGuide.tone} />
          <IntegrationCard label="Costo estimado" value={maximumEstimatedCost === null ? 'Sin tarifa' : `${observedRate.currency} ${maximumEstimatedCost.toFixed(2)}`} detail={observedRate ? `${observedRate.unit_cost} por mensaje · ${observedRate.status}` : 'Selecciona template/pais'} tone={activeRate ? 'good' : 'warning'} />
          <IntegrationCard label="Elegibles estrictos" value={Number(eligibleMetric?.metric_value || 0).toLocaleString()} detail="Permiso + evidencia + numero valido." tone={Number(eligibleMetric?.metric_value || 0) ? 'good' : 'warning'} />
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40">
            <p className="font-bold">Uso permitido</p>
            <p className="mt-1">{contactSourceGuide.allowedUse}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40">
            <p className="font-bold">Uso CRM</p>
            <p className="mt-1">{contactSourceGuide.crmUse}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40">
            <p className="font-bold">Uso WhatsApp</p>
            <p className="mt-1">{contactSourceGuide.whatsappUse}</p>
          </div>
        </div>
        <div className="mt-3 rounded-xl bg-white/70 p-3 text-sm dark:bg-gray-900/40">
          <p><strong>Regla:</strong> no se envia al azar. El origen de audiencia no extrae contactos; solo documenta de donde deberian venir. El backend solo materializa contactos que ya existan en CRM y pasen telefono valido, pais, idioma, consentimiento/evidencia, suppression, mercado y plantilla.</p>
          <p className="mt-1"><strong>Nota pais:</strong> {countryGuide.note}</p>
          {assistantWarnings.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{assistantWarnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Diagnostico de fuentes y elegibilidad</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Explica por que el dry run queda en 0. No importa, no encola y no envia.</p>
          </div>
          <button type="button" onClick={loadAudienceDiagnostics} disabled={diagnosticsLoading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50 dark:bg-gray-800"><RefreshCw className={`h-4 w-4 ${diagnosticsLoading ? 'animate-spin' : ''}`} />Diagnosticar</button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(audienceDiagnostics || []).map((row) => <IntegrationCard key={row.metric_key} label={row.metric_label} value={Number(row.metric_value || 0).toLocaleString()} detail={row.detail} tone={row.metric_status === 'bad' ? 'bad' : row.metric_status === 'good' ? 'good' : row.metric_status === 'info' ? 'info' : 'warning'} />)}
          {!diagnosticsLoading && audienceDiagnostics.length === 0 && <div className="rounded-xl border bg-white p-4 text-sm text-gray-500 dark:bg-gray-800">Aun no hay diagnostico disponible.</div>}
        </div>
        {firstBlockingMetric && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p className="font-bold">Primer bloqueo detectado: {firstBlockingMetric.metric_label}</p>
          <p className="mt-1">{firstBlockingMetric.next_action}</p>
        </div>}
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-white p-3 text-sm dark:bg-gray-800">
            <p className="font-bold">Destinatarios elegibles hoy</p>
            <p className="mt-1">Vienen de /whatsapp-consent o CSV propio con opt-in verificable. Deben tener permiso y evidencia.</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-sm dark:bg-gray-800">
            <p className="font-bold">DENUE / INEGI / Overture / Apify</p>
            <p className="mt-1">Primero son cuentas/prospectos para CRM, GeoScore y captacion. No se vuelven destinatarios hasta que confirmen opt-in.</p>
          </div>
          <div className="rounded-xl bg-white p-3 text-sm dark:bg-gray-800">
            <p className="font-bold">Otros paises</p>
            <p className="mt-1">Requieren mercado ON, tarifa activa, plantilla en idioma correcto y contactos con consentimiento comprobable.</p>
          </div>
        </div>
      </div>
      <div className="mt-4 rounded-2xl border border-purple-200 bg-purple-50 p-4 text-purple-950 dark:border-purple-900 dark:bg-purple-950 dark:text-purple-100">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-bold">Audience Builder: como llegar a 20 elegibles</h3>
            <p className="mt-1 text-sm">Primero se filtran prospectos; despues se convierten en elegibles con opt-in. Este bloque guia la estrategia antes de crear campanas grandes.</p>
          </div>
          <StatusBadge tone="info">Prospectos → Opt-in → Campaña</StatusBadge>
        </div>
        <div className="mt-4 overflow-x-auto rounded-xl border border-purple-200 bg-white/80 dark:border-purple-900 dark:bg-gray-900/40">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr>{['Fuente', '¿Puede enviar?', 'Filtros reales', 'Objetivo', 'Accion recomendada'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-purple-100 dark:divide-purple-900">
              {AUDIENCE_BUILDER_PLAYBOOK.map((row) => <tr key={row.source}>
                <td className="px-3 py-2 font-semibold">{row.source}</td>
                <td className="px-3 py-2"><StatusBadge tone={row.canSend === 'Si' ? 'good' : row.canSend.includes('Despues') ? 'warning' : 'bad'}>{row.canSend}</StatusBadge></td>
                <td className="min-w-[220px] px-3 py-2">{row.filterBy}</td>
                <td className="min-w-[220px] px-3 py-2">{row.target}</td>
                <td className="min-w-[260px] px-3 py-2">{row.action}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {[OPT_IN_ACQUISITION_COPY.es, OPT_IN_ACQUISITION_COPY.en].map((copy) => <div key={copy.title} className="rounded-xl bg-white p-4 text-sm dark:bg-gray-900">
            <p className="font-bold">{copy.title}</p>
            <p className="mt-2">{copy.body}</p>
            <p className="mt-2"><strong>CTA:</strong> {copy.cta}</p>
            <p className="mt-1"><strong>Landing:</strong> {copy.landing}</p>
            <p className="mt-2 text-xs opacity-80">{copy.note}</p>
          </div>)}
        </div>
        <div className="mt-4 rounded-xl bg-white p-4 text-sm dark:bg-gray-900">
          <p className="font-bold">Regla operativa para 20 contactos</p>
          <p className="mt-1">Si el filtro devuelve 500 prospectos pero solo 1 elegible, el sistema no debe inventar 19 destinatarios. Debe crear una cohorte de captacion para conseguir 19 opt-ins adicionales y despues ejecutar la campana.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {['Objetivo', 'Mercado', 'Audiencia', 'Plantilla', 'Revisión'].map((label, index) => {
          const step = index + 1;
          return <button key={label} type="button" onClick={() => setWizardStep(step)} className={`rounded-xl border px-2 py-2 text-xs font-semibold ${wizardStep === step ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'text-gray-500'}`}>{step}. {label}</button>;
        })}
      </div>
      {wizardStep === 1 && <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm font-semibold">Nombre de campaña<input value={draftName} onChange={(event) => setDraftName(event.target.value)} required minLength={3} maxLength={120} placeholder="Ej. Geobooker Ads · México" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Objetivo<select value={campaignGoal} onChange={(event) => setCampaignGoal(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900">{Object.entries(CAMPAIGN_GOAL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="text-sm font-semibold">Finalidad<select value={draftPurpose} onChange={(event) => { setDraftPurpose(event.target.value); setDraftTemplateId(''); }} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900"><option value="marketing">Marketing con opt-in comprobable</option><option value="transactional">Utility / seguimiento solicitado</option></select></label>
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><strong>Servicio no es campaña.</strong><p className="mt-1">Las respuestas de servicio se operan desde Bandeja. Este wizard sólo prepara Marketing o Utility con plantilla.</p></div>
      </div>}
      {wizardStep === 2 && <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <label className="text-sm font-semibold">País<select value={countryCode} onChange={(event) => { const value = event.target.value; const market = marketChoices.find((item) => item.country_code === value); setCountryCode(value); if (market?.primary_language_code) setLanguageCode(market.primary_language_code); if (market?.primary_timezone) setTimezone(market.primary_timezone); setDraftTemplateId(''); }} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900"><option value="">Selecciona mercado</option>{marketChoices.map((market) => <option key={market.country_code} value={market.country_code}>{market.market_name} ({market.country_code}) · {market.whatsapp_marketing_enabled ? 'habilitado' : 'bloqueado'}</option>)}</select></label>
        <label className="text-sm font-semibold">Estado / región<input value={region} onChange={(event) => setRegion(event.target.value.slice(0, 120))} placeholder="Opcional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Ciudad<input value={city} onChange={(event) => setCity(event.target.value.slice(0, 120))} placeholder="Opcional" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Idioma exacto<input value={languageCode} onChange={(event) => { setLanguageCode(event.target.value.slice(0, 16)); setDraftTemplateId(''); }} placeholder="es_MX" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Zona horaria<input value={timezone} onChange={(event) => setTimezone(event.target.value.slice(0, 80))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Hora local sugerida<input type="time" value={scheduledLocalTime} onChange={(event) => setScheduledLocalTime(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
      </div>}
      {wizardStep === 3 && <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="text-sm font-semibold">Industria<input value={industry} onChange={(event) => setIndustry(event.target.value.slice(0, 120))} placeholder="Ej. restaurantes" className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Origen de audiencia<select value={contactSource} onChange={(event) => setContactSource(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900">{Object.entries(CAMPAIGN_CONTACT_SOURCE_GUIDANCE).map(([value, guide]) => <option key={value} value={value}>{guide.label}</option>)}</select></label>
        <label className="text-sm font-semibold">Calidad de fuente<select value={sourceTier} onChange={(event) => setSourceTier(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900"><option value="">Cualquier tier permitido</option>{['AAA', 'AA', 'A', 'B'].map((tier) => <option key={tier} value={tier}>{tier}</option>)}</select></label>
        <label className="text-sm font-semibold">Score mínimo<input type="number" min="0" max="100" value={minScore} onChange={(event) => setMinScore(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <label className="text-sm font-semibold">Máximo destinatarios<input type="number" min="1" max="500" value={draftLimit} onChange={(event) => setDraftLimit(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" /></label>
        <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">El backend excluirá números inválidos, consentimiento desconocido o sin evidencia, supresiones, idioma incompatible y mercados no autorizados. Cambiar el origen no extrae contactos automáticamente: primero deben existir en CRM.</div>
        {Number(eligibleMetric?.metric_value || 0) > 0 && <div className="md:col-span-2 xl:col-span-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold">Audiencia lista: {Number(eligibleMetric?.metric_value || 0).toLocaleString()} destinatario(s) elegible(s)</p>
              <p className="mt-1">Ahora falta elegir una plantilla compatible y crear el dry run. Esto todavía no encola ni envía mensajes.</p>
              {contactSource === 'open_data' && <p className="mt-1 text-xs">Nota: aunque seleccionaste fuente abierta, el destinatario elegible viene de CRM/opt-in. DENUE/INEGI no se usa para envío directo.</p>}
            </div>
            <div className="flex flex-wrap gap-2">
              {contactSource === 'open_data' && <button type="button" onClick={() => setContactSource('crm_existing')} className="rounded-xl border border-emerald-300 bg-white px-3 py-2 text-xs font-bold text-emerald-900">Usar origen CRM</button>}
              <button type="button" onClick={() => setWizardStep(4)} className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white">Continuar a plantilla</button>
            </div>
          </div>
        </div>}
      </div>}
      {wizardStep === 4 && <div className="mt-5 space-y-3">
        <label className="text-sm font-semibold">Plantilla compatible<select value={draftTemplateId} onChange={(event) => setDraftTemplateId(event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900"><option value="">Selecciona una plantilla habilitada</option>{compatibleTemplates.map((template) => <option key={template.id} value={template.id}>{template.template_name} · {template.language_code} · {template.category}</option>)}</select></label>
        {!compatibleTemplates.length && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <p>No hay plantilla habilitada para {expectedCategory} en {languageCode}. El wizard queda bloqueado correctamente.</p>
          <p className="mt-1 text-xs">Diagnóstico: el backend devolvió {templates.length} plantilla(s) habilitada(s). Filtro normalizado: {normalizedExpectedCategory} / {normalizedLanguageCode}.</p>
          {templates.length > 0 && <p className="mt-1 text-xs">Disponibles: {templates.slice(0, 5).map((template) => `${template.template_name} (${template.category}/${template.language_code})`).join(' · ')}</p>}
        </div>}
        {selectedTemplate && <div className="rounded-xl border bg-gray-50 p-3 text-sm dark:bg-gray-900"><p className="font-semibold">{selectedTemplate.template_name}</p><p className="mt-1 text-gray-600 dark:text-gray-300">{selectedTemplate.body_text || 'Meta no devolvió una vista previa del cuerpo.'}</p><p className="mt-2 text-xs text-gray-500">Variables: {selectedTemplate.variable_count || 0} · Rol: {selectedTemplate.campaign_role || 'sin clasificar'}</p></div>}
      </div>}
      {wizardStep === 5 && <div className="mt-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IntegrationCard label="Objetivo" value={CAMPAIGN_GOAL_LABELS[campaignGoal] || campaignGoal} detail={`${draftPurpose} · ${languageCode}`} tone="info" />
          <IntegrationCard label="Segmento" value={`${countryCode || '—'}${city ? ` · ${city}` : ''}`} detail={`${industry || 'Todas las industrias'} · score ≥ ${minScore || 0}`} tone="info" />
          <IntegrationCard label="Límite" value={Number(draftLimit || 0).toLocaleString()} detail="No implica destinatarios elegibles." tone="neutral" />
          <IntegrationCard label="Costo máximo estimado" value={maximumEstimatedCost === null ? 'Sin tarifa activa' : `${observedRate.currency} ${maximumEstimatedCost.toFixed(2)}`} detail={observedRate ? `${observedRate.status} · ${observedRate.unit_cost} por mensaje` : 'El backend bloqueará el dry run.'} tone={activeRate ? 'good' : 'warning'} />
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><strong>Revisión segura:</strong> confirmar sólo crea el borrador y calcula la audiencia. No aprueba, agenda, encola ni envía.</div>
      </div>}
      <div className="hidden">
        <input value={draftName} onChange={(event) => setDraftName(event.target.value)} required minLength={3} maxLength={120} placeholder="Nombre de campaña" className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
        <select value={draftPurpose} onChange={(event) => setDraftPurpose(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900">
          <option value="marketing">Marketing</option>
          <option value="transactional">Transactional</option>
          <option value="service">Service</option>
        </select>
        <select value={draftTemplateId} onChange={(event) => setDraftTemplateId(event.target.value)} disabled={draftPurpose === 'service'} className="rounded-xl border bg-white px-3 py-2 text-sm disabled:opacity-50 dark:bg-gray-900">
          <option value="">Plantilla aprobada requerida</option>
          {templates.map((template) => <option key={template.id} value={template.id}>{template.template_name} · {template.language_code}</option>)}
        </select>
        <input type="number" min="1" max="500" value={draftLimit} onChange={(event) => setDraftLimit(event.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900" />
        <button type="submit" disabled={draftLoading || !draftName.trim() || (draftPurpose !== 'service' && !draftTemplateId)} className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><ShieldCheck className="h-4 w-4" />{draftLoading ? 'Preparando…' : 'Crear dry run'}</button>
      </div>
      <div className="mt-5 flex flex-wrap justify-between gap-3 border-t pt-4 dark:border-gray-700">
        <button type="button" onClick={() => setWizardStep((step) => Math.max(1, step - 1))} disabled={wizardStep === 1} className="rounded-xl border px-4 py-2 text-sm font-semibold disabled:opacity-40">Anterior</button>
        {wizardStep < 5 ? <button type="button" onClick={() => setWizardStep((step) => Math.min(5, step + 1))} disabled={!stepReady[wizardStep]} className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-40">Siguiente</button> : <button type="submit" disabled={draftLoading || !stepReady[5]} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"><ShieldCheck className="h-4 w-4" />{draftLoading ? 'Preparando…' : 'Crear dry run seguro'}</button>}
      </div>
      <p className="mt-2 text-xs text-gray-500">Usa los filtros actuales del preview: país <strong>{countryCode || 'Todos'}</strong> e industria <strong>{industry || 'Todas'}</strong>.</p>
      {dryRunResult && <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ['Candidatos', dryRunResult.total_candidates, 'info'],
          ['Materializados', dryRunResult.materialized_members, 'info'],
          ['Elegibles', dryRunResult.eligible_members, 'good'],
          ['Sin consentimiento', dryRunResult.missing_consent_members, 'warning'],
          ['Suprimidos', dryRunResult.suppressed_members, 'bad'],
          ['Inválidos', dryRunResult.invalid_candidates, 'warning']
        ].map(([label, value, tone]) => <IntegrationCard key={label} label={label} value={Number(value || 0).toLocaleString()} tone={tone} />)}
      </div>}
    </form>
    <div className="order-6 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-bold">Campaign drafts recientes</h3>
      {approvalCheck && <div className={`mt-4 rounded-xl border p-4 ${approvalCheck.is_approvable ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">Approval gate: {approvalCheck.is_approvable ? 'PASS' : 'BLOCKED'}</p>
            <p className="text-sm">Elegibles: {approvalCheck.eligible_members || 0} · Sin consentimiento: {approvalCheck.missing_consent_members || 0} · Suprimidos: {approvalCheck.suppressed_members || 0} · Inválidos: {approvalCheck.invalid_members || 0}</p>
          </div>
          <StatusBadge tone={approvalCheck.is_approvable ? 'good' : 'warning'}>{approvalCheck.campaign_status}</StatusBadge>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <StatusBadge tone={approvalCheck.approved_template ? 'good' : 'bad'}>Template {approvalCheck.approved_template ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={approvalCheck.active_budget_policy && !approvalCheck.budget_kill_switch ? 'good' : 'bad'}>Budget {approvalCheck.active_budget_policy && !approvalCheck.budget_kill_switch ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={approvalCheck.waba_ready ? 'good' : 'bad'}>WABA {approvalCheck.waba_ready ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={approvalCheck.phone_ready ? 'good' : 'bad'}>Phone {approvalCheck.phone_ready ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={approvalCheck.market_ready ? 'good' : 'bad'}>Mercados {approvalCheck.market_ready ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={Number(approvalCheck.missing_evidence_members || 0) === 0 ? 'good' : 'bad'}>Evidencia {Number(approvalCheck.missing_evidence_members || 0) === 0 ? 'PASS' : 'FAIL'}</StatusBadge>
          <StatusBadge tone={(approvalCheck.retry_outbound_jobs || approvalCheck.dead_letter_outbound_jobs) ? 'bad' : 'good'}>Queue {(approvalCheck.retry_outbound_jobs || approvalCheck.dead_letter_outbound_jobs) ? 'RISK' : 'PASS'}</StatusBadge>
          <StatusBadge tone="good">No send</StatusBadge>
        </div>
        {Array.isArray(approvalCheck.reasons) && approvalCheck.reasons.length > 0 && <p className="mt-3 text-sm">Razones: {approvalCheck.reasons.join(', ')}</p>}
      </div>}
      {dispatchResult && <div className={`mt-4 rounded-xl border p-4 ${Number(dispatchResult.queued_members || 0) > 0 ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
        <p className="font-bold">{Number(dispatchResult.queued_members || 0) > 0 ? '🚀 Despacho ejecutado' : 'Sin nuevos miembros para encolar'}</p>
        <p className="mt-1 text-sm">Mensajes encolados: <strong>{dispatchResult.queued_members || 0}</strong> · Costo reservado: <strong>{dispatchResult.currency || ''} {Number(dispatchResult.reserved_cost || 0).toFixed(4)}</strong></p>
        <p className={`mt-1 text-xs ${Number(dispatchResult.queued_members || 0) > 0 ? 'text-emerald-700' : 'text-amber-800'}`}>{Number(dispatchResult.queued_members || 0) > 0 ? 'El worker procesará el envío. Revisa el estado en Diagnósticos o en las Invocations de whatsapp-worker.' : 'La audiencia del preflight ya fue procesada o quedó sin miembros pendientes. Revisa Campaign members, jobs y messages antes de reintentar.'}</p>
      </div>}
      {workerRunResult && <div className={`mt-4 rounded-xl border p-4 ${workerRunResult.ok ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-amber-300 bg-amber-50 text-amber-950'}`}>
        <p className="font-bold">Worker WhatsApp</p>
        <p className="mt-1 text-sm">HTTP: <strong>{workerRunResult.status ?? 'n/d'}</strong> · Procesados: <strong>{workerRunResult.body?.processed ?? 0}</strong></p>
        {Array.isArray(workerRunResult.body?.results) && workerRunResult.body.results.length > 0 && <p className="mt-1 text-xs">Resultado: {workerRunResult.body.results.map((row) => row.status || row.reason || 'sin_estado').join(', ')}</p>}
        {workerRunResult.body?.error && <p className="mt-1 text-xs">Error: {workerRunResult.body.error}</p>}
      </div>}
      {preflightResult && <div className={`mt-4 rounded-xl border p-4 ${preflightResult.can_schedule ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-bold">Dispatch preflight: {preflightResult.can_schedule ? 'READY' : 'BLOCKED'}</p>
            <p className="text-sm">Elegibles: {preflightResult.eligible_member_count || 0} · Excluidos: {preflightResult.excluded_member_count || 0} · Batches: {preflightResult.batch_count || 0} de {preflightResult.batch_size || 50}</p>
          </div>
          <StatusBadge tone="good">No queue · No send</StatusBadge>
        </div>
        {Array.isArray(preflightResult.reasons) && preflightResult.reasons.length > 0 && <p className="mt-3 text-sm">Razones: {preflightResult.reasons.join(', ')}</p>}
      </div>}
      {preflightResult?.can_schedule && <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-950">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-bold">Piloto real controlado</p>
            <p className="mt-1 text-sm">Autoriza una ventana temporal, reserva presupuesto y encola exactamente 1 mensaje. No cambia WHATSAPP_SEND_ENABLED ni llama a Meta desde esta pantalla.</p>
          </div>
          <StatusBadge tone={dispatchGate?.queue_enabled ? 'warning' : 'good'}>{dispatchGate?.queue_enabled ? 'Gate abierto' : 'Gate cerrado'}</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border border-blue-100 bg-white p-3 dark:bg-gray-900">
            <p className="text-sm font-semibold">1. Autorizar cola piloto</p>
            <p className="mt-1 text-xs text-gray-500">Escribe exactamente: AUTORIZAR COLA PILOTO 1</p>
            <input value={queueConfirmation} onChange={(event) => setQueueConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-950" />
            <button type="button" onClick={authorizeQueuePilot} disabled={approvalLoading === 'authorize-queue' || queueConfirmation !== 'AUTORIZAR COLA PILOTO 1'} className="mt-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">Autorizar 10 min</button>
          </div>
          <div className="rounded-xl border border-blue-100 bg-white p-3 dark:bg-gray-900">
            <p className="text-sm font-semibold">2. Encolar reserva atomica</p>
            <p className="mt-1 text-xs text-gray-500">Escribe exactamente: ENCOLAR 1 MENSAJE</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-semibold text-gray-600">
                Modo de salida
                <select value={dispatchMode} onChange={(event) => setDispatchMode(event.target.value)} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm dark:bg-gray-950">
                  <option value="now">Enviar ahora</option>
                  <option value="scheduled">Programar envío</option>
                </select>
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Fecha/hora local
                <input type="datetime-local" value={scheduledDispatchAt} onChange={(event) => setScheduledDispatchAt(event.target.value)} disabled={dispatchMode !== 'scheduled'} className="mt-1 w-full rounded-lg border bg-white px-2 py-2 text-sm disabled:opacity-50 dark:bg-gray-950" />
              </label>
            </div>
            <input value={dispatchConfirmation} onChange={(event) => setDispatchConfirmation(event.target.value)} className="mt-2 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-950" />
            <button type="button" onClick={enqueueAtomicPilot} disabled={approvalLoading === 'atomic-dispatch' || !dispatchGate?.queue_enabled || dispatchConfirmation !== 'ENCOLAR 1 MENSAJE' || (dispatchMode === 'scheduled' && !scheduledDispatchAt)} className="mt-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">{dispatchMode === 'scheduled' ? 'Programar 1' : 'Encolar 1 ahora'}</button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <button type="button" onClick={closeQueueGate} disabled={approvalLoading === 'close-queue'} className="rounded-lg border bg-white px-3 py-2 font-semibold disabled:opacity-40 dark:bg-gray-900">Cerrar gate</button>
          {dispatchGate?.authorization_expires_at && <span>Expira: {formatDate(dispatchGate.authorization_expires_at)}</span>}
          {dispatchResult && <StatusBadge tone="good">Queued {dispatchResult.queued_members || 0} - {dispatchResult.currency || ''} {Number(dispatchResult.reserved_cost || 0).toFixed(4)}</StatusBadge>}
          <button type="button" onClick={runWorkerOnce} disabled={approvalLoading === 'worker-run-once'} className="rounded-lg border bg-white px-3 py-2 font-semibold disabled:opacity-40 dark:bg-gray-900">Enviar ahora / procesar cola</button>
        </div>
      </div>}
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <tr>{['Campaña', 'Propósito', 'Estado', 'Elegibles', 'Sin consentimiento', 'Suprimidos', 'Actualizada', 'Gate'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {campaigns.length === 0 && <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-500">Sin campañas WhatsApp todavía.</td></tr>}
            {campaigns.map((campaign) => <tr key={campaign.id}>
              <td className="px-3 py-2 font-semibold">{campaign.name}</td>
              <td className="px-3 py-2">{campaign.purpose}</td>
              <td className="px-3 py-2"><StatusBadge tone={campaign.status === 'review_ready' ? 'info' : 'neutral'}>{campaign.status}</StatusBadge></td>
              <td className="px-3 py-2">{campaign.memberCounts?.eligible || 0}</td>
              <td className="px-3 py-2">{campaign.memberCounts?.missing_consent || 0}</td>
              <td className="px-3 py-2">{campaign.memberCounts?.suppressed || 0}</td>
              <td className="px-3 py-2">{formatDate(campaign.updated_at)}</td>
              <td className="px-3 py-2">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => checkApproval(campaign.id)} disabled={approvalLoading === campaign.id || dispatchLoading === campaign.id} className="rounded-lg border px-2 py-1 text-xs font-semibold disabled:opacity-50">Check</button>
                  {campaign.status === 'review_ready' && <button type="button" onClick={() => approveNoSend(campaign.id)} disabled={approvalLoading === campaign.id} className="rounded-lg bg-gray-900 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Approve no-send</button>}
                  {campaign.status === 'approved' && <button type="button" onClick={() => runPreflight(campaign.id)} disabled={approvalLoading === campaign.id} className="rounded-lg bg-blue-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Preflight</button>}
                  {campaign.status === 'approved' && preflightResult?.campaignId === campaign.id && preflightResult?.can_schedule && preflightResult?.run_id && (
                    <button
                      type="button"
                      onClick={() => dispatchAtomic(campaign.id, preflightResult.run_id)}
                      disabled={dispatchLoading === campaign.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white disabled:opacity-50 hover:bg-emerald-700"
                    >
                      {dispatchLoading === campaign.id ? '⏳ Encolando…' : '🚀 Despachar 1 msg'}
                    </button>
                  )}
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
    <div className="order-8 rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-1 h-5 w-5 text-emerald-600" />
        <div>
          <h3 className="font-bold">Gate antes de campañas profesionales</h3>
          <p className="mt-1 text-sm text-gray-500">Para activar una campaña real deben estar en PASS: Meta Health, plantilla aprobada, presupuesto, número productivo, consentimiento, suppression list, worker y observabilidad.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <StatusBadge tone="good">No envía mensajes</StatusBadge>
            <StatusBadge tone="warning">Unknown queda excluido</StatusBadge>
            <StatusBadge tone={blocked ? 'bad' : 'good'}>Suppression obligatoria</StatusBadge>
            <StatusBadge tone={queueRisk ? 'bad' : 'good'}>Cola observable</StatusBadge>
          </div>
        </div>
      </div>
    </div>
  </div>;
}

function GuideView() {
  const steps = [
    ['Consentimiento', 'La persona inicia contacto o existe evidencia válida para la finalidad del mensaje.'],
    ['Contacto CRM', 'Geobooker normaliza el teléfono y evita contactos duplicados.'],
    ['Conversación', 'Se crea o reutiliza una conversación asociada al contacto y empresa.'],
    ['Envío seguro', 'El CRM solicita el envío al backend; el navegador nunca recibe el token de Meta.'],
    ['Message ID', 'Meta devuelve el identificador que permite seguir ese mensaje.'],
    ['Estados', 'El webhook registra sent, delivered, read o failed con la hora de Meta.'],
    ['Respuesta', 'El mensaje entrante aparece en la bandeja y en la actividad CRM.'],
    ['Seguimiento', 'El agente responde dentro de la ventana válida o utiliza una plantilla aprobada.'],
    ['Oportunidad', 'La conversación puede avanzar a reunión, oportunidad, venta y atribución.']
  ];
  return <div className="space-y-6"><div><h2 className="text-2xl font-bold">Cómo funciona WhatsApp en Geobooker</h2><p className="text-gray-500">Guía operativa para ventas y administración.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{steps.map(([title, text], index) => <div key={title} className="rounded-2xl border bg-white p-5 dark:bg-gray-800"><span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600 font-bold text-white">{index + 1}</span><h3 className="mt-3 font-bold">{title}</h3><p className="mt-1 text-sm text-gray-500">{text}</p></div>)}</div><div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-900"><h3 className="font-bold">Conceptos rápidos</h3><p className="mt-2 text-sm"><strong>WABA:</strong> cuenta empresarial de WhatsApp en Meta. <strong>Plantilla:</strong> mensaje previamente aprobado para iniciar conversaciones. <strong>Webhook:</strong> aviso seguro que Meta envía al CRM. <strong>Opt-out:</strong> decisión de una persona de no recibir mensajes; bloquea futuros envíos.</p></div></div>;
}

function PlannedView({ section }) {
  const label = NAVIGATION.find(([id]) => id === section)?.[1] || section;
  return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-amber-950"><Workflow className="h-9 w-9" /><h2 className="mt-3 text-2xl font-bold">{label}: siguiente bloque controlado</h2><p className="mt-2">La arquitectura ya lo contempla, pero los controles todavía no se habilitan para evitar acciones comerciales incompletas.</p><ul className="mt-4 list-disc space-y-2 pl-5">{(PLANNED[section] || []).map((item) => <li key={item}>{item}</li>)}</ul></div>;
}

function Loading() { return <div className="flex min-h-[240px] items-center justify-center text-gray-500"><Loader2 className="mr-2 h-6 w-6 animate-spin" />Cargando…</div>; }
function EmptyState({ title }) { return <div className="p-8 text-center text-sm text-gray-500"><MessageCircle className="mx-auto mb-2 h-8 w-8 opacity-40" />{title}</div>; }

export default function WhatsAppCenter() {
  const [section, setSection] = useState('summary');
  const [health, setHealth] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const loadHealth = useCallback(async () => {
    setHealthLoading(true);
    try { setHealth(await callAdmin('health')); } catch (error) { toast.error(error.message); } finally { setHealthLoading(false); }
  }, []);
  useEffect(() => { loadHealth(); }, [loadHealth]);
  const content = section === 'summary' ? <Summary health={health} loading={healthLoading} reload={loadHealth} />
    : section === 'inbox' ? <InboxView /> : section === 'contacts' ? <ContactabilityView />
      : section === 'consent' ? <ConsentAcquisitionView />
      : section === 'templates' ? <TemplatesView />
        : section === 'campaigns' ? <CampaignReadinessView />
          : section === 'agent' ? <MetaBusinessAgentView /> : section === 'diagnostics' ? <DiagnosticsView /> : section === 'guide' ? <GuideView /> : <PlannedView section={section} />;
  const badge = environmentBadge(health);
  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-600 p-2 text-white"><MessageCircle className="h-7 w-7" /></span><div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">WhatsApp Center</h1><p className="text-gray-500">Operación segura de WhatsApp Cloud API dentro del CRM.</p></div></div></div><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></div>
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 dark:border-gray-700 dark:bg-gray-800">{NAVIGATION.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${section === id ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{React.createElement(Icon, { className: 'h-4 w-4' })}{label}</button>)}</div>
    {content}
  </div>;
}
