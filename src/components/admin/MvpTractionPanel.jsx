import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Download, Globe2, RefreshCw, Search, Smartphone, UserPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { getAnalyticsSummary } from '../../services/analyticsService';

const EMPTY_METRICS = {
  pageViews: 0,
  uniqueVisitors: 0,
  searches: 0,
  signups: 0,
  sessions: 0,
  appFirstOpens: 0,
  appRuntimeSessions: 0,
  appUniqueDevices: 0,
  downloadClicks: 0,
  storeClicks: 0,
  nativeBusinesses: 0,
  internationalBusinesses: 0,
  rentalSpaces: 0
};

const safeCount = async (table, configure = (query) => query) => {
  const response = await configure(supabase.from(table).select('id', { count: 'exact', head: true }));
  if (response.error) throw response.error;
  return response.count || 0;
};

const MetricCard = ({ icon, label, value, helper, color = 'blue' }) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    violet: 'bg-violet-50 text-violet-700',
    amber: 'bg-amber-50 text-amber-700'
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${colors[color]}`}>{React.createElement(icon, { className: 'h-5 w-5' })}</div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-950">{Number(value || 0).toLocaleString()}</p>
      <p className="mt-2 text-xs text-slate-500">{helper}</p>
    </div>
  );
};

export default function MvpTractionPanel() {
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    const start30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const results = await Promise.allSettled([
      getAnalyticsSummary(30),
      supabase.from('admin_app_user_funnel_v1').select('*'),
      supabase.from('admin_app_runtime_funnel_v1').select('*'),
      safeCount('user_profiles', (query) => query.gte('created_at', start30d)),
      safeCount('businesses'),
      safeCount('international_businesses'),
      safeCount('businesses', (query) => query.eq('listing_type', 'space_rental'))
    ]);

    const analytics = results[0].status === 'fulfilled' ? results[0].value : {};
    const appRows = results[1].status === 'fulfilled' && !results[1].value.error ? (results[1].value.data || []) : [];
    const runtimeRows = results[2].status === 'fulfilled' && !results[2].value.error ? (results[2].value.data || []) : [];
    const appTotals = appRows.reduce((total, row) => ({
      sessions: total.sessions + Number(row.app_or_web_sessions_30d || 0),
      downloadClicks: total.downloadClicks + Number(row.download_clicks_30d || 0),
      storeClicks: total.storeClicks + Number(row.download_store_clicks_30d || 0)
    }), { sessions: 0, downloadClicks: 0, storeClicks: 0 });
    const runtimeTotals = runtimeRows.reduce((total, row) => ({
      appFirstOpens: total.appFirstOpens + Number(row.first_opens_30d || 0),
      appRuntimeSessions: total.appRuntimeSessions + Number(row.session_starts_30d || 0) + Number(row.session_resumes_30d || 0),
      appUniqueDevices: total.appUniqueDevices + Number(row.unique_devices_30d || 0)
    }), { appFirstOpens: 0, appRuntimeSessions: 0, appUniqueDevices: 0 });

    setMetrics({
      pageViews: analytics.pageViews || 0,
      uniqueVisitors: analytics.uniqueVisitors || 0,
      searches: analytics.searches || 0,
      signups: results[3].status === 'fulfilled' ? results[3].value : 0,
      sessions: appTotals.sessions,
      appFirstOpens: runtimeTotals.appFirstOpens,
      appRuntimeSessions: runtimeTotals.appRuntimeSessions,
      appUniqueDevices: runtimeTotals.appUniqueDevices,
      downloadClicks: appTotals.downloadClicks,
      storeClicks: appTotals.storeClicks,
      nativeBusinesses: results[4].status === 'fulfilled' ? results[4].value : 0,
      internationalBusinesses: results[5].status === 'fulfilled' ? results[5].value : 0,
      rentalSpaces: results[6].status === 'fulfilled' ? results[6].value : 0
    });
    setUpdatedAt(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { loadMetrics(); }, [loadMetrics]);

  const searchRate = useMemo(() => metrics.uniqueVisitors > 0
    ? ((metrics.searches / metrics.uniqueVisitors) * 100).toFixed(1)
    : '0.0', [metrics]);
  const signupRate = useMemo(() => metrics.uniqueVisitors > 0
    ? ((metrics.signups / metrics.uniqueVisitors) * 100).toFixed(1)
    : '0.0', [metrics]);

  const exportCsv = () => {
    const rows = [
      ['Metrica', 'Valor', 'Ventana'],
      ['Visitas', metrics.pageViews, '30 dias'],
      ['Visitantes unicos', metrics.uniqueVisitors, '30 dias'],
      ['Busquedas', metrics.searches, '30 dias'],
      ['Registros', metrics.signups, '30 dias'],
      ['Sesiones app/web', metrics.sessions, '30 dias'],
      ['Primeras aperturas app/PWA', metrics.appFirstOpens, '30 dias'],
      ['Sesiones runtime app/PWA', metrics.appRuntimeSessions, '30 dias'],
      ['Dispositivos app/PWA unicos', metrics.appUniqueDevices, '30 dias'],
      ['Clicks de descarga', metrics.downloadClicks, '30 dias'],
      ['Clicks hacia tiendas', metrics.storeClicks, '30 dias'],
      ['Negocios Geobooker', metrics.nativeBusinesses, 'Acumulado'],
      ['Negocios internacionales', metrics.internationalBusinesses, 'Acumulado'],
      ['Espacios en renta', metrics.rentalSpaces, 'Acumulado']
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `geobooker-mvp-metricas-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-blue-950 to-blue-800 p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-blue-200">CRM 2.0 · Fase 1 MVP</p>
            <h2 className="mt-2 text-2xl font-black">Traccion verificable de Geobooker</h2>
            <p className="mt-2 max-w-3xl text-sm text-blue-100">Datos salientes reales de Supabase y del embudo interno. No contiene proyecciones ni cifras inventadas.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadMetrics} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-bold hover:bg-white/20 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar</button>
            <button type="button" onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-bold text-blue-900 hover:bg-blue-50"><Download className="h-4 w-4" />Exportar CSV</button>
          </div>
        </div>
        <p className="mt-4 text-xs text-blue-200">Actualizado: {updatedAt ? updatedAt.toLocaleString('es-MX') : 'cargando...'}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={Activity} label="Visitas" value={metrics.pageViews} helper="Ultimos 30 dias" />
        <MetricCard icon={Search} label="Busquedas" value={metrics.searches} helper={`${searchRate}% por visitante unico`} color="violet" />
        <MetricCard icon={UserPlus} label="Nuevas cuentas" value={metrics.signups} helper={`${signupRate}% de visitantes unicos`} color="emerald" />
        <MetricCard icon={Smartphone} label="Clicks de descarga" value={metrics.downloadClicks} helper={`${metrics.storeClicks.toLocaleString()} clicks hacia tiendas`} color="amber" />
        <MetricCard icon={Building2} label="Negocios nativos" value={metrics.nativeBusinesses} helper="Acumulado real en Geobooker" color="emerald" />
        <MetricCard icon={Globe2} label="Directorio internacional" value={metrics.internationalBusinesses} helper="Registros visibles en mercados globales" color="violet" />
        <MetricCard icon={Building2} label="Espacios en renta" value={metrics.rentalSpaces} helper="Publicaciones estructuradas del nuevo MVP" color="amber" />
        <MetricCard icon={Smartphone} label="Aperturas reales" value={metrics.appFirstOpens} helper={`${metrics.appRuntimeSessions.toLocaleString()} sesiones runtime / ${metrics.appUniqueDevices.toLocaleString()} dispositivos`} />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">
        <strong>Uso responsable para inversionistas:</strong> exporta estas cifras con fecha de corte y conserva la ventana de 30 dias. Las descargas representan intenciones/clicks medidos, no instalaciones confirmadas por Apple o Google.
      </div>
    </div>
  );
}
