import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CircleDollarSign,
  ClipboardList,
  Loader2,
  RefreshCw,
  Scale,
  ShieldCheck,
  Workflow
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const PAYMENT_OPTIONS = ['pending', 'paid', 'failed', 'refunded', 'expired'];
const FULFILLMENT_OPTIONS = [
  'intake',
  'brief_review',
  'audience_build',
  'copy_ready',
  'scheduled',
  'running',
  'reported',
  'closed'
];

const formatCurrency = (amount = 0) => {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(Number(amount) || 0);
  } catch (_error) {
    return `$${Number(amount || 0).toFixed(2)} MXN`;
  }
};

const formatPct = (value = 0) => `${Number(value || 0).toFixed(1)}%`;

const getOperationalStep = (campaign, hasRuns) => {
  if (!campaign) {
    return {
      title: 'Sin campana seleccionada',
      description: 'Selecciona una reserva para ver el estado real del servicio.',
      nextAction: 'Elegir una reserva del pipeline.'
    };
  }

  const status = campaign.fulfillment_status || 'intake';

  if (campaign.payment_status !== 'paid') {
    return {
      title: 'Confirmacion de reserva',
      description: 'El anticipo aun no aparece como pagado o sigue en validacion.',
      nextAction: 'Confirmar pago, registrar responsable y enviar acuse al cliente.'
    };
  }

  if (status === 'intake' || status === 'brief_review') {
    return {
      title: 'Kickoff y brief',
      description: 'Estamos validando objetivo, ICP, cobertura geografica, oferta y restricciones.',
      nextAction: 'Cerrar brief aprobado antes de preparar audiencia o copy.'
    };
  }

  if (status === 'audience_build') {
    return {
      title: 'Compliance y audiencia',
      description: 'Se estan filtrando contactos elegibles, exclusiones, duplicados y dominios vetados.',
      nextAction: 'Dejar aprobada la audiencia utilizable y documentar exclusiones.'
    };
  }

  if (status === 'copy_ready' || status === 'scheduled') {
    return {
      title: 'Salida preparada',
      description: 'La campana ya tiene audiencia y copy listos para programarse en lote controlado.',
      nextAction: 'Autorizar la salida y registrar la corrida inicial en connect_campaign_runs.'
    };
  }

  if (status === 'running') {
    return {
      title: 'Campana en ejecucion',
      description: hasRuns
        ? 'Ya existen corridas registradas y el servicio esta generando trazabilidad real.'
        : 'El estado dice running, pero aun falta registrar corridas para dejar trazabilidad operativa.',
      nextAction: hasRuns
        ? 'Monitorear respuestas, rebotes y siguiente ajuste comercial.'
        : 'Registrar la corrida activa y validar que el lote realmente este saliendo.'
    };
  }

  if (status === 'reported' || status === 'closed') {
    return {
      title: 'Reporte y cierre',
      description: 'La fase operativa principal ya concluyo y toca compartir resultados y siguiente paso.',
      nextAction: 'Entregar resumen, aprendizajes y propuesta de continuidad o cierre.'
    };
  }

  return {
    title: 'Operacion Connect',
    description: 'La campana esta en seguimiento operativo.',
    nextAction: 'Revisar si el estado actual coincide con la realidad del servicio.'
  };
};

const CONNECT_TIMELINE = [
  { key: 'reservation', title: 'Reserva', description: 'Anticipo registrado y capacidad apartada.' },
  { key: 'brief', title: 'Brief aprobado', description: 'Objetivo, ICP y restricciones validadas.' },
  { key: 'audience', title: 'Audiencia y compliance', description: 'Segmento utilizable y exclusions documentadas.' },
  { key: 'launch', title: 'Salida controlada', description: 'Copy, remitente y lote autorizados para ejecucion.' },
  { key: 'report', title: 'Reporte y postventa', description: 'KPIs, respuestas y siguiente accion compartidos.' }
];

const statusBadge = (value) => {
  const palette = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    refunded: 'bg-slate-100 text-slate-700 border-slate-200',
    expired: 'bg-gray-100 text-gray-700 border-gray-200',
    intake: 'bg-slate-100 text-slate-700 border-slate-200',
    brief_review: 'bg-blue-50 text-blue-700 border-blue-200',
    audience_build: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    copy_ready: 'bg-violet-50 text-violet-700 border-violet-200',
    scheduled: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    running: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    reported: 'bg-teal-50 text-teal-700 border-teal-200',
    closed: 'bg-gray-100 text-gray-700 border-gray-200'
  };

  return palette[value] || 'bg-gray-100 text-gray-700 border-gray-200';
};

const ConnectOpsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [runs, setRuns] = useState([]);
  const [connectLeadCount, setConnectLeadCount] = useState(0);
  const [draftStatuses, setDraftStatuses] = useState({});
  const [selectedCampaignId, setSelectedCampaignId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: campaignRows, error: campaignError }, { data: runRows, error: runError }, { data: leadRows, count: leadCount, error: leadError }] = await Promise.all([
        supabase
          .from('connect_campaigns')
          .select('id, package_name, billing_email, payment_status, fulfillment_status, batch_size, launch_price_mxn, created_at, updated_at, client_account_id, enterprise_lead_id, connect_client_accounts(company_name, primary_contact_email, country, status), enterprise_leads(company_name, contact_name, country, target_cities)')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('connect_campaign_runs')
          .select('id, connect_campaign_id, requested_contacts, approved_contacts, sent_contacts, replied_contacts, bounced_contacts, opened_contacts, clicked_contacts, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('enterprise_leads')
          .select('*', { count: 'exact', head: true })
          .eq('service_line', 'geobooker_connect')
      ]);

      if (campaignError) throw campaignError;
      if (runError) throw runError;
      if (leadError) throw leadError;

      const safeCampaigns = campaignRows || [];
      setCampaigns(safeCampaigns);
      setRuns(runRows || []);
      setConnectLeadCount(leadCount || 0);
      setSelectedCampaignId((current) => {
        if (safeCampaigns.some((campaign) => campaign.id === current)) {
          return current;
        }

        return safeCampaigns[0]?.id || null;
      });
      setDraftStatuses(
        safeCampaigns.reduce((acc, campaign) => {
          acc[campaign.id] = {
            payment_status: campaign.payment_status,
            fulfillment_status: campaign.fulfillment_status
          };
          return acc;
        }, {})
      );
    } catch (error) {
      console.error('[ConnectOpsDashboard] Error loading data:', error);
      toast.error('No pudimos cargar la operacion de Geobooker Connect.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const paidCampaigns = campaigns.filter((item) => item.payment_status === 'paid');
    const activeCampaigns = campaigns.filter((item) =>
      ['brief_review', 'audience_build', 'copy_ready', 'scheduled', 'running'].includes(item.fulfillment_status)
    );

    const totals = runs.reduce((acc, run) => {
      acc.requested += Number(run.requested_contacts || 0);
      acc.approved += Number(run.approved_contacts || 0);
      acc.sent += Number(run.sent_contacts || 0);
      acc.replied += Number(run.replied_contacts || 0);
      acc.bounced += Number(run.bounced_contacts || 0);
      acc.opened += Number(run.opened_contacts || 0);
      acc.clicked += Number(run.clicked_contacts || 0);
      return acc;
    }, {
      requested: 0,
      approved: 0,
      sent: 0,
      replied: 0,
      bounced: 0,
      opened: 0,
      clicked: 0
    });

    return {
      reservedRevenue: paidCampaigns.reduce((sum, item) => sum + Number(item.launch_price_mxn || 0), 0),
      paidCount: paidCampaigns.length,
      activeCount: activeCampaigns.length,
      totalCampaigns: campaigns.length,
      ...totals,
      openRate: totals.sent ? (totals.opened / totals.sent) * 100 : 0,
      replyRate: totals.sent ? (totals.replied / totals.sent) * 100 : 0,
      clickRate: totals.sent ? (totals.clicked / totals.sent) * 100 : 0,
      bounceRate: totals.sent ? (totals.bounced / totals.sent) * 100 : 0
    };
  }, [campaigns, runs]);

  const selectedCampaign = campaigns.find((campaign) => campaign.id === selectedCampaignId) || null;
  const selectedCampaignCompanyName = selectedCampaign?.connect_client_accounts?.company_name || selectedCampaign?.enterprise_leads?.company_name || 'Empresa por confirmar';
  const selectedCampaignCountry = selectedCampaign?.connect_client_accounts?.country || selectedCampaign?.enterprise_leads?.country || 'Mexico';
  const selectedRuns = runs.filter((run) => run.connect_campaign_id === selectedCampaignId);
  const latestRun = selectedRuns[0] || null;

  const updateDraft = (campaignId, field, value) => {
    setDraftStatuses((prev) => ({
      ...prev,
      [campaignId]: {
        ...prev[campaignId],
        [field]: value
      }
    }));
  };

  const saveStatuses = async (campaignId) => {
    const payload = draftStatuses[campaignId];
    if (!payload) return;

    setSavingId(campaignId);
    try {
      const { error } = await supabase
        .from('connect_campaigns')
        .update({
          payment_status: payload.payment_status,
          fulfillment_status: payload.fulfillment_status
        })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Estado de Connect actualizado.');
      await loadData();
    } catch (error) {
      console.error('[ConnectOpsDashboard] Error updating status:', error);
      toast.error('No pudimos guardar el estado de la campana Connect.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseBusiness className="w-6 h-6 text-emerald-600" />
            Geobooker Connect Ops
          </h2>
          <p className="text-sm text-gray-500">
            Reservas, postventa, cumplimiento y KPIs del servicio gestionado.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Actualizar
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CircleDollarSign className="w-4 h-4 text-emerald-600" />
            Revenue reservado
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{formatCurrency(stats.reservedRevenue)}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.paidCount} reservas pagadas</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ClipboardList className="w-4 h-4 text-blue-600" />
            Pipeline activo
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{stats.activeCount}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.totalCampaigns} campanas registradas</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4 text-cyan-600" />
            Contactos enviados
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{stats.sent.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.approved.toLocaleString('es-MX')} aprobados para salida</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BadgeCheck className="w-4 h-4 text-violet-600" />
            Briefs Connect
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{connectLeadCount.toLocaleString('es-MX')}</p>
          <p className="text-xs text-gray-500 mt-2">Leads intake ligados a Connect</p>
        </div>
      </div>

      <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-6">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              KPIs entregables del servicio
            </h3>
            <div className="grid md:grid-cols-4 gap-4 mt-5">
              <div className="rounded-xl bg-slate-50 border p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Open rate</p>
                <p className="text-2xl font-black text-gray-900 mt-2">{formatPct(stats.openRate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Reply rate</p>
                <p className="text-2xl font-black text-gray-900 mt-2">{formatPct(stats.replyRate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">CTR</p>
                <p className="text-2xl font-black text-gray-900 mt-2">{formatPct(stats.clickRate)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">Bounce rate</p>
                <p className="text-2xl font-black text-gray-900 mt-2">{formatPct(stats.bounceRate)}</p>
              </div>
            </div>
            <div className="mt-5 grid md:grid-cols-2 gap-4 text-sm">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                <p className="font-semibold">Lo que si prometemos medir</p>
                <p className="mt-2">Contactos aprobados, enviados, aperturas, clics, respuestas, rebotes y exclusiones aplicadas.</p>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                <p className="font-semibold">Lo que no debemos prometer como garantia</p>
                <p className="mt-2">Ventas cerradas, reuniones, 99% de entregabilidad universal o volumen sin validacion de brief y compliance.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-emerald-600" />
              Postventa operativa recomendada
            </h3>
            <div className="mt-5 grid md:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-semibold text-gray-900">0. Confirmacion de reserva</p>
                <p className="mt-2">Pago registrado, acuse por correo y responsable interno asignado.</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-semibold text-gray-900">1. Kickoff y brief</p>
                <p className="mt-2">Validar giro, ICP, cobertura, oferta, exclusions, objetivo y materiales.</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-semibold text-gray-900">2. Compliance y audiencia</p>
                <p className="mt-2">Filtrar segmentos sensibles, duplicados, dominios vetados y supresiones por cliente.</p>
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                <p className="font-semibold text-gray-900">3. Salida y reporte</p>
                <p className="mt-2">Ejecutar lote controlado, registrar corridas y compartir reporte con siguientes acciones.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Briefs iniciales sin reserva</h3>
              <p className="text-sm text-gray-500 mt-1">Prospectos Connect que pidieron evaluacion antes de pagar. Sirven para precalificar y llevarlos a reserva.</p>
            </div>
            <div className="divide-y">
              {connectLeads.map((lead) => {
                let meta = {};
                try { meta = JSON.parse(lead.message || '{}'); } catch (_error) { meta = {}; }
                return (
                  <div key={lead.id} className="p-5 grid lg:grid-cols-[1fr_0.85fr_auto] gap-4 items-start">
                    <div>
                      <p className="font-bold text-gray-900">{lead.company_name || 'Empresa sin nombre'}</p>
                      <p className="text-sm text-gray-600 mt-1">{lead.contact_name || 'Contacto por confirmar'} - {lead.contact_email}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(lead.created_at).toLocaleString('es-MX')}</p>
                    </div>
                    <div className="text-sm text-gray-700">
                      <p><span className="font-semibold">Audiencia:</span> {meta.target_audience || lead.target_cities || 'Pendiente'}</p>
                      <p className="mt-1"><span className="font-semibold">Paquete:</span> {meta.package_name || lead.selected_plan || 'Piloto Connect'}</p>
                      <p className="mt-1 text-xs text-gray-500">{meta.notes || 'Sin objetivo detallado todavia.'}</p>
                    </div>
                    <div className="flex flex-col gap-2 lg:items-end">
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">brief inicial</span>
                      <a
                        href={`mailto:${lead.contact_email}?subject=Geobooker Connect - siguiente paso&body=Hola, recibimos tu brief de Geobooker Connect y queremos validar audiencia, copy y viabilidad operativa.`}
                        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                      >
                        Responder
                      </a>
                    </div>
                  </div>
                );
              })}
              {!loading && connectLeads.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">Aun no hay briefs iniciales Connect registrados.</div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-gray-900">Reservas y pipeline reciente</h3>
              <p className="text-sm text-gray-500 mt-1">Centro simple para seguimiento de Connect sin mezclarlo con Ads.</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Paquete</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Pago</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Fulfillment</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Batch</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign) => {
                    const draft = draftStatuses[campaign.id] || campaign;
                    return (
                      <tr key={campaign.id} className={selectedCampaignId === campaign.id ? 'bg-emerald-50/60 hover:bg-emerald-50' : 'hover:bg-gray-50'}>
                        <td className="px-4 py-3">
                          <button onClick={() => setSelectedCampaignId(campaign.id)} className="text-left">
                            <p className="font-semibold text-gray-900">{campaign.package_name}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {campaign.connect_client_accounts?.company_name || campaign.enterprise_leads?.company_name || 'Empresa por confirmar'}
                            </p>
                          </button>
                          <p className="text-xs text-gray-500 mt-1">{new Date(campaign.created_at).toLocaleString('es-MX')}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{campaign.billing_email}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(draft.payment_status)}`}>
                            {draft.payment_status}
                          </div>
                          <select
                            value={draft.payment_status}
                            onChange={(event) => updateDraft(campaign.id, 'payment_status', event.target.value)}
                            className="mt-2 w-full rounded-lg border px-3 py-2 bg-white"
                          >
                            {PAYMENT_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(draft.fulfillment_status)}`}>
                            {draft.fulfillment_status}
                          </div>
                          <select
                            value={draft.fulfillment_status}
                            onChange={(event) => updateDraft(campaign.id, 'fulfillment_status', event.target.value)}
                            className="mt-2 w-full rounded-lg border px-3 py-2 bg-white"
                          >
                            {FULFILLMENT_OPTIONS.map((option) => (
                              <option key={option} value={option}>{option}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {Number(campaign.batch_size || 0).toLocaleString('es-MX')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(campaign.launch_price_mxn)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => saveStatuses(campaign.id)}
                            disabled={savingId === campaign.id}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-white font-semibold hover:bg-emerald-500 disabled:opacity-60"
                          >
                            {savingId === campaign.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Guardar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && campaigns.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-4 py-10 text-center text-gray-500">
                        Aun no hay reservas Connect registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyan-600" />
              Campana seleccionada
            </h3>
            {selectedCampaign ? (
              <div className="mt-4 space-y-4 text-sm text-gray-700">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Cuenta</p>
                  <p className="mt-2 text-base font-semibold text-gray-900">{selectedCampaign.package_name}</p>
                  <p className="mt-1 text-sm font-medium text-gray-700">{selectedCampaignCompanyName}</p>
                  <p className="mt-1 text-sm text-gray-600">{selectedCampaign.billing_email}</p>
                  <p className="mt-1 text-xs text-gray-500">Pais / mercado: {selectedCampaignCountry}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Pago</p>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(selectedCampaign.payment_status)}`}>
                      {selectedCampaign.payment_status}
                    </div>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Fulfillment</p>
                    <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadge(selectedCampaign.fulfillment_status)}`}>
                      {selectedCampaign.fulfillment_status}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Monto reservado</p>
                    <p className="mt-2 text-xl font-black text-gray-900">{formatCurrency(selectedCampaign.launch_price_mxn)}</p>
                  </div>
                  <div className="rounded-xl border bg-white p-4">
                    <p className="text-xs uppercase tracking-wide text-gray-500">Batch solicitado</p>
                    <p className="mt-2 text-xl font-black text-gray-900">{Number(selectedCampaign.batch_size || 0).toLocaleString('es-MX')}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
                  <p className="font-semibold">Como se opera desde aqui</p>
                  <p className="mt-2">Selecciona una reserva del pipeline, ajusta pago o fulfillment y guarda cambios. La ejecucion real de envios y el registro de corridas vive en <code>connect_campaign_runs</code> y en las colas del CRM.</p>
                  <p className="mt-2 text-sm">
                    Cuenta cliente vinculada: {selectedCampaign.connect_client_accounts?.primary_contact_email || 'Pendiente de vincular o backfill'}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                  <p className="font-semibold">Siguiente paso recomendado</p>
                  <p className="mt-2 text-sm">{operationalStep.nextAction}</p>
                </div>
                <div className="rounded-xl border bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-gray-500">Corridas registradas</p>
                  <p className="mt-2 text-xl font-black text-gray-900">{selectedRuns.length.toLocaleString('es-MX')}</p>
                  {latestRun ? (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-gray-500">Ultima corrida</p>
                        <p className="font-semibold text-gray-900">{new Date(latestRun.created_at).toLocaleString('es-MX')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Enviados</p>
                        <p className="font-semibold text-gray-900">{Number(latestRun.sent_contacts || 0).toLocaleString('es-MX')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Aprobados</p>
                        <p className="font-semibold text-gray-900">{Number(latestRun.approved_contacts || 0).toLocaleString('es-MX')}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Respuestas</p>
                        <p className="font-semibold text-gray-900">{Number(latestRun.replied_contacts || 0).toLocaleString('es-MX')}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Aun no hay corridas registradas para esta reserva.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-sm text-gray-600">
                Aun no hay una campana seleccionada. Cuando exista una reserva Connect, aparecera aqui el contexto operativo.
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Workflow className="w-5 h-5 text-indigo-600" />
              Timeline operativa del servicio
            </h3>
            <div className="mt-4 space-y-3">
              {CONNECT_TIMELINE.map((step, index) => {
                const isCurrent = operationalStep.title === step.title || (operationalStep.title === 'Kickoff y brief' && step.key === 'brief') || (operationalStep.title === 'Compliance y audiencia' && step.key === 'audience') || (operationalStep.title === 'Salida preparada' && step.key === 'launch') || (operationalStep.title === 'Campana en ejecucion' && step.key === 'launch') || (operationalStep.title === 'Reporte y cierre' && step.key === 'report') || (operationalStep.title === 'Confirmacion de reserva' && step.key === 'reservation');
                return (
                  <div key={step.key} className={`rounded-xl border p-4 ${isCurrent ? 'border-indigo-200 bg-indigo-50' : 'bg-slate-50'}`}>
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isCurrent ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>{index + 1}</div>
                      <div>
                        <p className="font-semibold text-gray-900">{step.title}</p>
                        <p className="mt-1 text-sm text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Guardrails del servicio
            </h3>
            <div className="mt-4 space-y-3 text-sm text-gray-700">
              <div className="rounded-xl border bg-slate-50 p-4">
                Connect opera como servicio gestionado. No se entrega una base descargable al cliente.
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                Antes de ejecutar outreach se valida audiencia, copy, exclusions, reputacion de remitente y riesgo sectorial.
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                La reserva de lanzamiento es fee de activacion. El alcance final depende del brief aprobado.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-violet-600" />
              Resultados que debemos comunicar al cliente
            </h3>
            <div className="mt-4 grid gap-3 text-sm text-gray-700">
              <div className="rounded-xl border bg-emerald-50 border-emerald-200 p-4">
                Entregables claros: contactos aprobados, enviados, aperturas, clics, respuestas, rebotes y exclusiones aplicadas.
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                Resultado esperado: abrir conversaciones comerciales y validar mercado, no prometer cierres automaticos.
              </div>
              <div className="rounded-xl border bg-slate-50 p-4">
                El cliente compra un piloto gestionado con trazabilidad, no una base descargable ni volumen indiscriminado.
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Scale className="w-5 h-5 text-slate-700" />
              Marco legal informativo
            </h3>
            <div className="mt-4 space-y-4 text-sm text-gray-700">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
                Informativo: esto no sustituye asesoria legal. Conviene validar terminos finales, aviso de privacidad y outreach sectorial con tu asesor.
              </div>
              <ul className="space-y-3">
                <li className="rounded-xl border bg-slate-50 p-4">Debe existir trazabilidad de origen del contacto, exclusiones y solicitudes de baja.</li>
                <li className="rounded-xl border bg-slate-50 p-4">No prometer uso indiscriminado de datos ni contactar categorias restringidas sin revision previa.</li>
                <li className="rounded-xl border bg-slate-50 p-4">Toda ejecucion debe respetar NDA, supresiones por cliente y politicas internas de reputacion de dominio.</li>
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-2xl border shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Riesgos a evitar
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-gray-700">
              <li className="rounded-xl border bg-rose-50 border-rose-200 p-4">Vender el servicio como “1000 correos garantizados con resultado” deteriora margen y expectativa.</li>
              <li className="rounded-xl border bg-rose-50 border-rose-200 p-4">Mezclar remitentes de Connect con los de Ads o postventa principal aumenta riesgo reputacional.</li>
              <li className="rounded-xl border bg-rose-50 border-rose-200 p-4">No registrar corridas en `connect_campaign_runs` deja a ventas y postventa sin trazabilidad real.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConnectOpsDashboard;
