import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BriefcaseBusiness, Building2, RefreshCw, UserRound, UsersRound } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { featureFlags } from '../../config/featureFlags';

const EMPTY = Object.freeze({
  active_accounts: 0,
  active_contacts: 0,
  open_opportunities: 0,
  won_opportunities: 0,
  unassigned_opportunities: 0,
  overdue_tasks: 0,
  tasks_due_next_7_days: 0
});

export default function CRM2Operations() {
  const [overview, setOverview] = useState(EMPTY);
  const [loading, setLoading] = useState(featureFlags.crm2Operations);
  const [error, setError] = useState('');

  const loadOverview = useCallback(async () => {
    if (!featureFlags.crm2Operations) return;
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.rpc('crm_sales_overview');
    if (queryError) setError('No fue posible consultar el resumen operativo del CRM.');
    setOverview(data?.[0] || EMPTY);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  if (!featureFlags.crm2Operations) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
          <div className="flex items-center gap-3"><AlertTriangle className="h-6 w-6" /><h1 className="text-xl font-bold">CRM 2.0 Operaciones desactivado</h1></div>
          <p className="mt-3">La interfaz permanece bloqueada hasta validar las migraciones y permisos en un entorno aislado.</p>
        </div>
      </div>
    );
  }

  const cards = [
    ['Cuentas activas', overview.active_accounts, Building2, 'bg-blue-50 text-blue-700'],
    ['Contactos activos', overview.active_contacts, UsersRound, 'bg-indigo-50 text-indigo-700'],
    ['Oportunidades abiertas', overview.open_opportunities, BriefcaseBusiness, 'bg-purple-50 text-purple-700'],
    ['Oportunidades ganadas', overview.won_opportunities, BriefcaseBusiness, 'bg-green-50 text-green-700'],
    ['Oportunidades sin responsable', overview.unassigned_opportunities, UserRound, 'bg-amber-50 text-amber-700'],
    ['Tareas vencidas', overview.overdue_tasks, AlertTriangle, 'bg-red-50 text-red-700'],
    ['Tareas próximos 7 días', overview.tasks_due_next_7_days, RefreshCw, 'bg-cyan-50 text-cyan-700']
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">CRM 2.0 — Operaciones</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Resumen agregado de sólo lectura.</p>
        </div>
        <button type="button" onClick={loadOverview} disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold text-gray-700 disabled:opacity-50">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </button>
      </div>
      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</div>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, value, Icon, iconClass]) => (
          <div key={label} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-gray-800 dark:border-gray-700">
            <div className={`inline-flex rounded-xl p-2 ${iconClass}`}>{React.createElement(Icon, { className: 'h-5 w-5' })}</div>
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{Number(value || 0).toLocaleString()}</p>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-900">
        No hay controles de creación, edición, scoring o campañas en esta fase.
      </div>
    </div>
  );
}
