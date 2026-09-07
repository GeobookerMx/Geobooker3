import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, BarChart3, BookOpen, Bot, CheckCircle2, ChevronLeft,
  ChevronRight, Clock3, ContactRound, FileText, HeartPulse, Inbox, Loader2,
  MessageCircle, Megaphone, RefreshCw, Search, Send, Settings, ShieldCheck,
  UsersRound, Workflow, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const NAVIGATION = [
  ['summary', 'Resumen', HeartPulse],
  ['inbox', 'Bandeja', Inbox],
  ['contacts', 'Contactos', ContactRound],
  ['templates', 'Plantillas', FileText],
  ['campaigns', 'Campañas', Megaphone],
  ['automations', 'Automatizaciones', Bot],
  ['followups', 'Seguimientos', Clock3],
  ['analytics', 'Analítica', BarChart3],
  ['settings', 'Configuración', Settings],
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

function formatDate(value) {
  if (!value) return 'Sin datos';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
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

async function callAdmin(action, params = {}) {
  const { data, error } = await supabase.functions.invoke('whatsapp-admin', { body: { action, ...params } });
  if (error) throw new Error(error.message || 'No fue posible consultar WhatsApp Center');
  if (data?.error) throw new Error(data.error);
  return data;
}

function Summary({ health, loading, reload }) {
  if (loading && !health) return <Loading />;
  if (!health) return <EmptyState title="No se pudo cargar el estado" />;
  const configured = health.configured || {};
  const webhookOk = Boolean(health.webhook?.signatureVerified && health.webhook?.status === 'processed');
  const metaOk = Boolean(health.meta?.token?.valid);
  const cards = [
    ['Meta API', metaOk ? 'Connected' : 'Error', health.metaError?.message || `Última comprobación: ${formatDate(health.meta?.checkedAt)}`, metaOk ? 'good' : 'bad'],
    ['System User Token', health.meta?.token?.valid ? 'Valid' : configured.accessToken ? 'Configured · invalid/unverified' : 'Missing', 'El token nunca se devuelve al navegador.', health.meta?.token?.valid ? 'good' : 'bad'],
    ['WhatsApp Business Account', health.meta?.waba?.accessible ? 'Accessible' : 'Error', health.meta?.waba?.name || health.metaError?.message || 'Sin respuesta de Meta', health.meta?.waba?.accessible ? 'good' : 'bad'],
    ['Phone Number', health.meta?.phone?.accessible ? 'Accessible' : 'Error', health.meta?.phone?.verifiedName || health.meta?.phone?.displayPhoneNumber || 'Sin respuesta de Meta', health.meta?.phone?.accessible ? 'good' : 'bad'],
    ['WABA Subscription', health.meta?.subscription?.subscribed ? 'Subscribed' : 'No confirmada', health.meta?.subscription?.accessible ? `${health.meta?.subscription?.appCount || 0} app(s) suscrita(s)` : 'Meta no permitió consultar subscribed_apps.', health.meta?.subscription?.subscribed ? 'good' : 'bad'],
    ['Graph API Version', health.graphApiVersion || 'Missing', 'Configuración central server-side.', health.graphApiVersion === 'v26.0' ? 'good' : 'warning'],
    ['Webhook', webhookOk ? 'Conectado' : health.webhook ? 'Requiere atención' : 'Sin eventos', `Último: ${formatDate(health.webhook?.lastReceivedAt)}`, webhookOk ? 'good' : 'warning'],
    ['HMAC Security', health.webhook?.signatureVerified ? 'Active' : 'Sin confirmación reciente', 'Validación obligatoria en POST.', health.webhook?.signatureVerified ? 'good' : 'warning'],
    ['Envíos', configured.sendingEnabled ? 'Habilitados' : 'Bloqueados', configured.sendingEnabled ? 'Kill switch abierto.' : 'No se enviarán mensajes reales.', configured.sendingEnabled ? 'warning' : 'good'],
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
        ['Mensajes hoy', health.metrics?.messagesToday || 0],
        ['Conversaciones abiertas', health.metrics?.openConversations || 0],
        ['Seguimientos vencidos', health.metrics?.followupsDue || 0],
        ['Plantillas aprobadas', health.metrics?.templates?.approved || 0],
        ['Jobs en retry', health.metrics?.outboundQueue?.retry || 0],
        ['Dead letters', health.metrics?.outboundQueue?.deadLetter || 0]
      ].map(([label, value]) => <div key={label} className="rounded-2xl bg-gray-900 p-5 text-white"><p className="text-sm text-gray-300">{label}</p><p className="mt-2 text-3xl font-bold">{Number(value).toLocaleString()}</p></div>)}
    </div>
    <div className="grid gap-4 lg:grid-cols-3">
      <IntegrationCard label="Último mensaje entrante" value={formatDate(health.metrics?.lastIncomingAt)} tone={health.metrics?.lastIncomingAt ? 'good' : 'warning'} />
      <IntegrationCard label="Último mensaje saliente" value={formatDate(health.metrics?.lastOutgoingAt)} tone={health.metrics?.lastOutgoingAt ? 'good' : 'warning'} />
      <IntegrationCard label="Próximo job vencido" value={formatDate(health.metrics?.outboundQueue?.oldestDueAt)} detail="Sólo se procesa cuando el worker está desplegado y el kill switch se abre." tone={health.metrics?.outboundQueue?.oldestDueAt ? 'warning' : 'good'} />
      <IntegrationCard label="Último error" value={health.lastMessageError?.code || health.webhook?.lastError || 'Ninguno registrado'} detail={health.lastMessageError?.detail} tone={health.lastMessageError || health.webhook?.lastError ? 'bad' : 'good'} />
    </div>
    <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800"><p className="font-bold">Permisos del System User</p><div className="mt-3 flex flex-wrap gap-2">{['business_management', 'whatsapp_business_messaging', 'whatsapp_business_management'].map((permission) => <StatusBadge key={permission} tone={health.meta?.permissions?.[permission] ? 'good' : 'bad'}>{permission}: {health.meta?.permissions?.[permission] ? 'PASS' : 'FAIL'}</StatusBadge>)}</div></div>
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
          <p className="truncate text-xs text-gray-500">{row.account?.display_name || row.contactPoint?.normalized_value || 'Sin empresa'}</p>
          <p className="mt-2 truncate text-sm text-gray-600 dark:text-gray-300">{row.lastMessage?.body_text || `[${row.lastMessage?.message_type || 'sin mensajes'}]`}</p>
          <div className="mt-2 flex justify-between text-[11px] text-gray-400"><span>{row.status}</span><span>{formatDate(row.last_message_at)}</span></div>
        </button>)}</div>
        <div className="flex items-center justify-between border-t p-3 text-sm dark:border-gray-700"><button disabled={page === 0} onClick={() => setPage((value) => value - 1)} className="disabled:opacity-30"><ChevronLeft /></button><span>Página {page + 1}</span><button disabled={(page + 1) * 25 >= total} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-30"><ChevronRight /></button></div>
      </div>
      <div className="flex min-h-[620px] flex-col bg-gray-50 dark:bg-gray-900">
        {detailLoading ? <Loading /> : !detail ? <EmptyState title="Selecciona una conversación" /> : <>
          <div className="border-b bg-white p-4 dark:border-gray-700 dark:bg-gray-800"><p className="font-bold">{detail.contact?.full_name || 'Contacto provisional'}</p><p className="text-xs text-gray-500">{detail.account?.display_name || detail.contactPoint?.normalized_value}</p></div>
          <div className="flex-1 space-y-3 overflow-y-auto p-4">{detail.messages?.map((message) => <div key={message.id} className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-4 py-3 shadow-sm ${message.direction === 'outbound' ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800'}`}>
            <p className="whitespace-pre-wrap text-sm">{message.body_text || `[${message.message_type}]`}</p><div className={`mt-2 flex gap-2 text-[11px] ${message.direction === 'outbound' ? 'text-emerald-100' : 'text-gray-400'}`}><span>{formatDate(message.provider_timestamp || message.created_at)}</span><span>{message.current_status}</span></div>
            {message.failure_code && <p className="mt-1 text-xs text-red-200">Error {message.failure_code}: {message.failure_detail}</p>}
          </div></div>)}</div>
          <div className="space-y-3 border-t bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setMessageType('text')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${messageType === 'text' ? 'bg-emerald-600 text-white' : 'border'}`}>Texto</button><button type="button" onClick={() => setMessageType('template')} className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${messageType === 'template' ? 'bg-emerald-600 text-white' : 'border'}`}>Template</button><button type="button" disabled className="rounded-lg border px-3 py-1.5 text-sm opacity-50">Adjuntar</button></div>
            {messageType === 'template' && <select value={templateId} onChange={(event) => setTemplateId(event.target.value)} className="w-full rounded-xl border bg-white px-3 py-2 text-sm dark:bg-gray-900"><option value="">Selecciona una plantilla aprobada</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.template_name} · {template.language_code}</option>)}</select>}
            <textarea value={draftText} onChange={(event) => setDraftText(event.target.value.slice(0, 4096))} rows="3" placeholder={messageType === 'text' ? 'Escribe una respuesta…' : 'Vista previa de variables (el envío permanece bloqueado)'} className="w-full resize-none rounded-xl border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900" />
            <div className="flex items-start gap-2 rounded-xl border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1"><p className="font-semibold">{eligibilityLoading ? 'Evaluando…' : sendEligibility?.canSend ? 'CAN SEND' : 'SENDING DISABLED'}</p><p className="text-xs text-gray-500">{sendEligibility?.checks?.serviceWindowOpen ? `Ventana de servicio abierta hasta ${formatDate(sendEligibility.serviceWindowExpiresAt)}` : 'Ventana de servicio cerrada.'}</p>{sendEligibility?.reasons?.length > 0 && <ul className="mt-1 list-disc pl-4 text-xs text-amber-700">{sendEligibility.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}</div><button type="button" disabled className="inline-flex items-center gap-2 rounded-lg bg-gray-300 px-3 py-2 font-bold text-gray-600"><Send className="h-4 w-4" />TEST MODE</button></div>
            <div className="flex justify-between text-xs text-gray-400"><span>{eligibility.label}</span><span>{draftText.length}/4096</span></div>
          </div>
        </>}
      </div>
      <div className="border-l p-4 dark:border-gray-700">{detail ? <div className="space-y-5">
        <div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Contacto CRM</p><h3 className="mt-2 text-xl font-bold">{detail.contact?.full_name || 'Provisional'}</h3><p className="text-sm text-gray-500">{detail.contact?.job_title || 'Sin cargo'}</p></div>
        <StatusBadge tone={eligibility.tone}>{eligibility.label}</StatusBadge>
        <dl className="space-y-3 text-sm">{[
          ['Empresa', detail.account?.display_name], ['Industria', detail.account?.industry], ['País / ciudad', [detail.account?.country_code, detail.account?.city].filter(Boolean).join(' · ')], ['Prioridad', detail.conversation?.priority], ['Estado', detail.conversation?.status], ['Teléfono', detail.contactPoint?.normalized_value], ['Validación', detail.contactPoint?.validation_status], ['Ventana 24 h', detail.conversation?.service_window_expires_at ? formatDate(detail.conversation.service_window_expires_at) : null]
        ].map(([label, value]) => <div key={label}><dt className="text-gray-400">{label}</dt><dd className="font-medium">{value || 'Sin datos'}</dd></div>)}</dl>
        <div><p className="text-xs font-bold uppercase tracking-wide text-gray-400">Actividad reciente</p><div className="mt-2 space-y-2">{detail.activities?.slice(0, 5).map((activity) => <div key={activity.id} className="rounded-lg bg-gray-50 p-2 text-xs dark:bg-gray-900"><p className="font-semibold">{activity.summary}</p><p className="text-gray-400">{formatDate(activity.occurred_at)}</p></div>)}</div></div>
      </div> : <EmptyState title="Sin contacto seleccionado" />}</div>
    </div>
  </div>;
}

function TemplatesView() {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [syncing, setSyncing] = useState(false);
  const load = useCallback(() => { setLoading(true); return callAdmin('templates').then((result) => setRows(result.rows || [])).catch((error) => toast.error(error.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  const sync = async () => { setSyncing(true); try { const result = await callAdmin('sync_templates'); toast.success(`${result.count} plantillas sincronizadas desde Meta`); await load(); } catch (error) { toast.error(error.message); } finally { setSyncing(false); } };
  if (loading) return <Loading />;
  return <div className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">Plantillas sincronizadas</h2><p className="text-sm text-gray-500">Estados reales almacenados del WABA. Esta vista no crea plantillas todavía.</p></div><button type="button" onClick={sync} disabled={syncing} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />SYNC FROM META</button></div><div className="overflow-x-auto rounded-2xl border bg-white dark:bg-gray-800"><table className="min-w-full text-sm"><thead className="bg-gray-50 text-left dark:bg-gray-900"><tr>{['Nombre', 'Idioma', 'Categoría', 'Estado Meta', 'Variables', 'Calidad', 'Última sincronización'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody className="divide-y dark:divide-gray-700">{rows.map((row) => <tr key={row.id}><td className="px-4 py-3 font-semibold">{row.template_name}</td><td className="px-4 py-3">{row.language_code}</td><td className="px-4 py-3">{row.category}</td><td className="px-4 py-3"><StatusBadge tone={row.approval_status === 'approved' ? 'good' : row.approval_status === 'rejected' ? 'bad' : 'warning'}>{row.provider_status || row.approval_status}</StatusBadge></td><td className="px-4 py-3">{row.variables?.join(', ') || '—'}</td><td className="px-4 py-3">{row.quality_score || 'Sin datos'}</td><td className="px-4 py-3">{formatDate(row.last_synced_at || row.provider_updated_at || row.updated_at)}</td></tr>)}{!rows.length && <tr><td colSpan="7"><EmptyState title="Aún no hay plantillas sincronizadas" /></td></tr>}</tbody></table></div></div>;
}

function DiagnosticsView() {
  const [data, setData] = useState(null); const [loading, setLoading] = useState(true);
  const load = useCallback(() => { setLoading(true); callAdmin('diagnostics').then(setData).catch((error) => toast.error(error.message)).finally(() => setLoading(false)); }, []);
  useEffect(() => { load(); }, [load]);
  if (loading && !data) return <Loading />;
  const items = [
    ...(data?.webhooks || []).map((row) => ({ key: `w-${row.id}`, type: 'Webhook', code: row.processing_status, detail: row.last_error, date: row.received_at })),
    ...(data?.messages || []).map((row) => ({ key: `m-${row.id}`, type: 'Mensaje', code: row.failure_code || row.current_status, detail: row.failure_detail, date: row.updated_at })),
    ...(data?.jobs || []).map((row) => ({ key: `j-${row.id}`, type: 'Cola', code: row.last_error_code || row.status, detail: row.last_error_detail, date: row.updated_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  return <div className="space-y-4"><div className="flex items-center justify-between"><div><h2 className="text-2xl font-bold">Centro de diagnóstico</h2><p className="text-sm text-gray-500">Errores recientes sin secrets ni payloads sensibles.</p></div><button onClick={load} className="rounded-xl border p-2"><RefreshCw className="h-4 w-4" /></button></div>{!items.length ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-900"><CheckCircle2 className="mb-2 h-7 w-7" /><p className="font-bold">Sin errores operativos registrados</p></div> : <div className="space-y-3">{items.map((item) => <div key={item.key} className="rounded-xl border border-red-200 bg-red-50 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-red-900">{item.type}: {item.code}</p><span className="text-xs text-red-700">{formatDate(item.date)}</span></div><p className="mt-1 text-sm text-red-800">{item.detail || 'Meta o el backend no proporcionaron más detalle.'}</p><p className="mt-2 text-xs font-semibold text-red-900">Acción sugerida: verificar elegibilidad, configuración y el estado del proveedor antes de reintentar.</p></div>)}</div>}</div>;
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
    : section === 'inbox' ? <InboxView /> : section === 'templates' ? <TemplatesView />
      : section === 'diagnostics' ? <DiagnosticsView /> : section === 'guide' ? <GuideView /> : <PlannedView section={section} />;
  return <div className="mx-auto max-w-[1600px] space-y-5 p-4 md:p-6">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex items-center gap-3"><span className="rounded-2xl bg-emerald-600 p-2 text-white"><MessageCircle className="h-7 w-7" /></span><div><h1 className="text-3xl font-bold text-gray-900 dark:text-white">WhatsApp Center</h1><p className="text-gray-500">Operación segura de WhatsApp Cloud API dentro del CRM.</p></div></div></div><StatusBadge tone={health?.mode === 'production' ? 'good' : 'warning'}>{health?.mode === 'production' ? 'PRODUCTION' : 'TEST MODE'}</StatusBadge></div>
    <div className="flex gap-2 overflow-x-auto rounded-2xl border bg-white p-2 dark:border-gray-700 dark:bg-gray-800">{NAVIGATION.map(([id, label, Icon]) => <button key={id} onClick={() => setSection(id)} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${section === id ? 'bg-emerald-600 text-white' : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}>{React.createElement(Icon, { className: 'h-4 w-4' })}{label}</button>)}</div>
    {content}
  </div>;
}
