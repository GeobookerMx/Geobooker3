import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { COMMERCIAL_SPACE_STATUSES, COMMERCIAL_SPACE_TYPES } from '../../config/commercialSpaces';
import {
  listIncomingCommercialSpaceInquiries,
  listMyCommercialSpaces,
  updateCommercialSpaceInquiryStatus
} from '../../services/commercialSpacesService';

export default function MyCommercialSpacesPage() {
  const { user } = useAuth();
  const [spaces, setSpaces] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    Promise.all([listMyCommercialSpaces(user.id), listIncomingCommercialSpaceInquiries(user.id)])
      .then(([spaceRows, inquiryRows]) => {
        setSpaces(spaceRows);
        setInquiries(inquiryRows);
      })
      .catch((error) => {
        console.error(error);
        toast.error('No pudimos cargar tus espacios.');
      })
      .finally(() => setLoading(false));
  }, [user?.id]);

  const changeInquiryStatus = async (id, status) => {
    try {
      await updateCommercialSpaceInquiryStatus(id, status);
      setInquiries((rows) => rows.map((row) => row.id === id ? { ...row, status } : row));
      toast.success('Solicitud actualizada.');
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  return (
    <main>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-black text-slate-950">Mis espacios comerciales</h1>
          <p className="mt-1 text-slate-600">Administra borradores y consulta el estado de moderación.</p>
        </div>
        <Link to="/espacios/publicar" className="rounded-full bg-blue-700 px-5 py-3 text-center font-black text-white">Publicar espacio</Link>
      </div>

      <div className="mt-7 overflow-hidden rounded-2xl border bg-white">
        <div className="grid grid-cols-[1fr_auto] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-black uppercase text-slate-500"><span>Espacio</span><span>Estado</span></div>
        {loading && <p className="p-6">Cargando…</p>}
        {!loading && spaces.length === 0 && <p className="p-8 text-center text-slate-600">Aún no tienes espacios registrados.</p>}
        {spaces.map((space) => (
          <div key={space.id} className="grid grid-cols-[1fr_auto] gap-4 border-b px-5 py-5 last:border-0">
            <div>
              <p className="font-black text-slate-900">{space.title}</p>
              <p className="mt-1 text-sm text-slate-500">{COMMERCIAL_SPACE_TYPES[space.space_type]} · {space.public_location}, {space.city}</p>
              {space.status === 'published' && <Link to={`/espacios/${space.slug}`} className="mt-2 inline-block text-sm font-bold text-blue-700">Ver publicación</Link>}
            </div>
            <span className="self-start rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{COMMERCIAL_SPACE_STATUSES[space.status] || space.status}</span>
          </div>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="text-2xl font-black text-slate-950">Solicitudes recibidas</h2>
        <p className="mt-1 text-sm text-slate-600">El contacto fue compartido por el interesado al enviar la solicitud. No se envían mensajes automáticos.</p>
        <div className="mt-4 space-y-3">
          {!loading && inquiries.length === 0 && <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-slate-600">Todavía no hay solicitudes.</div>}
          {inquiries.map((inquiry) => (
            <article key={inquiry.id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-col justify-between gap-3 sm:flex-row">
                <div>
                  <p className="text-xs font-black uppercase text-blue-700">{inquiry.inquiry_type}</p>
                  <h3 className="font-black text-slate-900">{inquiry.commercial_spaces?.title}</h3>
                  <p className="mt-1 text-sm font-semibold text-slate-600">
                    {inquiry.requester_name || 'Usuario interesado'} · <a className="text-blue-700" href={`mailto:${inquiry.requester_email}`}>{inquiry.requester_email}</a>
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm text-slate-700">{inquiry.message}</p>
                  {inquiry.desired_start_date && <p className="mt-2 text-xs text-slate-500">Inicio deseado: {inquiry.desired_start_date}</p>}
                </div>
                <select value={inquiry.status} onChange={(e) => changeInquiryStatus(inquiry.id, e.target.value)} className="self-start rounded-xl border px-3 py-2 text-sm">
                  <option value="new">Nueva</option><option value="contacted">Contactada</option><option value="visit_scheduled">Visita agendada</option><option value="closed">Cerrada</option><option value="spam">Spam</option>
                </select>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
