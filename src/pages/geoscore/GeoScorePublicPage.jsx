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
  Loader2,
  Globe2,
  FileText
} from 'lucide-react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import { supabase } from '../../lib/supabase';

const COUNTRY_OPTIONS = [
  { code: 'MX', name: 'México', flag: '🇲🇽' },
  { code: 'GB', name: 'Reino Unido', flag: '🇬🇧' },
  { code: 'ES', name: 'España', flag: '🇪🇸' },
  { code: 'US', name: 'Estados Unidos', flag: '🇺🇸' },
  { code: 'FR', name: 'Francia', flag: '🇫🇷' },
  { code: 'DE', name: 'Alemania', flag: '🇩🇪' },
  { code: 'AE', name: 'Dubai / EAU', flag: '🇦🇪' },
  { code: 'JP', name: 'Japón', flag: '🇯🇵' },
  { code: 'CO', name: 'Colombia', flag: '🇨🇴' },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷' },
  { code: 'CL', name: 'Chile', flag: '🇨🇱' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' }
];

const INTERNATIONAL_LOCATIONS = {
  MX: [
    { name: 'CDMX - Polanco', lat: '19.433890', lng: '-99.191250', city: 'Ciudad de México' },
    { name: 'CDMX - Roma / Condesa', lat: '19.416200', lng: '-99.167800', city: 'Ciudad de México' },
    { name: 'CDMX - Centro Histórico', lat: '19.432608', lng: '-99.133209', city: 'Ciudad de México' },
    { name: 'Guadalajara - Providencia', lat: '20.692300', lng: '-103.382100', city: 'Guadalajara' },
    { name: 'Monterrey - San Pedro', lat: '25.657200', lng: '-100.366700', city: 'Monterrey' },
    { name: 'Puebla - Angelópolis', lat: '19.030500', lng: '-98.232500', city: 'Puebla' },
    { name: 'Cancún - Zona Hotelera', lat: '21.139100', lng: '-86.753300', city: 'Cancún' }
  ],
  GB: [
    { name: 'London - Soho / Oxford St', lat: '51.513600', lng: '-0.136500', city: 'London' },
    { name: 'London - Covent Garden', lat: '51.511700', lng: '-0.124000', city: 'London' },
    { name: 'London - Mayfair', lat: '51.509500', lng: '-0.149700', city: 'London' },
    { name: 'London - Shoreditch Tech', lat: '51.523000', lng: '-0.078000', city: 'London' },
    { name: 'Manchester - Northern Quarter', lat: '53.483000', lng: '-2.235000', city: 'Manchester' }
  ],
  ES: [
    { name: 'Madrid - Gran Vía / Centro', lat: '40.420000', lng: '-3.705000', city: 'Madrid' },
    { name: 'Madrid - Barrio de Salamanca', lat: '40.430000', lng: '-3.680000', city: 'Madrid' },
    { name: 'Barcelona - Eixample', lat: '41.390000', lng: '2.160000', city: 'Barcelona' },
    { name: 'Barcelona - Gràcia', lat: '41.402000', lng: '2.158000', city: 'Barcelona' },
    { name: 'Valencia - Ciutat Vella', lat: '39.475000', lng: '-0.377000', city: 'Valencia' }
  ],
  US: [
    { name: 'Miami - Brickell Financial', lat: '25.761700', lng: '-80.191800', city: 'Miami, FL' },
    { name: 'Miami - Wynwood Arts', lat: '25.804200', lng: '-80.198900', city: 'Miami, FL' },
    { name: 'New York - SoHo / Manhattan', lat: '40.723300', lng: '-74.003000', city: 'New York, NY' },
    { name: 'Los Angeles - Santa Monica', lat: '34.019500', lng: '-118.491200', city: 'Los Angeles, CA' },
    { name: 'Houston - The Galleria', lat: '29.739700', lng: '-95.464900', city: 'Houston, TX' }
  ],
  FR: [
    { name: 'Paris - Le Marais', lat: '48.857500', lng: '2.358000', city: 'Paris' },
    { name: 'Paris - Champs-Élysées', lat: '48.869800', lng: '2.307500', city: 'Paris' },
    { name: 'Lyon - Presqu\'île', lat: '45.764000', lng: '4.835700', city: 'Lyon' }
  ],
  DE: [
    { name: 'Berlin - Mitte / Alexanderplatz', lat: '52.520000', lng: '13.405000', city: 'Berlin' },
    { name: 'Munich - Altstadt', lat: '48.137000', lng: '11.575000', city: 'Munich' },
    { name: 'Frankfurt - Innenstadt', lat: '50.110900', lng: '8.682100', city: 'Frankfurt' }
  ],
  AE: [
    { name: 'Dubai - Downtown / Burj Khalifa', lat: '25.197200', lng: '55.274400', city: 'Dubai' },
    { name: 'Dubai - Marina / JBR', lat: '25.077200', lng: '55.133200', city: 'Dubai' },
    { name: 'Dubai - DIFC Financial Center', lat: '25.210000', lng: '55.280000', city: 'Dubai' }
  ],
  JP: [
    { name: 'Tokyo - Shibuya Crossing', lat: '35.659500', lng: '139.700500', city: 'Tokyo' },
    { name: 'Tokyo - Ginza Commercial', lat: '35.671900', lng: '139.764800', city: 'Tokyo' },
    { name: 'Tokyo - Shinjuku Central', lat: '35.693800', lng: '139.703400', city: 'Tokyo' }
  ],
  CO: [
    { name: 'Bogotá - Zona T / El Retiro', lat: '4.667500', lng: '-74.053800', city: 'Bogotá' },
    { name: 'Bogotá - Chapinero Alto', lat: '4.648000', lng: '-74.060000', city: 'Bogotá' },
    { name: 'Medellín - El Poblado / Provenza', lat: '6.208500', lng: '-75.567000', city: 'Medellín' },
    { name: 'Medellín - Laureles', lat: '6.244000', lng: '-75.592000', city: 'Medellín' }
  ],
  AR: [
    { name: 'Buenos Aires - Palermo Soho', lat: '-34.588000', lng: '-58.430000', city: 'Buenos Aires' },
    { name: 'Buenos Aires - Recoleta', lat: '-34.587000', lng: '-58.393000', city: 'Buenos Aires' },
    { name: 'Buenos Aires - Puerto Madero', lat: '-34.611000', lng: '-58.364000', city: 'Buenos Aires' }
  ],
  CL: [
    { name: 'Santiago - Providencia', lat: '-33.426000', lng: '-70.612000', city: 'Santiago' },
    { name: 'Santiago - Las Condes / El Golf', lat: '-33.415000', lng: '-70.598000', city: 'Santiago' }
  ],
  AU: [
    { name: 'Sydney - CBD / George St', lat: '-33.868800', lng: '151.209300', city: 'Sydney' },
    { name: 'Sydney - Surry Hills', lat: '-33.886000', lng: '151.212000', city: 'Sydney' },
    { name: 'Melbourne - CBD / Flinders', lat: '-37.817500', lng: '144.967100', city: 'Melbourne' }
  ]
};

const COMMERCIAL_VERTICALS = [
  { key: 'restaurant', name: 'Restaurante / Alimentos', icon: '🍽️', desc: 'Comida rápida, formal, cafeterías y bares' },
  { key: 'cafe', name: 'Cafetería / Coffee Shop', icon: '☕', desc: 'Cafés de especialidad, panaderías y postres' },
  { key: 'pharmacy', name: 'Farmacia / Salud', icon: '💊', desc: 'Farmacias, consultorios y ópticas' },
  { key: 'gym', name: 'Gimnasio / Fitness', icon: '🏋️', desc: 'Centros deportivos, crossfit y yoga' },
  { key: 'car_wash', name: 'Autolavado / Taller', icon: '🚗', desc: 'Lavados, detallado y refacciones' },
  { key: 'local_retail', name: 'Comercio / Retail Local', icon: '🛍️', desc: 'Boutiques, minisúpers, papelerías y regalos' }
];

export default function GeoScorePublicPage() {
  const [selectedCountry, setSelectedCountry] = useState('MX');
  const [vertical, setVertical] = useState('restaurant');
  const [lat, setLat] = useState('19.433890');
  const [lng, setLng] = useState('-99.191250');
  const [locationName, setLocationName] = useState('CDMX - Polanco');
  const [radiusMeters, setRadiusMeters] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);

  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    const firstLoc = INTERNATIONAL_LOCATIONS[countryCode]?.[0];
    if (firstLoc) {
      setLat(firstLoc.lat);
      setLng(firstLoc.lng);
      setLocationName(firstLoc.name);
    }
    setScoreResult(null);
  };

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
          countryCode: selectedCountry,
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
      toast.error(err.message || 'Error al calcular. Reintentando...');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!scoreResult) return;
    try {
      const doc = new jsPDF();
      doc.setFillColor(15, 23, 42); // Dark background
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('GEOBOOKER GEOSCORE™', 14, 20);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Estudio de Mercado Express Internacional · Certificado Oficial', 14, 28);
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 150, 28);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Ubicación Analizada: ${locationName} (${selectedCountry})`, 14, 52);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Giro Evaluado: ${COMMERCIAL_VERTICALS.find(v => v.key === vertical)?.name || vertical}`, 14, 60);
      doc.text(`Radio de Influencia: ${radiusMeters} metros | Coordenadas: ${lat}, ${lng}`, 14, 66);

      // Score Box
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(14, 75, 182, 35, 3, 3, 'F');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('RESULTADO GLOBAL GEOSCORE:', 20, 88);

      doc.setFontSize(26);
      doc.setTextColor(37, 99, 235);
      doc.text(`${scoreResult.score}/100`, 20, 102);

      doc.setFontSize(16);
      doc.setTextColor(16, 185, 129);
      doc.text(`Calificación: Grado ${scoreResult.grade}`, 120, 95);

      // Diagnosis
      doc.setFontSize(11);
      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'bold');
      doc.text('Diagnóstico Estratégico:', 14, 122);
      doc.setFont('helvetica', 'normal');
      const splitText = doc.splitTextToSize(scoreResult.recommendation || '', 180);
      doc.text(splitText, 14, 128);

      // 5 Pillars Breakdown
      doc.setFont('helvetica', 'bold');
      doc.text('Desglose de los 5 Pilares Comerciales:', 14, 150);
      doc.setFont('helvetica', 'normal');
      doc.text(`1. Competencia Directa: ${scoreResult.breakdown?.competition?.score ?? 0} pts (${scoreResult.breakdown?.competition?.count ?? 0} competidores)`, 18, 158);
      doc.text(`2. Sinergia Comercial: ${scoreResult.breakdown?.complementarity?.score ?? 0} pts (${scoreResult.breakdown?.complementarity?.count ?? 0} comercios ancla)`, 18, 166);
      doc.text(`3. Densidad Total: ${scoreResult.breakdown?.density?.score ?? 0} pts (${scoreResult.breakdown?.density?.totalNearby ?? 0} negocios en radio)`, 18, 174);
      doc.text(`4. Accesibilidad y Conectividad: ${scoreResult.breakdown?.accessibility?.score ?? 0} pts`, 18, 182);
      doc.text(`5. Calidad y Confianza de Datos: ${scoreResult.breakdown?.confidence?.score ?? 0}%`, 18, 190);

      // Footer
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('Servicio gratuito de Estudio de Mercado Express por Geobooker hasta Enero 2027.', 14, 275);
      doc.text('Visita https://geobooker.com.mx para registrar tu negocio o acceder a más herramientas.', 14, 282);

      doc.save(`GeoScore_${locationName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      toast.success('¡PDF descargado con éxito!');
    } catch (err) {
      toast.error('No se pudo generar el PDF');
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
            Evalúa la viabilidad comercial de cualquier punto en México, España, EE. UU., Colombia, Argentina y Chile. Analiza competencia, flujo potencial y densidad de mercado al instante.
          </p>
        </div>
      </div>

      {/* Main Interactive Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid gap-8 lg:grid-cols-12 items-start">
          
          {/* Left Column: Form & Configuration */}
          <div className="lg:col-span-5 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Compass className="h-5 w-5 text-cyan-400" /> Configura tu Estudio
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Selecciona el país, giro y las coordenadas a evaluar.
            </p>

            {/* Country Selector */}
            <div className="mt-5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Globe2 className="h-3.5 w-3.5 text-cyan-400" /> 1. País / Mercado
              </label>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {COUNTRY_OPTIONS.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryChange(c.code)}
                    className={`flex items-center justify-center gap-1.5 rounded-xl border p-2 text-xs font-bold transition-all ${
                      selectedCountry === c.code
                        ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                        : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vertical Picker */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">2. Giro Comercial</label>
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

            {/* Quick Cities for selected country */}
            <div className="mt-6">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400">3. Polos Comerciales en {COUNTRY_OPTIONS.find(c => c.code === selectedCountry)?.name}</label>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(INTERNATIONAL_LOCATIONS[selectedCountry] || []).map((loc) => (
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
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold shadow-sm'
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
                <span className="font-bold uppercase tracking-wider text-slate-400">4. Radio de Mercado</span>
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
              {loading ? 'Analizando mercado internacional...' : 'Calcular GeoScore Express Gratis'}
            </button>
            <p className="mt-2 text-center text-[11px] text-slate-400">
              ⚡ Sin costo · Válido para emprendedores e inversionistas hasta Enero 2027
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
                  <span className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-400" /> Cobertura multi-país</span>
                </div>
              </div>
            )}

            {scoreResult && (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6 animate-in fade-in duration-500">
                
                {/* Result Hero Header */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
                  <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 mb-2">
                      <ShieldCheck className="h-3.5 w-3.5" /> ESTUDIO EXPRESS COMPLETADO ({selectedCountry})
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadPDF}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-200 hover:bg-blue-500/20 transition-colors shadow-sm"
                    >
                      <Download className="h-4 w-4 text-cyan-400" /> Descargar PDF Oficial
                    </button>

                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                    >
                      <Share2 className="h-4 w-4" /> Compartir
                    </button>
                  </div>

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
