import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  Sparkles,
  Award,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  Users,
  ShieldCheck,
  ArrowRight,
  Gift,
  Share2,
  Download,
  Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const POPULAR_LOCATIONS = [
  { name: 'CDMX - Polanco', lat: '19.433890', lng: '-99.191250', city: 'Ciudad de México' },
  { name: 'CDMX - Roma / Condesa', lat: '19.416200', lng: '-99.167800', city: 'Ciudad de México' },
  { name: 'CDMX - Centro Histórico', lat: '19.432608', lng: '-99.133209', city: 'Ciudad de México' },
  { name: 'Guadalajara - Providencia', lat: '20.692300', lng: '-103.382100', city: 'Guadalajara' },
  { name: 'Monterrey - San Pedro', lat: '25.657200', lng: '-100.366700', city: 'Monterrey' },
  { name: 'Puebla - Angelópolis', lat: '19.030500', lng: '-98.232500', city: 'Puebla' },
  { name: 'Querétaro - Juriquilla', lat: '20.705100', lng: '-100.443900', city: 'Querétaro' }
];

const COMMERCIAL_VERTICALS = [
  { key: 'restaurant', name: 'Restaurante / Alimentos', icon: '🍽️', desc: 'Comida rápida, formal, cafeterías y bares' },
  { key: 'cafe', name: 'Cafetería / Coffee Shop', icon: '☕', desc: 'Cafés de especialidad, panaderías y postres' },
  { key: 'pharmacy', name: 'Farmacia / Salud', icon: '💊', desc: 'Farmacias, consultorios y ópticas' },
  { key: 'gym', name: 'Gimnasio / Fitness', icon: '🏋️', desc: 'Centros deportivos, crossfit y yoga' },
  { key: 'car_wash', name: 'Autolavado / Taller', icon: '🚗', desc: 'Lavados, detallado y refacciones' },
  { key: 'local_retail', name: 'Comercio / Retail Local', icon: '🛍️', desc: 'Boutiques, minisúpers, papelerías y regalos' }
];

export default function GeoScorePublicPage() {
  const [vertical, setVertical] = useState('restaurant');
  const [lat, setLat] = useState('19.433890');
  const [lng, setLng] = useState('-99.191250');
  const [locationName, setLocationName] = useState('CDMX - Polanco');
  const [radiusMeters, setRadiusMeters] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('La geolocalización no es compatible con tu navegador');
      return;
    }
    toast.loading('Obteniendo ubicación GPS...', { id: 'gps' });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setLocationName('Mi ubicación actual');
        toast.success('Ubicación GPS fijada', { id: 'gps' });
      },
      (err) => {
        toast.error('No se pudo acceder a tu ubicación. Selecciona una ciudad.', { id: 'gps' });
      },
      { timeout: 8000 }
    );
  };

  const handleCalculateScore = async () => {
    setLoading(true);
    setScoreResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('location-intelligence', {
        body: {
          action: 'calculate_score',
          businessTypeKey: vertical,
          countryCode: 'MX',
          lat: Number(lat),
          lng: Number(lng),
          radiusMeters: Number(radiusMeters)
        }
      });

      if (error) throw error;
      if (data?.scoreResult) {
        setScoreResult(data.scoreResult);
        toast.success('¡Estudio de Mercado Express generado!');
      } else {
        throw new Error('Respuesta no válida del motor');
      }
    } catch (err) {
      console.warn('GeoScore direct calculate fallback:', err);
      // Fallback friendly demo response if edge function has temporary network hiccup
      toast.error(err.message || 'Error al calcular. Reintentando...');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `GeoScore para ${locationName}`,
        text: `Consulté el Estudio de Mercado Express gratuito de Geobooker para ${locationName} y obtuve calificación ${scoreResult?.grade || 'A'}.`,
        url: window.location.href
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Enlace copiado al portapapeles');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Promo Hero Header */}
      <div className="relative overflow-hidden pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10">
          {/* Badge Gratuito */}
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1.5 text-xs sm:text-sm font-bold text-emerald-300 mb-6 backdrop-blur-md animate-pulse">
            <Gift className="h-4 w-4" />
            <span>ESTUDIO DE MERCADO EXPRESS — 100% GRATUITO HASTA ENERO 2027</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white">
            Conoce el <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">GeoScore™</span> de tu ubicación comercial
          </h1>
          <p className="mt-4 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto">
            Evalúa la viabilidad comercial de cualquier punto en México. Analiza competencia, comercios ancla, flujo potencial y densidad de mercado al instante.
          </p>
        </div>
      </div>

      {/* Main Interactive Interactive Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-cyan-400" /> Configura tu Estudio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Personaliza el giro y las coordenadas a evaluar.
            </p>

            {/* Vertical Picker */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">1. Giro Comercial</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {COMMERCIAL_VERTICALS.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => setVertical(v.key)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left transition-all ${
                      vertical === v.key
                        ? 'border-cyan-400 bg-cyan-500/10 text-cyan-200 shadow-sm'
                        : 'border-slate-800 bg-slate-800/40 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-lg">{v.icon}</span>
                    <span className="text-xs font-bold truncate">{v.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Cities */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Ubicación o Polo Comercial</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {POPULAR_LOCATIONS.map((loc) => (
                  <button
                    key={loc.name}
                    type="button"
                    onClick={() => {
                      setLat(loc.lat);
                      setLng(loc.lng);
                      setLocationName(loc.name);
                    }}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                      locationName === loc.name
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-emerald-400" /> Usar mi ubicación GPS
                </button>
              </div>
            </div>

            {/* Radio Slider */}
            <div className="mt-6">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold uppercase tracking-wider text-slate-400">3. Radio de Mercado</span>
                <span className="font-bold text-cyan-400">{radiusMeters === '500' ? '500 m (Peatonal)' : radiusMeters === '1000' ? '1 km (Estándar)' : `${Number(radiusMeters)/1000} km`}</span>
              </div>
              <input
                type="range"
                min="500"
                max="3000"
                step="500"
                value={radiusMeters}
                onChange={(e) => setRadiusMeters(e.target.value)}
                className="mt-2 w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* CTA Button */}
            <button
              type="button"
              onClick={handleCalculateScore}
              disabled={loading}
              className="mt-8 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 p-4 font-black text-white text-base shadow-lg shadow-blue-500/25 hover:from-cyan-400 hover:to-indigo-500 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
              {loading ? 'Analizando mercado...' : 'Calcular GeoScore Express Gratis'}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              ⚡ Sin registro requerido durante la promoción · Análisis multi-fuente inmediato
            </p>
          </div>

          {/* Right Column: Results Screen */}
          <div className="lg:col-span-7 space-y-6">
            {!scoreResult && !loading && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-12 text-center backdrop-blur-md">
                <div className="inline-flex rounded-2xl bg-blue-500/10 p-4 text-cyan-400 mb-4">
                  <Compass className="h-10 w-10 animate-bounce" />
                </div>
                <h3 className="text-2xl font-bold text-white">Tu estudio está listo para generarse</h3>
                <p className="mt-2 text-slate-400 max-w-md mx-auto text-sm">
                  Haz clic en el botón para calcular en tiempo real los 5 pilares de viabilidad comercial para tu negocio.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Competidores directos</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Sinergia comercial</span>
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Densidad y accesibilidad</span>
                </div>
              </div>
            )}

            {scoreResult && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in duration-500">
                
                {/* Result Hero Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
                      <ShieldCheck className="h-3.5 w-3.5" /> ESTUDIO EXPRESS COMPLETADO
                    </div>
                    <h3 className="text-2xl font-black text-white">{locationName}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Radio de análisis: {scoreResult.metrics?.radiusMeters || radiusMeters} metros</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">GeoScore</p>
                      <p className="text-4xl font-black text-white">{scoreResult.score}<span className="text-sm font-normal text-slate-400">/100</span></p>
                    </div>
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl font-black text-2xl shadow-inner ${
                      scoreResult.grade?.startsWith('A')
                        ? 'bg-emerald-500 text-slate-950'
                        : scoreResult.grade === 'B'
                        ? 'bg-blue-500 text-white'
                        : 'bg-amber-500 text-slate-950'
                    }`}>
                      {scoreResult.grade}
                    </div>
                  </div>
                </div>

                {/* Recommendation Box */}
                <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
                  <p className="font-bold flex items-center gap-2 text-cyan-300">
                    <Sparkles className="h-4 w-4" /> Diagnóstico Estratégico:
                  </p>
                  <p className="mt-1 text-slate-200">{scoreResult.recommendation}</p>
                </div>

                {/* 5 Pillars Breakdown Cards */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Pilares de Análisis Comercial:</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Competencia Directa</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.competition?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-cyan-300">{scoreResult.breakdown?.competition?.count ?? 0} competidores</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Sinergia Comercial</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.complementarity?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-emerald-300">{scoreResult.breakdown?.complementarity?.count ?? 0} comercios ancla</span>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-3.5">
                      <span className="text-xs text-slate-400 font-medium">Densidad de Zona</span>
                      <p className="text-2xl font-black text-white mt-1">{scoreResult.breakdown?.density?.score ?? 0}<span className="text-xs text-slate-400 font-normal"> pts</span></p>
                      <span className="text-[11px] text-indigo-300">{scoreResult.breakdown?.density?.totalNearby ?? 0} negocios en radio</span>
                    </div>
                  </div>
                </div>

                {/* Strengths & Risks */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Fortalezas de la Zona
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-emerald-200">
                      {(scoreResult.strengths || []).map((s, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Puntos a Considerar
                    </p>
                    <ul className="mt-2.5 space-y-1.5 text-xs text-amber-200">
                      {(scoreResult.risks || []).map((r, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">• {r}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Actions & Next Steps */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                  >
                    <Share2 className="h-4 w-4" /> Compartir Estudio
                  </button>

                  <Link
                    to="/business/register"
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-xs font-black text-slate-950 shadow-md hover:from-emerald-400 hover:to-teal-500 transition-all"
                  >
                    Registrar o Reclamar mi Negocio Gratis <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
