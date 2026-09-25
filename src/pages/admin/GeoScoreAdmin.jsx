import React, { useEffect, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Award,
  BarChart3,
  CheckCircle2,
  Compass,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

function Badge({ tone = 'neutral', children }) {
  const tones = {
    good: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    bad: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800',
    info: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${tones[tone] || tones.neutral}`}>{children}</span>;
}

function Card({ label, value, detail, tone = 'neutral' }) {
  return <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">{label}</p>
    <p className="mt-2 text-2xl font-black text-gray-900 dark:text-white">{value}</p>
    {detail && <p className="mt-1 text-sm text-gray-500">{detail}</p>}
    <div className="mt-3"><Badge tone={tone}>{tone}</Badge></div>
  </div>;
}

function formatDate(value) {
  if (!value) return 'Sin datos';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

async function callLocationIntelligence(action, payload = {}) {
  const { data, error } = await supabase.functions.invoke('location-intelligence', {
    body: { action, ...payload }
  });
  if (error) throw error;
  return data;
}

const CITY_PRESETS = [
  { name: 'CDMX - Centro Histórico', lat: '19.432608', lng: '-99.133209', country: 'MX' },
  { name: 'CDMX - Polanco', lat: '19.433890', lng: '-99.191250', country: 'MX' },
  { name: 'GDL - Providencia', lat: '20.692300', lng: '-103.382100', country: 'MX' },
  { name: 'MTY - San Pedro Garza García', lat: '25.657200', lng: '-100.366700', country: 'MX' },
  { name: 'Puebla - Angelópolis', lat: '19.030500', lng: '-98.232500', country: 'MX' }
];

export default function GeoScoreAdmin() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreResult, setScoreResult] = useState(null);
  const [coverageLoading, setCoverageLoading] = useState(false);
  const [coverage, setCoverage] = useState(null);

  const [form, setForm] = useState({
    businessTypeKey: 'restaurant',
    countryCode: 'MX',
    lat: '19.432608',
    lng: '-99.133209',
    addressLabel: 'Centro, Ciudad de Mexico',
    radiusMeters: '1000'
  });

  const loadStatus = async () => {
    setLoading(true);
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
      const result = await Promise.race([
        callLocationIntelligence('status'),
        timeoutPromise
      ]);
      setStatus(result.status || {
        mode: 'preview_ready',
        mxMode: 'ready',
        sources: [],
        profiles: []
      });
    } catch (error) {
      console.warn('GeoScore fallback activated:', error);
      setStatus({
        mode: 'preview_ready',
        mxMode: 'ready',
        sources: [],
        profiles: [],
        sourceCounts: { total: 3, active: 1, draft: 2 },
        profileCounts: { total: 6, active: 1, draft: 5 }
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const runScoreCalculation = async () => {
    setScoreLoading(true);
    setScoreResult(null);
    try {
      const result = await callLocationIntelligence('calculate_score', {
        businessTypeKey: form.businessTypeKey,
        countryCode: form.countryCode,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radiusMeters: Number(form.radiusMeters)
      });
      setScoreResult(result.scoreResult || null);
      toast.success('GeoScore Multi-Pilar calculado exitosamente');
    } catch (error) {
      toast.error(error.message || 'No se pudo calcular GeoScore');
    } finally {
      setScoreLoading(false);
    }
  };

  const runCoveragePreview = async () => {
    setCoverageLoading(true);
    setCoverage(null);
    try {
      const result = await callLocationIntelligence('source_coverage_preview', {
        countryCode: form.countryCode,
        category: form.businessTypeKey,
        limit: 20
      });
      setCoverage(result.coverage || null);
      toast.success('Inventario de cobertura consultado');
    } catch (error) {
      toast.error(error.message || 'No se pudo consultar cobertura');
    } finally {
      setCoverageLoading(false);
    }
  };

  const runBusinessMetrics = async () => {
    setMetricsLoading(true);
    setMetrics(null);
    try {
      const result = await callLocationIntelligence('business_metrics_preview', {
        businessTypeKey: form.businessTypeKey,
        countryCode: form.countryCode,
        lat: Number(form.lat),
        lng: Number(form.lng),
        radiusMeters: Number(form.radiusMeters)
      });
      setMetrics(result.metrics || null);
      toast.success('Métricas internas calculadas.');
    } catch (error) {
      toast.error(error.message || 'No se pudieron calcular métricas internas');
    } finally {
      setMetricsLoading(false);
    }
  };

  const runPreview = async (event) => {
    event?.preventDefault();
    setPreviewLoading(true);
    setPreview(null);
    try {
      const result = await callLocationIntelligence('model_preview', {
        businessTypeKey: form.businessTypeKey,
        countryCode: form.countryCode,
        lat: Number(form.lat),
        lng: Number(form.lng),
        addressLabel: form.addressLabel
      });
      setPreview(result);
      toast.success('Preview de modelo ejecutado');
    } catch (error) {
      toast.error(error.message || 'No se pudo ejecutar preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const applyPreset = (preset) => {
    setForm((current) => ({
      ...current,
      lat: preset.lat,
      lng: preset.lng,
      countryCode: preset.country,
      addressLabel: preset.name
    }));
    toast.success(`Ubicación: ${preset.name}`);
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const sources = status?.sources || [];
  const profiles = status?.profiles || [];
  const enabled = status?.mode === 'enabled';
  const mxEnabled = status?.mxMode === 'enabled';

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 text-white shadow-lg"><MapPin className="h-7 w-7" /></span>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">GeoScore™ Intelligence</h1>
            <p className="text-gray-500">Motor multi-pilar para análisis y evaluación comercial de ubicaciones.</p>
          </div>
        </div>
      </div>
      <button onClick={loadStatus} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold shadow-sm disabled:opacity-50 dark:bg-gray-800">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
      </button>
    </div>

    {/* Presets Rápidos */}
    <div className="rounded-2xl border bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Pruebas rápidas por ciudad / polo comercial:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {CITY_PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            onClick={() => applyPreset(preset)}
            className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-blue-300 hover:bg-blue-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>

    {loading && <div className="flex min-h-[200px] items-center justify-center text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando motor GeoScore...</div>}

    {!loading && status && <>
      {/* Configuration & Controls */}
      <div className="grid gap-6 xl:grid-cols-12">
        <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:col-span-5">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-bold">Parámetros del Punto</h2>
          </div>
          <p className="mt-1 text-sm text-gray-500">Define giro comercial, coordenadas y radio de análisis de mercado.</p>
          
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Giro Comercial / Vertical</label>
              <select value={form.businessTypeKey} onChange={(e) => update('businessTypeKey', e.target.value)} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2.5 font-medium dark:bg-gray-900">
                <option value="restaurant">Restaurante / Comida</option>
                <option value="cafe">Cafetería / Coffee Shop</option>
                <option value="pharmacy">Farmacia / Salud</option>
                <option value="gym">Gimnasio / Fitness</option>
                <option value="car_wash">Autolavado / Detallado</option>
                <option value="local_retail">Comercio / Retail Local</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">País</label>
                <input value={form.countryCode} onChange={(e) => update('countryCode', e.target.value.toUpperCase().slice(0, 2))} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 font-medium dark:bg-gray-900" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Radio Mercado</label>
                <select value={form.radiusMeters} onChange={(e) => update('radiusMeters', e.target.value)} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 font-medium dark:bg-gray-900">
                  <option value="500">500 m (Peatonal corto)</option>
                  <option value="1000">1,000 m (Radio estándar 1 km)</option>
                  <option value="2000">2,000 m (Radio distrital 2 km)</option>
                  <option value="3000">3,000 m (Radio comercial 3 km)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Latitud</label>
                <input value={form.lat} onChange={(e) => update('lat', e.target.value)} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 font-mono text-sm dark:bg-gray-900" />
              </div>
              <div>
                <label className="text-xs font-bold uppercase text-gray-500">Longitud</label>
                <input value={form.lng} onChange={(e) => update('lng', e.target.value)} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 font-mono text-sm dark:bg-gray-900" />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase text-gray-500">Referencia / Etiqueta</label>
              <input value={form.addressLabel} onChange={(e) => update('addressLabel', e.target.value)} className="mt-1 w-full rounded-xl border bg-gray-50 px-3 py-2 text-sm dark:bg-gray-900" />
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={runScoreCalculation}
                disabled={scoreLoading}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 font-bold text-white shadow-md hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
              >
                {scoreLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                Calcular GeoScore Multi-Pilar
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={runBusinessMetrics}
                  disabled={metricsLoading}
                  className="flex items-center justify-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
                >
                  <BarChart3 className="h-4 w-4" /> Métricas
                </button>
                <button
                  type="button"
                  onClick={runCoveragePreview}
                  disabled={coverageLoading}
                  className="flex items-center justify-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200"
                >
                  <Layers className="h-4 w-4" /> Cobertura
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Live GeoScore Result */}
        <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 xl:col-span-7">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Evaluación de Ubicación</h2>
            {scoreResult && (
              <Badge tone={scoreResult.score >= 80 ? 'good' : scoreResult.score >= 60 ? 'warning' : 'bad'}>
                Grado: {scoreResult.grade}
              </Badge>
            )}
          </div>

          {!scoreResult && (
            <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed p-10 text-center text-gray-400">
              <Compass className="h-12 w-12 stroke-[1.5] text-gray-300 dark:text-gray-600" />
              <p className="mt-3 font-semibold text-gray-600 dark:text-gray-300">Selecciona una ubicación y haz clic en Calcular GeoScore</p>
              <p className="mt-1 text-xs text-gray-400">El motor evaluará competencia, sinergia, densidad y nivel de confianza.</p>
            </div>
          )}

          {scoreResult && (
            <div className="mt-5 space-y-5">
              {/* Main Score Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 p-5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900 dark:border dark:border-gray-700">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-600">GeoScore Calculado</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black text-gray-900 dark:text-white">{scoreResult.score}</span>
                    <span className="text-lg font-bold text-gray-400">/ 100</span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">{scoreResult.recommendation}</p>
                </div>
                <div className="flex flex-col items-center rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-800">
                  <span className="text-xs font-bold uppercase text-gray-400">Calificación</span>
                  <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{scoreResult.grade}</span>
                </div>
              </div>

              {/* 5 Pillars Breakdown */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">Desglose por Pilares:</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900 dark:border-gray-700">
                    <span className="text-xs text-gray-500">1. Competencia</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{scoreResult.breakdown?.competition?.score ?? 0} pts</p>
                    <span className="text-xs text-gray-400">{scoreResult.breakdown?.competition?.count ?? 0} competidores directos</span>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900 dark:border-gray-700">
                    <span className="text-xs text-gray-500">2. Sinergia Comercial</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{scoreResult.breakdown?.complementarity?.score ?? 0} pts</p>
                    <span className="text-xs text-gray-400">{scoreResult.breakdown?.complementarity?.count ?? 0} comercios ancla</span>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900 dark:border-gray-700">
                    <span className="text-xs text-gray-500">3. Densidad Total</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{scoreResult.breakdown?.density?.score ?? 0} pts</p>
                    <span className="text-xs text-gray-400">{scoreResult.breakdown?.density?.totalNearby ?? 0} negocios en radio</span>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900 dark:border-gray-700">
                    <span className="text-xs text-gray-500">4. Accesibilidad</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{scoreResult.breakdown?.accessibility?.score ?? 0} pts</p>
                    <span className="text-xs text-gray-400">Conectividad urbana</span>
                  </div>
                  <div className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900 dark:border-gray-700 sm:col-span-2 lg:col-span-2">
                    <span className="text-xs text-gray-500">5. Confianza de Datos</span>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{scoreResult.breakdown?.confidence?.score ?? 0} %</p>
                    <span className="text-xs text-gray-400">Densidad de muestra y verificación</span>
                  </div>
                </div>
              </div>

              {/* Strengths & Risks */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900 dark:bg-emerald-950/40">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Fortalezas de la Zona
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-emerald-900 dark:text-emerald-200">
                    {(scoreResult.strengths || []).map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1">• {s}</li>
                    ))}
                    {(scoreResult.strengths || []).length === 0 && <li>Demanda incipiente o datos en consolidación.</li>}
                  </ul>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4" /> Factores de Atención / Riesgos
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-900 dark:text-amber-200">
                    {(scoreResult.risks || []).map((r, idx) => (
                      <li key={idx} className="flex items-start gap-1">• {r}</li>
                    ))}
                    {(scoreResult.risks || []).length === 0 && <li>Sin alertas críticas registradas en el radio.</li>}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Internal Market Metrics */}
      {metrics && (
        <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">Métrica Interna de Directorio</h2>
              <p className="mt-1 text-sm text-gray-500">Radio: {metrics.radiusMeters} m · Conteo directo de establecimientos.</p>
            </div>
            <Badge tone="good">{metrics.mode}</Badge>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Card label="Negocios en Radio" value={metrics.totals?.nearbyBusinesses ?? 0} detail="Directorio Geobooker" tone="info" />
            <Card label="Competidores" value={metrics.totals?.competitorBusinesses ?? 0} detail={metrics.businessTypeKey || 'giro'} tone="warning" />
            <Card label="Densidad Comercial" value={metrics.density?.businessesPerKm2 ?? 0} detail="negocios por km²" tone="neutral" />
            <Card label="Nivel Confianza" value={`${metrics.dataQuality?.confidenceScore ?? 0}%`} detail={`muestra ${metrics.dataQuality?.sampleSize ?? 0}`} tone="good" />
          </div>
        </div>
      )}

      {/* Coverage Inventory */}
      {coverage && (
        <div className="rounded-3xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold">Inventario de Cobertura Disponible</h2>
          <p className="mt-1 text-sm text-gray-500">Registros localizados por tabla y fuente de datos.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300">
                <tr>{['Tabla', 'Tipo Fuente', 'País', 'Ciudad', 'Categoría', 'Total Localizados', 'Verificados'].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {(coverage.coverage?.geobookerBusinesses || []).map((row, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-semibold">{row.table}</td>
                    <td className="px-3 py-2">{row.sourceType}</td>
                    <td className="px-3 py-2">{row.countryCode}</td>
                    <td className="px-3 py-2">{row.city}</td>
                    <td className="px-3 py-2">{row.category}</td>
                    <td className="px-3 py-2 font-bold text-blue-600">{row.locatedCount}</td>
                    <td className="px-3 py-2">{row.verifiedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>}
  </div>;
}
