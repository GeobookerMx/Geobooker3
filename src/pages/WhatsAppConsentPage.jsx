import React, { useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Loader2, MessageCircle, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link, useLocation } from 'react-router-dom';

const COUNTRIES = [
  ['MX', 'México (+52)'], ['US', 'Estados Unidos (+1)'], ['GB', 'Reino Unido (+44)'],
  ['ES', 'España (+34)'], ['DE', 'Alemania (+49)'], ['FR', 'Francia (+33)'],
  ['NL', 'Países Bajos (+31)'], ['CO', 'Colombia (+57)']
];

export default function WhatsAppConsentPage() {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const [form, setForm] = useState({
    fullName: '', companyName: '', phone: '', countryCode: 'MX',
    requestedService: true, requestedMarketing: false, acceptedPrivacy: false, website: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      const response = await fetch('/.netlify/functions/whatsapp-consent-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          languageCode: form.countryCode === 'MX' ? 'es_MX' : form.countryCode === 'ES' ? 'es_ES' : 'en_US',
          sourcePath: location.pathname,
          campaignCode: params.get('campaign') || params.get('utm_campaign') || null
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'No fue posible preparar la confirmación');
      setResult(payload);
    } catch (requestError) {
      const messages = {
        invalid_phone: 'El número no es válido para el país seleccionado.',
        phone_country_mismatch: 'El prefijo del número no coincide con el país seleccionado.',
        required_consent_fields_missing: 'Completa los campos obligatorios y acepta el aviso de privacidad.',
        consent_storage_unavailable: 'El registro seguro no está disponible. Intenta más tarde.',
        security_control_unavailable: 'El control de seguridad no está disponible. Intenta más tarde.'
      };
      setError(messages[requestError.message] || requestError.message);
    } finally { setLoading(false); }
  };

  if (result) return <main className="mx-auto max-w-3xl px-4 py-12 md:py-20">
    <section className="rounded-3xl border bg-white p-6 text-center shadow-xl md:p-10">
      <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
      <h1 className="mt-4 text-3xl font-black text-gray-900">Confirma desde tu WhatsApp</h1>
      <p className="mx-auto mt-3 max-w-xl text-gray-600">La autorización todavía está pendiente. Escanea el código o abre WhatsApp y envía el texto preparado desde el mismo número que registraste.</p>
      <div className="mx-auto mt-7 inline-block rounded-2xl border bg-white p-4"><QRCodeSVG value={result.waLink} size={220} level="M" /></div>
      <p className="mx-auto mt-5 max-w-xl rounded-xl bg-gray-100 px-4 py-3 font-mono text-sm text-gray-800">{result.confirmationText}</p>
      <a href={result.waLink} target="_blank" rel="noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700">Abrir WhatsApp <ExternalLink className="h-4 w-4" /></a>
      <p className="mt-4 text-xs text-gray-500">El código vence en 30 minutos. Geobooker no activará marketing si no marcaste esa opción.</p>
    </section>
  </main>;

  return <main className="mx-auto max-w-3xl px-4 py-12 md:py-20">
    <section className="overflow-hidden rounded-3xl border bg-white shadow-xl">
      <div className="bg-gradient-to-br from-emerald-700 to-teal-600 p-7 text-white md:p-10">
        <MessageCircle className="h-10 w-10" />
        <h1 className="mt-4 text-3xl font-black md:text-4xl">Habla con Geobooker por WhatsApp</h1>
        <p className="mt-3 max-w-2xl text-emerald-50">Registra tu número y confírmalo enviando un código desde tu propio WhatsApp. No compramos listas ni activamos contactos sin comprobación.</p>
      </div>
      <form onSubmit={submit} className="space-y-5 p-6 md:p-10">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm font-semibold text-gray-700">Nombre completo *<input value={form.fullName} onChange={(event) => update('fullName', event.target.value)} maxLength="120" required className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" autoComplete="name" /></label>
          <label className="text-sm font-semibold text-gray-700">Empresa o negocio<input value={form.companyName} onChange={(event) => update('companyName', event.target.value)} maxLength="160" className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" autoComplete="organization" /></label>
          <label className="text-sm font-semibold text-gray-700">País *<select value={form.countryCode} onChange={(event) => update('countryCode', event.target.value)} className="mt-2 w-full rounded-xl border px-4 py-3 font-normal">{COUNTRIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
          <label className="text-sm font-semibold text-gray-700">Número de WhatsApp *<input value={form.phone} onChange={(event) => update('phone', event.target.value)} required className="mt-2 w-full rounded-xl border px-4 py-3 font-normal" placeholder="Ej. 55 1234 5678" autoComplete="tel" inputMode="tel" /></label>
        </div>
        <input value={form.website} onChange={(event) => update('website', event.target.value)} tabIndex="-1" autoComplete="off" className="hidden" aria-hidden="true" />
        <label className="flex gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950"><input type="checkbox" checked={form.requestedService} onChange={(event) => update('requestedService', event.target.checked)} required className="mt-1" /><span><strong>Solicitud por WhatsApp.</strong> Deseo iniciar una conversación con Geobooker y recibir respuestas relacionadas con mi solicitud. Puedo responder BAJA cuando quiera.</span></label>
        <label className="flex gap-3 rounded-xl border p-4 text-sm text-gray-700"><input type="checkbox" checked={form.requestedMarketing} onChange={(event) => update('requestedMarketing', event.target.checked)} className="mt-1" /><span><strong>Marketing opcional.</strong> También acepto promociones, novedades y ofertas de Geobooker por WhatsApp. Esta autorización es independiente y puedo retirarla.</span></label>
        <label className="flex gap-3 text-sm text-gray-700"><input type="checkbox" checked={form.acceptedPrivacy} onChange={(event) => update('acceptedPrivacy', event.target.checked)} required className="mt-1" /><span>He leído el <Link to="/privacy" className="font-semibold text-emerald-700 underline">Aviso de Privacidad</Link> y los <Link to="/terms" className="font-semibold text-emerald-700 underline">Términos</Link>.</span></label>
        {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>}
        <button disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}{loading ? 'Preparando confirmación…' : 'Continuar y confirmar en WhatsApp'}</button>
        <p className="text-center text-xs text-gray-500">Enviar este formulario no activa el consentimiento por sí solo. Debes confirmar desde el mismo número de WhatsApp.</p>
      </form>
    </section>
  </main>;
}
