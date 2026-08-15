import React, { useState } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useSharedGoogleMaps } from '../../hooks/useSharedGoogleMaps';
import { COMMERCIAL_SPACE_AMENITIES, COMMERCIAL_SPACE_TYPES } from '../../config/commercialSpaces';
import { createCommercialSpace } from '../../services/commercialSpacesService';

const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 };
const mapStyle = { width: '100%', height: '340px', borderRadius: '1rem' };

const initialForm = {
  title: '', description: '', spaceType: 'retail', publicLocation: '', addressPrivate: '', city: '', stateRegion: '',
  countryCode: 'MX', postalCode: '', latitude: DEFAULT_CENTER.lat, longitude: DEFAULT_CENTER.lng,
  areaSqm: '', monthlyRent: '', currency: 'MXN', availableFrom: '', parkingSpaces: 0,
  amenities: [], permittedUses: '', restrictions: '', contactName: '', contactEmail: '', contactPhone: '', coverImageUrl: '',
  submitForReview: false
};

export default function CommercialSpaceFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isLoaded } = useSharedGoogleMaps();
  const [form, setForm] = useState({ ...initialForm, contactEmail: user?.email || '' });
  const [authorityDeclared, setAuthorityDeclared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const update = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const toggleAmenity = (value) => update('amenities', form.amenities.includes(value) ? form.amenities.filter((item) => item !== value) : [...form.amenities, value]);
  const setPosition = (lat, lng) => setForm((current) => ({ ...current, latitude: lat, longitude: lng }));
  const useLocation = () => navigator.geolocation?.getCurrentPosition(({ coords }) => setPosition(coords.latitude, coords.longitude), () => toast.error('No pudimos obtener tu ubicación.'));

  const submit = async (event, submitForReview) => {
    event.preventDefault();
    if (!authorityDeclared) { toast.error('Debes declarar que tienes autorización para anunciar el espacio.'); return; }
    setSubmitting(true);
    try {
      await createCommercialSpace({ ...form, submitForReview }, user);
      toast.success(submitForReview ? 'Espacio enviado a revisión.' : 'Borrador guardado.');
      navigate('/dashboard/espacios');
    } catch (error) { console.error(error); toast.error(error.message || 'No fue posible guardar el espacio.'); }
    finally { setSubmitting(false); }
  };

  const inputClass = 'w-full rounded-xl border border-slate-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100';

  return <main className="mx-auto max-w-5xl">
    <div className="rounded-3xl bg-gradient-to-r from-blue-950 to-cyan-800 p-7 text-white"><p className="text-sm font-black uppercase tracking-wider text-cyan-200">Publicación moderada</p><h1 className="mt-2 text-3xl font-black">Publicar un espacio comercial</h1><p className="mt-3 text-blue-100">La dirección exacta y los datos de contacto no se muestran en resultados públicos.</p></div>
    <form className="mt-7 space-y-7 rounded-3xl border bg-white p-6 shadow-sm" onSubmit={(event) => submit(event, true)}>
      <section><h2 className="text-xl font-black">Información principal</h2><div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>Tipo de espacio<select className={inputClass} value={form.spaceType} onChange={(e) => update('spaceType', e.target.value)}>{Object.entries(COMMERCIAL_SPACE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Título<input className={inputClass} required minLength={8} maxLength={120} value={form.title} onChange={(e) => update('title', e.target.value)} /></label>
        <label className="md:col-span-2">Descripción<textarea className={inputClass} required minLength={40} maxLength={4000} rows={6} value={form.description} onChange={(e) => update('description', e.target.value)} /></label>
      </div></section>
      <section><h2 className="text-xl font-black">Ubicación</h2><p className="mt-1 text-sm text-slate-500">El público verá zona y coordenadas aproximadas, no la dirección exacta.</p><div className="mt-4 grid gap-4 md:grid-cols-2">
        <label>Zona pública<input className={inputClass} required placeholder="Ej. Centro, San Pedro" value={form.publicLocation} onChange={(e) => update('publicLocation', e.target.value)} /></label>
        <label>Dirección exacta privada<input className={inputClass} required value={form.addressPrivate} onChange={(e) => update('addressPrivate', e.target.value)} /></label>
        <label>Ciudad<input className={inputClass} required value={form.city} onChange={(e) => update('city', e.target.value)} /></label>
        <label>Estado / región<input className={inputClass} value={form.stateRegion} onChange={(e) => update('stateRegion', e.target.value)} /></label>
        <label>Código postal<input className={inputClass} value={form.postalCode} onChange={(e) => update('postalCode', e.target.value)} /></label>
        <label>País (ISO 2 letras)<input className={inputClass} required pattern="[A-Za-z]{2}" maxLength={2} value={form.countryCode} onChange={(e) => update('countryCode', e.target.value.toUpperCase())} /></label>
      </div><button type="button" onClick={useLocation} className="my-4 rounded-full border border-blue-200 px-4 py-2 font-bold text-blue-700">Usar mi ubicación</button>
      {isLoaded ? <GoogleMap mapContainerStyle={mapStyle} center={{ lat: Number(form.latitude), lng: Number(form.longitude) }} zoom={15} onClick={(event) => setPosition(event.latLng.lat(), event.latLng.lng())}><MarkerF draggable position={{ lat: Number(form.latitude), lng: Number(form.longitude) }} onDragEnd={(event) => setPosition(event.latLng.lat(), event.latLng.lng())} /></GoogleMap> : <div className="flex h-[340px] items-center justify-center rounded-2xl bg-slate-100">Cargando mapa…</div>}</section>
      <section><h2 className="text-xl font-black">Precio y características</h2><div className="mt-4 grid gap-4 md:grid-cols-3">
        <label>Superficie m²<input className={inputClass} required type="number" min="1" step="0.01" value={form.areaSqm} onChange={(e) => update('areaSqm', e.target.value)} /></label>
        <label>Renta mensual<input className={inputClass} type="number" min="0" step="0.01" value={form.monthlyRent} onChange={(e) => update('monthlyRent', e.target.value)} /></label>
        <label>Moneda<input className={inputClass} required pattern="[A-Za-z]{3}" maxLength={3} value={form.currency} onChange={(e) => update('currency', e.target.value.toUpperCase())} /></label>
        <label>Disponible desde<input className={inputClass} type="date" value={form.availableFrom} onChange={(e) => update('availableFrom', e.target.value)} /></label>
        <label>Cajones de estacionamiento<input className={inputClass} type="number" min="0" value={form.parkingSpaces} onChange={(e) => update('parkingSpaces', e.target.value)} /></label>
        <label>Imagen principal (URL opcional)<input className={inputClass} type="url" value={form.coverImageUrl} onChange={(e) => update('coverImageUrl', e.target.value)} /></label>
        <label className="md:col-span-3">Usos permitidos, separados por coma<input className={inputClass} value={form.permittedUses} onChange={(e) => update('permittedUses', e.target.value)} placeholder="cafetería, oficina, consultorio" /></label>
        <label className="md:col-span-3">Restricciones<textarea className={inputClass} rows={3} value={form.restrictions} onChange={(e) => update('restrictions', e.target.value)} /></label>
      </div><div className="mt-4 flex flex-wrap gap-2">{COMMERCIAL_SPACE_AMENITIES.map(([value, label]) => <button type="button" key={value} onClick={() => toggleAmenity(value)} className={`rounded-full border px-3 py-2 text-sm ${form.amenities.includes(value) ? 'border-blue-700 bg-blue-700 text-white' : 'border-slate-300'}`}>{label}</button>)}</div></section>
      <section><h2 className="text-xl font-black">Contacto privado</h2><div className="mt-4 grid gap-4 md:grid-cols-3"><label>Nombre<input className={inputClass} required value={form.contactName} onChange={(e) => update('contactName', e.target.value)} /></label><label>Correo<input className={inputClass} required type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} /></label><label>Teléfono<input className={inputClass} value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} /></label></div></section>
      <label className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><input type="checkbox" checked={authorityDeclared} onChange={(e) => setAuthorityDeclared(e.target.checked)} /><span className="text-sm text-amber-950">Declaro que soy propietario o cuento con autorización vigente para anunciar este espacio. Entiendo que Geobooker puede solicitar documentación y rechazar la publicación.</span></label>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={submitting} onClick={(event) => submit(event, false)} className="rounded-xl border px-6 py-3 font-bold">Guardar borrador</button><button disabled={submitting} className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white">{submitting ? 'Guardando…' : 'Enviar a revisión'}</button></div>
    </form>
  </main>;
}
