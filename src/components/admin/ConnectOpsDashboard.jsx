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
  ShieldCheck
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: campaignRows, error: campaignError }, { data: runRows, error: runError }, { count: leadCount, error: leadError }] = await Promise.all([
        supabase
          .from('connect_campaigns')
          .select('id, package_name, billing_email, payment_status, fulfillment_status, batch_size, launch_price_mxn, created_at, updated_at')
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
                    <th className="px-4 py-3 text-left font-semibold text-gray-600">Guardar</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {campaigns.map((campaign) => {
                    const draft = draftStatuses[campaign.id] || campaign;
                    return (
                      <tr key={campaign.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-gray-900">{campaign.package_name}</p>
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
