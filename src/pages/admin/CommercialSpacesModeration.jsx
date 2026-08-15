import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Building2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { COMMERCIAL_SPACE_STATUSES, COMMERCIAL_SPACE_TYPES } from '../../config/commercialSpaces';

const REVIEW_STATUSES = ['pending_review', 'documents_required', 'published', 'rejected', 'paused', 'archived'];

export default function CommercialSpacesModeration() {
  const [spaces, setSpaces] = useState([]);
  const [filter, setFilter] = useState('pending_review');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let query = supabase.from('commercial_spaces').select('id, owner_id, slug, title, space_type, status, public_location, address_private, city, country_code, area_sqm, monthly_rent, currency, contact_name, contact_email, contact_phone, is_identity_verified, is_authority_verified, is_location_verified, submitted_at, updated_at').order('submitted_at', { ascending: true, nullsFirst: false }).limit(100);
    if (filter) query = query.eq('status', filter);
    const { data, error } = await query;
    if (error) toast.error(error.message); else setSpaces(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]); // eslint-disable-line react-hooks/exhaustive-deps

  const updateSpace = async (space, changes) => {
    const { error } = await supabase.from('commercial_spaces').update(changes).eq('id', space.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Revisión actualizada.');
    load();
  };

  return <div><div className="flex flex-col justify-between gap-4 md:flex-row md:items-center"><div><h1 className="flex items-center gap-2 text-3xl font-black text-slate-900 dark:text-white"><Building2 /> Espacios comerciales</h1><p className="mt-1 text-slate-600 dark:text-slate-300">Moderación documental y editorial. No administra pagos ni contratos.</p></div><select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border bg-white px-4 py-3"><option value="">Todos</option>{REVIEW_STATUSES.map((status) => <option key={status} value={status}>{COMMERCIAL_SPACE_STATUSES[status]}</option>)}</select></div>
    <div className="mt-6 space-y-4">{loading && <div className="rounded-2xl bg-white p-8">Cargando…</div>}{!loading && spaces.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-10 text-center">No hay espacios en este estado.</div>}{spaces.map((space) => <article key={space.id} className="rounded-2xl border bg-white p-5 shadow-sm dark:bg-slate-800"><div className="flex flex-col justify-between gap-4 lg:flex-row"><div><p className="text-xs font-black uppercase text-blue-700">{COMMERCIAL_SPACE_TYPES[space.space_type]}</p><h2 className="mt-1 text-xl font-black dark:text-white">{space.title}</h2><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Público: {space.public_location}, {space.city} · Privado: {space.address_private}</p><p className="mt-1 text-sm text-slate-500">Contacto privado: {space.contact_name} · {space.contact_email}</p><p className="mt-1 text-sm text-slate-500">{Number(space.area_sqm).toLocaleString('es-MX')} m² · {space.monthly_rent == null ? 'Precio a consultar' : `${Number(space.monthly_rent).toLocaleString('es-MX')} ${space.currency}`}</p></div><span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{COMMERCIAL_SPACE_STATUSES[space.status]}</span></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">{[['is_identity_verified', 'Identidad'], ['is_authority_verified', 'Autorización'], ['is_location_verified', 'Ubicación']].map(([field, label]) => <label key={field} className="flex items-center gap-2 rounded-xl border p-3 text-sm font-bold"><input type="checkbox" checked={space[field]} onChange={(e) => updateSpace(space, { [field]: e.target.checked })} /><ShieldCheck className="h-4 w-4 text-emerald-600" /> {label}</label>)}</div>
      <div className="mt-5 flex flex-wrap gap-2"><button onClick={() => updateSpace(space, { status: 'documents_required' })} className="rounded-lg border px-4 py-2 text-sm font-bold">Pedir documentos</button><button onClick={() => updateSpace(space, { status: 'rejected' })} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-700">Rechazar</button><button onClick={() => updateSpace(space, { status: 'published' })} disabled={!space.is_authority_verified || !space.is_location_verified} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40">Publicar verificado</button></div>
      {(!space.is_authority_verified || !space.is_location_verified) && <p className="mt-2 text-xs text-amber-700">Para publicar se requiere autorización y ubicación revisadas.</p>}
    </article>)}</div>
  </div>;
}
