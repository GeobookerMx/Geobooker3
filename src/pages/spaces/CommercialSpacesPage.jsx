import React, { useEffect, useMemo, useState } from 'react';
import { GoogleMap, MarkerF } from '@react-google-maps/api';
import { Link } from 'react-router-dom';
import { Building2, MapPin, Search, ShieldCheck } from 'lucide-react';
import SEO from '../../components/SEO';
import { useSharedGoogleMaps } from '../../hooks/useSharedGoogleMaps';
import { COMMERCIAL_SPACE_TYPES } from '../../config/commercialSpaces';
import { searchCommercialSpaces } from '../../services/commercialSpacesService';

const DEFAULT_CENTER = { lat: 19.4326, lng: -99.1332 };
const mapStyle = { width: '100%', height: '520px', borderRadius: '1rem' };
const money = (amount, currency = 'MXN') => amount == null ? 'Precio a consultar' : new Intl.NumberFormat('es-MX', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);

export default function CommercialSpacesPage() {
  const { isLoaded } = useSharedGoogleMaps();
  const [filters, setFilters] = useState({ query: '', city: '', spaceType: '', maxMonthlyRent: '' });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [location, setLocation] = useState(null);

  const loadSpaces = async (nextFilters = filters, nextLocation = location) => {
    setLoading(true);
    setError('');
    try {
      setResults(await searchCommercialSpaces({ ...nextFilters, latitude: nextLocation?.lat, longitude: nextLocation?.lng }));
    } catch (requestError) {
      console.error('Commercial spaces search failed:', requestError);
      setError('No pudimos consultar los espacios. La función seguirá oculta hasta validar su base aislada.');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadSpaces(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const mapCenter = useMemo(() => {
    if (location) return location;
    const first = results.find((item) => Number.isFinite(item.latitude) && Number.isFinite(item.longitude));
    return first ? { lat: first.latitude, lng: first.longitude } : DEFAULT_CENTER;
  }, [location, results]);

  const requestLocation = () => navigator.geolocation?.getCurrentPosition(
    ({ coords }) => {
      const next = { lat: coords.latitude, lng: coords.longitude };
      setLocation(next);
      loadSpaces(filters, next);
    },
    () => setError('No fue posible obtener tu ubicación. Puedes buscar por ciudad.')
  );

  return (
    <>
      <SEO title="Espacios comerciales en renta | Geobooker" description="Encuentra locales, oficinas, consultorios, bodegas y espacios comerciales cercanos." noindex />
      <section className="bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-900 px-4 py-14 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-cyan-300">MVP en validación</p>
          <div className="mt-3 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div><h1 className="max-w-3xl text-4xl font-black md:text-5xl">Encuentra un espacio para hacer crecer tu negocio</h1><p className="mt-4 max-w-3xl text-lg text-blue-100">Descubrimiento y contacto. Geobooker no cobra rentas, depósitos ni garantiza operaciones entre terceros.</p></div>
            <Link to="/espacios/publicar" className="rounded-full bg-white px-6 py-3 text-center font-black text-blue-900 shadow-lg hover:bg-cyan-50">Publicar un espacio</Link>
          </div>
        </div>
      </section>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <form onSubmit={(event) => { event.preventDefault(); loadSpaces(); }} className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5">
          <input value={filters.query} onChange={(e) => setFilters({ ...filters, query: e.target.value })} className="rounded-xl border px-4 py-3 md:col-span-2" placeholder="Ej. local para cafetería" maxLength={100} />
          <input value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} className="rounded-xl border px-4 py-3" placeholder="Ciudad" maxLength={100} />
          <select value={filters.spaceType} onChange={(e) => setFilters({ ...filters, spaceType: e.target.value })} className="rounded-xl border px-4 py-3"><option value="">Todos los tipos</option>{Object.entries(COMMERCIAL_SPACE_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3 font-bold text-white hover:bg-blue-800"><Search className="h-5 w-5" /> Buscar</button>
          <input type="number" min="0" value={filters.maxMonthlyRent} onChange={(e) => setFilters({ ...filters, maxMonthlyRent: e.target.value })} className="rounded-xl border px-4 py-3" placeholder="Renta máxima mensual" />
          <button type="button" onClick={requestLocation} className="rounded-xl border border-blue-200 px-4 py-3 font-semibold text-blue-700 hover:bg-blue-50">Usar mi ubicación</button>
          <p className="self-center text-xs text-slate-500 md:col-span-3">El mapa muestra ubicaciones aproximadas; la dirección exacta permanece privada.</p>
        </form>
        {error && <div role="alert" className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">{error}</div>}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
          <section aria-label="Resultados" className="space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-2xl font-black text-slate-900">Espacios disponibles</h2><span className="text-sm text-slate-500">{loading ? 'Consultando…' : `${results[0]?.total_count || 0} resultados`}</span></div>
            {!loading && results.length === 0 && !error && <div className="rounded-2xl border border-dashed p-10 text-center text-slate-600">Aún no hay espacios publicados con estos filtros.</div>}
            {results.map((space) => <article key={space.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"><div className="grid sm:grid-cols-[180px_1fr]"><div className="flex min-h-40 items-center justify-center bg-slate-100">{space.cover_image_url ? <img src={space.cover_image_url} alt="" className="h-full w-full object-cover" /> : <Building2 className="h-14 w-14 text-slate-300" />}</div><div className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-blue-700">{COMMERCIAL_SPACE_TYPES[space.space_type]}</p><h3 className="mt-1 text-xl font-black text-slate-900">{space.title}</h3></div>{space.is_authority_verified && <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-4 w-4" /> Autorización revisada</span>}</div><p className="mt-2 flex items-center gap-1 text-sm text-slate-600"><MapPin className="h-4 w-4" /> {space.public_location}, {space.city}</p><div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-slate-700"><span>{Number(space.area_sqm).toLocaleString('es-MX')} m²</span><span>{money(space.monthly_rent, space.currency)} / mes</span>{space.approximate_distance_km != null && <span>≈ {space.approximate_distance_km} km</span>}</div><Link to={`/espacios/${space.slug}`} className="mt-4 inline-flex rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-blue-700">Ver información</Link></div></div></article>)}
          </section>
          <aside className="lg:sticky lg:top-28 lg:self-start">{isLoaded ? <GoogleMap mapContainerStyle={mapStyle} center={mapCenter} zoom={results.length ? 11 : 5} options={{ streetViewControl: false, mapTypeControl: false }}>{results.map((space) => Number.isFinite(space.latitude) && Number.isFinite(space.longitude) && <MarkerF key={space.id} position={{ lat: space.latitude, lng: space.longitude }} title={space.title} />)}</GoogleMap> : <div className="flex h-[520px] items-center justify-center rounded-2xl bg-slate-100 text-slate-500">Cargando mapa…</div>}</aside>
        </div>
      </main>
    </>
  );
}
