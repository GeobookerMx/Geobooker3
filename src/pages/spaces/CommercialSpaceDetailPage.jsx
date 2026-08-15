import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Building2, MapPin, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { useAuth } from '../../contexts/AuthContext';
import { COMMERCIAL_SPACE_TYPES } from '../../config/commercialSpaces';
import { createCommercialSpaceInquiry, getCommercialSpace } from '../../services/commercialSpacesService';

const money = (amount, currency = 'MXN') => amount == null ? 'A consultar' : new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export default function CommercialSpaceDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [space, setSpace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ inquiryType: 'information', message: '', desiredStartDate: '', budgetAmount: '', currency: 'MXN' });

  useEffect(() => { getCommercialSpace(slug).then(setSpace).catch((error) => { console.error(error); toast.error('No pudimos cargar este espacio.'); }).finally(() => setLoading(false)); }, [slug]);

  const submitInquiry = async (event) => {
    event.preventDefault();
    if (!user) { navigate('/login', { state: { from: `/espacios/${slug}` } }); return; }
    setSending(true);
    try {
      await createCommercialSpaceInquiry(space.id, user, form);
      toast.success('Solicitud enviada. El anunciante podrá revisarla en su panel.');
      setForm({ ...form, message: '', desiredStartDate: '', budgetAmount: '' });
    } catch (error) { console.error(error); toast.error(error.message || 'No fue posible enviar la solicitud.'); }
    finally { setSending(false); }
  };

  if (loading) return <div className="mx-auto max-w-6xl px-4 py-20 text-center">Cargando espacio…</div>;
  if (!space) return <div className="mx-auto max-w-3xl px-4 py-20 text-center"><h1 className="text-3xl font-black">Espacio no disponible</h1><Link to="/espacios" className="mt-5 inline-block text-blue-700">Volver al buscador</Link></div>;
  const verified = space.is_identity_verified || space.is_authority_verified || space.is_location_verified;

  return <>
    <SEO title={`${space.title} | Geobooker`} description={space.description.slice(0, 155)} noindex />
    <main className="mx-auto max-w-6xl px-4 py-10">
      <Link to="/espacios" className="text-sm font-bold text-blue-700">← Todos los espacios</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_380px]">
        <article>
          <div className="flex min-h-72 items-center justify-center overflow-hidden rounded-3xl bg-slate-100">{space.cover_image_url ? <img src={space.cover_image_url} alt="" className="h-full max-h-[520px] w-full object-cover" /> : <Building2 className="h-24 w-24 text-slate-300" />}</div>
          <p className="mt-7 text-sm font-black uppercase tracking-wider text-blue-700">{COMMERCIAL_SPACE_TYPES[space.space_type]}</p>
          <h1 className="mt-2 text-4xl font-black text-slate-950">{space.title}</h1>
          <p className="mt-3 flex items-center gap-2 text-slate-600"><MapPin className="h-5 w-5" /> {space.public_location}, {space.city}</p>
          <div className="mt-6 grid gap-3 rounded-2xl bg-slate-50 p-5 sm:grid-cols-3"><div><p className="text-xs uppercase text-slate-500">Superficie</p><p className="font-black">{Number(space.area_sqm).toLocaleString('es-MX')} m²</p></div><div><p className="text-xs uppercase text-slate-500">Renta anunciada</p><p className="font-black">{money(space.monthly_rent, space.currency)}</p></div><div><p className="text-xs uppercase text-slate-500">Disponible desde</p><p className="font-black">{space.available_from || 'Confirmar'}</p></div></div>
          <h2 className="mt-8 text-2xl font-black">Descripción</h2><p className="mt-3 whitespace-pre-line leading-7 text-slate-700">{space.description}</p>
          {space.amenities?.length > 0 && <><h2 className="mt-8 text-2xl font-black">Características declaradas</h2><div className="mt-3 flex flex-wrap gap-2">{space.amenities.map((item) => <span key={item} className="rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-800">{item}</span>)}</div></>}
          <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Geobooker facilita descubrimiento y contacto. Confirma identidad, autorización, condiciones, uso permitido y documentación antes de entregar dinero o firmar acuerdos.</div>
        </article>
        <aside className="self-start rounded-3xl border bg-white p-6 shadow-lg lg:sticky lg:top-28">
          <h2 className="text-xl font-black">Solicitar información</h2>
          {verified && <p className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-800"><ShieldCheck className="h-5 w-5" /> Tiene verificaciones revisadas</p>}
          <form onSubmit={submitInquiry} className="mt-5 space-y-4">
            <select value={form.inquiryType} onChange={(e) => setForm({ ...form, inquiryType: e.target.value })} className="w-full rounded-xl border px-3 py-3"><option value="information">Solicitar información</option><option value="visit">Solicitar visita</option><option value="proposal">Presentar propuesta</option></select>
            <textarea required minLength={20} maxLength={1500} rows={5} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="w-full rounded-xl border px-3 py-3" placeholder="Explica el uso que buscas, fechas y necesidades principales." />
            <input type="date" value={form.desiredStartDate} onChange={(e) => setForm({ ...form, desiredStartDate: e.target.value })} className="w-full rounded-xl border px-3 py-3" />
            <input type="number" min="0" value={form.budgetAmount} onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })} className="w-full rounded-xl border px-3 py-3" placeholder="Presupuesto mensual opcional" />
            <button disabled={sending} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-black text-white hover:bg-blue-800 disabled:opacity-60">{sending ? 'Enviando…' : user ? 'Enviar solicitud' : 'Iniciar sesión para contactar'}</button>
          </form>
        </aside>
      </div>
    </main>
  </>;
}
