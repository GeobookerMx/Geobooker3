import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Database, RefreshCw, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { featureFlags } from '../../config/featureFlags';

const STATUS_LABELS = {
  created: 'Creado',
  validating: 'Validando',
  review_ready: 'Listo para revisión',
  rejected: 'Rechazado',
  approved_for_future_import: 'Aprobado para importación futura',
  failed: 'Fallido',
  cancelled: 'Cancelado'
};

export default function CRM2Imports() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(featureFlags.crm2ImportReview);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [datasetFilter, setDatasetFilter] = useState('');
  const pageSize = 20;

  const loadBatches = useCallback(async () => {
    if (!featureFlags.crm2ImportReview) return;
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.rpc('crm_import_batch_summaries', {
      p_limit: pageSize,
      p_offset: page * pageSize,
      p_status: statusFilter || null,
      p_dataset_type: datasetFilter || null
    });
    if (queryError) setError('No fue posible consultar los lotes. Verifica la migración y el acceso administrativo.');
    setBatches(data || []);
    setTotal(Number(data?.[0]?.total_count || 0));
    setLoading(false);
  }, [datasetFilter, page, statusFilter]);

  useEffect(() => {
    loadBatches();
  }, [loadBatches]);

  if (!featureFlags.crm2ImportReview) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6" />
            <h1 className="text-xl font-bold">CRM 2.0 Import Review desactivado</h1>
          </div>
          <p className="mt-3">La función está bloqueada por defecto. No hay carga, promoción ni importación disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Database className="h-8 w-8 text-indigo-600" /> CRM 2.0 — revisión de staging
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Vista de solo lectura; no promueve registros a producción.</p>
        </div>
        <button type="button" onClick={loadBatches} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>

      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-green-900 flex gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0" />
        <p>Protegido por acceso administrativo y RLS. El modo de los lotes está limitado a <strong>dry_run</strong>.</p>
      </div>

      <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-2 dark:bg-gray-800 dark:border-gray-700">
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Dataset
          <select value={datasetFilter} onChange={event => { setDatasetFilter(event.target.value); setPage(0); }}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-normal dark:bg-gray-900">
            <option value="">Todos</option>
            <option value="accounts">Cuentas</option>
            <option value="contacts">Contactos</option>
            <option value="suppressions">Supresiones</option>
            <option value="needs_review">Revisión manual</option>
          </select>
        </label>
        <label className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Estado
          <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(0); }}
            className="mt-1 w-full rounded-lg border px-3 py-2 font-normal dark:bg-gray-900">
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}

      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300">
            <tr>{['Lote', 'Dataset', 'Estado', 'Total', 'Válidos', 'Inválidos', 'Duplicados', 'Revisión', 'Creado'].map(label => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {!loading && batches.length === 0 && <tr><td colSpan="9" className="px-4 py-10 text-center text-gray-500">No hay lotes de staging.</td></tr>}
            {batches.map(batch => (
              <tr key={batch.id} className="text-gray-700 dark:text-gray-200">
                <td className="px-4 py-3 font-medium">{batch.batch_name}</td>
                <td className="px-4 py-3">{batch.dataset_type}</td>
                <td className="px-4 py-3">{STATUS_LABELS[batch.status] || batch.status}</td>
                <td className="px-4 py-3">{batch.total_rows}</td>
                <td className="px-4 py-3">{batch.valid_rows}</td>
                <td className="px-4 py-3">{batch.invalid_rows}</td>
                <td className="px-4 py-3">{batch.duplicate_rows}</td>
                <td className="px-4 py-3">{batch.review_rows}</td>
                <td className="px-4 py-3">{new Date(batch.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
        <span>{total} lotes</span>
        <div className="flex gap-2">
          <button type="button" disabled={page === 0 || loading} onClick={() => setPage(value => Math.max(0, value - 1))}
            className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40 dark:bg-gray-800">Anterior</button>
          <button type="button" disabled={(page + 1) * pageSize >= total || loading} onClick={() => setPage(value => value + 1)}
            className="rounded-lg border bg-white px-3 py-2 disabled:opacity-40 dark:bg-gray-800">Siguiente</button>
        </div>
      </div>
    </div>
  );
}
