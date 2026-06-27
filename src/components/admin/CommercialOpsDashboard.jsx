import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, RefreshCw, DollarSign, BriefcaseBusiness, Receipt, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const CRM_STATUS_OPTIONS = ['new', 'reviewing', 'fulfilled', 'invoiced', 'closed'];

const formatCurrency = (amount = 0, currency = 'MXN') => {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(Number(amount) || 0);
  } catch (_error) {
    return `$${Number(amount || 0).toFixed(2)} ${currency}`;
  }
};

const badgeClass = (value) => {
  const map = {
    paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    failed: 'bg-rose-50 text-rose-700 border-rose-200',
    expired: 'bg-gray-100 text-gray-700 border-gray-200',
    refunded: 'bg-slate-100 text-slate-700 border-slate-200',
    pending_review: 'bg-blue-50 text-blue-700 border-blue-200',
    brief_review: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    new: 'bg-slate-100 text-slate-700 border-slate-200',
    reviewing: 'bg-blue-50 text-blue-700 border-blue-200',
    fulfilled: 'bg-violet-50 text-violet-700 border-violet-200',
    invoiced: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    domestic_mx: 'bg-orange-50 text-orange-700 border-orange-200',
    export_0_iva: 'bg-slate-100 text-slate-700 border-slate-200'
  };

  return map[value] || 'bg-gray-100 text-gray-700 border-gray-200';
};

export default function CommercialOpsDashboard() {
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [rows, setRows] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [tableAvailable, setTableAvailable] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_commercial_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const safeRows = data || [];
      setRows(safeRows);
      setDrafts(
        safeRows.reduce((acc, item) => {
          acc[item.id] = {
            crm_status: item.crm_status || 'new'
          };
          return acc;
        }, {})
      );
      setTableAvailable(true);
    } catch (error) {
      console.error('[CommercialOpsDashboard] Error loading commercial events:', error);
      setTableAvailable(false);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const paid = rows.filter((item) => item.payment_status === 'paid');
    const domestic = rows.filter((item) => item.tax_status === 'domestic_mx');
    const connect = rows.filter((item) => item.source_type === 'connect_campaign');
    const ads = rows.filter((item) => item.source_type === 'ad_campaign');

    return {
      totalRevenue: paid.reduce((sum, item) => sum + Number(item.amount || 0), 0),
      totalPaid: paid.length,
      domesticCount: domestic.length,
      connectCount: connect.length,
      adsCount: ads.length
    };
  }, [rows]);

  const updateDraft = (id, value) => {
    setDrafts((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        crm_status: value
      }
    }));
  };

  const saveStatus = async (id) => {
    setSavingId(id);
    try {
      const { error } = await supabase
        .from('crm_commercial_events')
        .update({ crm_status: drafts[id]?.crm_status || 'new' })
        .eq('id', id);

      if (error) throw error;
      toast.success('Estado comercial actualizado.');
      await loadData();
    } catch (error) {
      console.error('[CommercialOpsDashboard] Error saving status:', error);
      toast.error('No pudimos guardar el estado comercial.');
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!tableAvailable) {
    return (
      <div className="bg-white rounded-2xl border p-6 space-y-3">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <BriefcaseBusiness className="w-5 h-5 text-blue-600" />
          Ventas y Operaciones
        </h3>
        <p className="text-sm text-gray-600">
          Aun no existe la tabla puente `crm_commercial_events`. Aplica primero el SQL de integracion comercial para ver compras de Stripe dentro del CRM.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BriefcaseBusiness className="w-6 h-6 text-blue-600" />
            Ventas y Operaciones
          </h3>
          <p className="text-sm text-gray-500">
            Compras pagadas desde Stripe integradas al CRM comercial de Geobooker.
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          <RefreshCw className="w-4 h-4" />
          Actualizar
        </button>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Revenue pagado
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{formatCurrency(stats.totalRevenue, 'MXN')}</p>
          <p className="text-xs text-gray-500 mt-2">Vista operativa consolidada</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BriefcaseBusiness className="w-4 h-4 text-blue-600" />
            Operaciones pagadas
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{stats.totalPaid}</p>
          <p className="text-xs text-gray-500 mt-2">Ads + Connect</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Receipt className="w-4 h-4 text-orange-600" />
            Con factura MX
          </div>
          <p className="text-3xl font-black text-gray-900 mt-3">{stats.domesticCount}</p>
          <p className="text-xs text-gray-500 mt-2">Domestic MX / control fiscal</p>
        </div>
        <div className="bg-white rounded-2xl border p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck className="w-4 h-4 text-violet-600" />
            Mix de servicio
          </div>
          <p className="text-sm font-semibold text-gray-900 mt-3">Ads: {stats.adsCount} · Connect: {stats.connectCount}</p>
          <p className="text-xs text-gray-500 mt-2">Separacion comercial clara</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h4 className="text-lg font-bold text-gray-900">Compras recientes integradas</h4>
          <p className="text-sm text-gray-500 mt-1">Aqui deben aparecer las compras pagadas aunque el CRM de marketing use otras tablas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Origen</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Cliente</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Pago</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Fiscal</th>
                <th className="px-4 py-3 text-right font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Operacion</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">CRM</th>
                <th className="px-4 py-3 text-left font-semibold text-gray-600">Guardar</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.source_type}</div>
                    <div className="text-xs text-gray-500">{new Date(row.created_at).toLocaleString('es-MX')}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-gray-900">{row.company_name || row.customer_name || 'Sin nombre'}</div>
                    <div className="text-xs text-gray-500">{row.package_name || row.service_line || 'Operacion comercial'}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{row.customer_email || '—'}</td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(row.payment_status)}`}>{row.payment_status || 'pending'}</div>
                    <div className="text-xs text-gray-500 mt-2">{row.payment_method || 'card'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(row.tax_status)}`}>{row.tax_status || 'pending'}</div>
                    <div className="text-xs text-gray-500 mt-2">{row.billing_country || 'MX'}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(row.amount, row.currency || 'MXN')}</td>
                  <td className="px-4 py-3">
                    <div className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${badgeClass(row.operational_status)}`}>{row.operational_status || 'new'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={drafts[row.id]?.crm_status || row.crm_status || 'new'}
                      onChange={(event) => updateDraft(row.id, event.target.value)}
                      className="w-full rounded-lg border px-3 py-2 bg-white"
                    >
                      {CRM_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => saveStatus(row.id)}
                      disabled={savingId === row.id}
                      className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold hover:bg-blue-500 disabled:opacity-60"
                    >
                      {savingId === row.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Guardar
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan="9" className="px-4 py-10 text-center text-gray-500">
                    Aun no hay operaciones comerciales sincronizadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
