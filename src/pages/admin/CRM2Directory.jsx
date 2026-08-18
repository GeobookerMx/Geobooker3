import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, RefreshCw, Search, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { featureFlags } from '../../config/featureFlags';

const PAGE_SIZE = 25;
const STATUS_OPTIONS = ['', 'active', 'needs_review', 'inactive', 'merged', 'archived'];

export default function CRM2Directory() {
  const [tab, setTab] = useState('accounts');
  const [rows, setRows] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(featureFlags.crm2Directory);
  const [error, setError] = useState('');

  const loadRows = useCallback(async () => {
    if (!featureFlags.crm2Directory) return;
    setLoading(true);
    setError('');
    const rpcName = tab === 'accounts' ? 'crm_account_directory' : 'crm_contact_directory';
    const params = tab === 'accounts'
      ? { p_search: search || null, p_status: status || null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE }
      : { p_search: search || null, p_status: status || null, p_account_id: null, p_limit: PAGE_SIZE, p_offset: page * PAGE_SIZE };
    const { data, error: queryError } = await supabase.rpc(rpcName, params);
    if (queryError) setError('No fue posible consultar el directorio CRM.');
    setRows(data || []);
    setTotal(Number(data?.[0]?.total_count || 0));
    setLoading(false);
  }, [page, search, status, tab]);

  useEffect(() => { loadRows(); }, [loadRows]);

  if (!featureFlags.crm2Directory) {
    return <div className="max-w-5xl mx-auto p-6"><div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
      <div className="flex items-center gap-3"><AlertTriangle className="h-6 w-6" /><h1 className="text-xl font-bold">Directorio CRM 2.0 desactivado</h1></div>
      <p className="mt-3">La consulta permanece bloqueada hasta validar la base aislada.</p>
    </div></div>;
  }

  const changeTab = nextTab => { setTab(nextTab); setRows([]); setPage(0); setTotal(0); };
  const submitSearch = event => { event.preventDefault(); setSearch(searchInput.trim().slice(0, 100)); setPage(0); };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM 2.0 — Directorio</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-300">Listado administrativo sin emails ni teléfonos.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => changeTab('accounts')} className={`rounded-xl px-4 py-2 font-semibold ${tab === 'accounts' ? 'bg-indigo-600 text-white' : 'border bg-white text-gray-700'}`}><Building2 className="mr-2 inline h-4 w-4" />Cuentas</button>
        <button type="button" onClick={() => changeTab('contacts')} className={`rounded-xl px-4 py-2 font-semibold ${tab === 'contacts' ? 'bg-indigo-600 text-white' : 'border bg-white text-gray-700'}`}><UsersRound className="mr-2 inline h-4 w-4" />Contactos</button>
      </div>
      <form onSubmit={submitSearch} className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-[1fr_220px_auto] dark:bg-gray-800 dark:border-gray-700">
        <label className="relative"><span className="sr-only">Buscar</span><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input value={searchInput} onChange={event => setSearchInput(event.target.value)} maxLength="100" placeholder="Nombre, empresa, ciudad o sector" className="w-full rounded-lg border py-2 pl-9 pr-3 dark:bg-gray-900" /></label>
        <select value={status} onChange={event => { setStatus(event.target.value); setPage(0); }} className="rounded-lg border px-3 py-2 dark:bg-gray-900">
          {STATUS_OPTIONS.map(value => <option key={value || 'all'} value={value}>{value || 'Todos los estados'}</option>)}
        </select>
        <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 font-semibold text-white">Buscar</button>
      </form>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <table className="min-w-full text-sm"><thead className="bg-gray-50 text-left dark:bg-gray-900"><tr>
          {(tab === 'accounts' ? ['Cuenta', 'Industria', 'Ubicación', 'Estado', 'Contactos', 'Oportunidades'] : ['Contacto', 'Cargo', 'Cuenta', 'País', 'Estado']).map(label => <th key={label} className="px-4 py-3">{label}</th>)}
        </tr></thead><tbody className="divide-y dark:divide-gray-700">
          {!loading && rows.length === 0 && <tr><td colSpan="6" className="px-4 py-10 text-center text-gray-500">Sin resultados.</td></tr>}
          {rows.map(row => tab === 'accounts' ? <tr key={row.id}>
            <td className="px-4 py-3 font-semibold">{row.display_name}</td><td className="px-4 py-3">{row.industry || '—'}</td><td className="px-4 py-3">{[row.city, row.country_code].filter(Boolean).join(', ') || '—'}</td><td className="px-4 py-3">{row.account_status}</td><td className="px-4 py-3">{row.contact_count}</td><td className="px-4 py-3">{row.open_opportunity_count}</td>
          </tr> : <tr key={row.id}>
            <td className="px-4 py-3 font-semibold">{row.full_name || 'Sin nombre'}</td><td className="px-4 py-3">{row.job_title || '—'}</td><td className="px-4 py-3">{row.account_display_name || 'Sin vincular'}</td><td className="px-4 py-3">{row.country_code || '—'}</td><td className="px-4 py-3">{row.contact_status}</td>
          </tr>)}
        </tbody></table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600"><span>{total} registros</span><div className="flex gap-2">
        <button type="button" disabled={page === 0 || loading} onClick={() => setPage(value => Math.max(0, value - 1))} className="rounded-lg border px-3 py-2 disabled:opacity-40">Anterior</button>
        <button type="button" disabled={(page + 1) * PAGE_SIZE >= total || loading} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Siguiente</button>
        <button type="button" onClick={loadRows} disabled={loading} className="rounded-lg border p-2 disabled:opacity-40" title="Actualizar"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div></div>
    </div>
  );
}
