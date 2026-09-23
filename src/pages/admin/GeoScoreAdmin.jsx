import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Loader2, MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

function Badge({ tone = 'neutral', children }) {
  const tones = {
    good: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    bad: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200'
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

export default function GeoScoreAdmin() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [form, setForm] = useState({
    businessTypeKey: 'gym',
    countryCode: 'MX',
    lat: '19.432608',
    lng: '-99.133209',
    addressLabel: 'Centro, Ciudad de Mexico'
  });

  const loadStatus = async () => {
    setLoading(true);
    try {
      const result = await callLocationIntelligence('status');
      setStatus(result.status || null);
    } catch (error) {
      toast.error(error.message || 'No se pudo cargar GeoScore');
    } finally {
      setLoading(false);
    }
  };

  const runPreview = async (event) => {
    event.preventDefault();
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
      toast.success('Preview GeoScore calculado sin guardar analisis.');
    } catch (error) {
      toast.error(error.message || 'No se pudo ejecutar preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const flags = status?.flags || [];
  const sources = status?.sources || [];
  const profiles = status?.profiles || [];
  const enabled = status?.mode === 'enabled';
  const mxEnabled = status?.mxMode === 'enabled';

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-blue-600 p-2 text-white"><MapPin className="h-7 w-7" /></span>
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">GeoScore / Location Intelligence</h1>
            <p className="text-gray-500">Motor seguro para evaluar ubicaciones. Fase actual: foundation + preview, sin decisiones productivas.</p>
          </div>
        </div>
      </div>
      <button onClick={loadStatus} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 font-semibold disabled:opacity-50 dark:bg-gray-800">
        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Actualizar
      </button>
    </div>

    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
      <div className="flex gap-3">
        <ShieldCheck className="mt-1 h-5 w-5" />
        <div>
          <p className="font-bold">Fail-closed activo</p>
          <p className="mt-1 text-sm">GeoScore todavia no genera recomendaciones comerciales reales. Primero deben aprobarse fuentes, ingestion, licencias, QA y perfiles activos.</p>
        </div>
      </div>
    </div>

    {loading && <div className="flex min-h-[200px] items-center justify-center text-gray-500"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Cargando...</div>}

    {!loading && status && <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card label="Modo general" value={status.mode || 'n/d'} detail="Debe seguir disabled hasta ingestion aprobada." tone={enabled ? 'warning' : 'good'} />
        <Card label="Modo Mexico" value={status.mxMode || 'n/d'} detail="MX se activa solo con datos y QA." tone={mxEnabled ? 'warning' : 'good'} />
        <Card label="Fuentes" value={status.sourceCounts?.total || 0} detail={`${status.sourceCounts?.draft || 0} draft · ${status.sourceCounts?.active || 0} active`} tone="info" />
        <Card label="Perfiles score" value={status.profileCounts?.total || 0} detail={`${status.profileCounts?.draft || 0} draft · ${status.profileCounts?.active || 0} active`} tone="info" />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold">Preview de modelo</h2>
          <p className="mt-1 text-sm text-gray-500">No guarda analisis ni produce score final. Solo muestra factores configurados y bloqueos.</p>
          <form onSubmit={runPreview} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Tipo de negocio
              <select value={form.businessTypeKey} onChange={(event) => update('businessTypeKey', event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900">
                {['gym', 'restaurant', 'cafe', 'pharmacy', 'car_wash', 'local_retail'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">Pais
              <input value={form.countryCode} onChange={(event) => update('countryCode', event.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" />
            </label>
            <label className="text-sm font-semibold">Latitud
              <input value={form.lat} onChange={(event) => update('lat', event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" />
            </label>
            <label className="text-sm font-semibold">Longitud
              <input value={form.lng} onChange={(event) => update('lng', event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" />
            </label>
            <label className="sm:col-span-2 text-sm font-semibold">Etiqueta
              <input value={form.addressLabel} onChange={(event) => update('addressLabel', event.target.value)} className="mt-1 w-full rounded-xl border bg-white px-3 py-2 font-normal dark:bg-gray-900" />
            </label>
            <button disabled={previewLoading} className="sm:col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white disabled:opacity-50">
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />} Preview sin guardar
            </button>
          </form>
        </div>

        <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold">Resultado preview</h2>
          {!preview && <p className="mt-3 text-sm text-gray-500">Ejecuta un preview para ver pesos/factores.</p>}
          {preview && <div className="mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{preview.mode}</Badge>
              <Badge tone={preview.profileStatus === 'active' ? 'warning' : 'neutral'}>{preview.profileStatus}</Badge>
              <Badge tone="neutral">{preview.countryCode}</Badge>
            </div>
            <p><strong>Modelo:</strong> {preview.modelVersion || 'sin modelo activo'}</p>
            <p><strong>Min confidence:</strong> {preview.minimumConfidence || 'n/d'}</p>
            <div className="space-y-2">
              {(preview.factors || []).map((factor) => <div key={factor.key} className="rounded-xl border bg-gray-50 p-3 dark:bg-gray-900">
                <p className="font-semibold">{factor.key} · peso {factor.configured_weight}</p>
                <p className="mt-1 text-gray-500">{factor.explanation}</p>
              </div>)}
            </div>
          </div>}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold">Fuentes registradas</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300"><tr>{['Fuente', 'Dataset', 'Pais', 'Estado', 'Comercial', 'Actualizado'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {sources.map((source) => <tr key={`${source.source_key}-${source.dataset_key}-${source.country_code || 'global'}`}>
                  <td className="px-3 py-2 font-semibold">{source.source_key}</td>
                  <td className="px-3 py-2">{source.dataset_key}</td>
                  <td className="px-3 py-2">{source.country_code || 'Global'}</td>
                  <td className="px-3 py-2"><Badge tone={source.status === 'active' ? 'good' : 'warning'}>{source.status}</Badge></td>
                  <td className="px-3 py-2"><Badge tone={source.commercial_use_allowed ? 'good' : 'warning'}>{source.commercial_use_allowed ? 'OK' : 'pendiente'}</Badge></td>
                  <td className="px-3 py-2">{formatDate(source.updated_at)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-5 dark:border-gray-700 dark:bg-gray-800">
          <h2 className="text-xl font-bold">Perfiles de scoring</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600 dark:bg-gray-900 dark:text-gray-300"><tr>{['Tipo', 'Pais', 'Version', 'Activo', 'Confianza', 'Actualizado'].map((label) => <th key={label} className="px-3 py-2">{label}</th>)}</tr></thead>
              <tbody className="divide-y dark:divide-gray-700">
                {profiles.map((profile) => <tr key={`${profile.business_type_key}-${profile.country_code}-${profile.model_version}`}>
                  <td className="px-3 py-2 font-semibold">{profile.business_type_key}</td>
                  <td className="px-3 py-2">{profile.country_code}</td>
                  <td className="px-3 py-2">{profile.model_version}</td>
                  <td className="px-3 py-2"><Badge tone={profile.is_active ? 'warning' : 'good'}>{profile.is_active ? 'active' : 'draft'}</Badge></td>
                  <td className="px-3 py-2">{profile.minimum_confidence}</td>
                  <td className="px-3 py-2">{formatDate(profile.updated_at)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
        <h2 className="font-bold">Siguiente fase antes de activar score real</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>Validar licencias/uso comercial de DENUE, Overture y fuentes complementarias.</li>
          <li>Ingestar datasets versionados con deduplicacion y auditoria de fuentes.</li>
          <li>Crear adaptadores de competencia, demanda, complementariedad, accesibilidad y calidad.</li>
          <li>QA manual por ciudad/industria antes de activar perfiles productivos.</li>
          <li>Exponer GeoScore a negocio/ads solo cuando la confianza supere el minimo del perfil.</li>
        </ul>
      </div>
    </>}

    {!loading && !status && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900"><AlertTriangle className="mb-2 h-5 w-5" />GeoScore no disponible.</div>}
  </div>;
}
