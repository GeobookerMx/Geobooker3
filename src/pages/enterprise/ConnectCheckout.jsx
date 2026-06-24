import React, { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { supabase } from '../../lib/supabase';
import { buildPaymentReturnUrl } from '../../services/paymentReturnUrls';
import {
  GBOOKER_CONNECT_LAUNCH,
  getGeobookerConnectPackage
} from '../../config/geobookerConnect';

const formatCurrency = (amount = 0, currency = 'MXN') => {
  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency
    }).format(Number(amount) || 0);
  } catch (_error) {
    return `$${Number(amount || 0).toFixed(2)} ${currency}`;
  }
};

export default function ConnectCheckout() {
  const [searchParams] = useSearchParams();
  const selectedPackage = useMemo(
    () => getGeobookerConnectPackage(searchParams.get('package')),
    [searchParams]
  );

  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    company_website: '',
    target_audience: selectedPackage.audience || '',
    objective: '',
    country: 'Mexico'
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.company_name || !form.contact_email || !form.target_audience || !form.objective) {
      toast.error('Completa empresa, email, audiencia y objetivo para reservar el piloto.');
      return;
    }

    setLoading(true);

    try {
      const leadId = crypto.randomUUID();
      const campaignId = crypto.randomUUID();

      const metadataPayload = {
        service_line: 'geobooker_connect',
        lead_type: 'connect_launch_checkout',
        package_code: selectedPackage.code,
        package_name: selectedPackage.name,
        launch_offer_code: GBOOKER_CONNECT_LAUNCH.code,
        target_audience: form.target_audience,
        objective: form.objective,
        company_website: form.company_website || null,
        reservation_price_mxn: selectedPackage.reservationPriceMxn,
        batch_size: selectedPackage.batchSize
      };

      const { error: leadError } = await supabase
        .from('enterprise_leads')
        .insert({
          id: leadId,
          company_name: form.company_name,
          contact_name: form.contact_name || null,
          contact_email: form.contact_email,
          contact_phone: form.contact_phone || null,
          country: form.country || 'Mexico',
          industry: 'Geobooker Connect',
          company_website: form.company_website || null,
          selected_plan: selectedPackage.name,
          target_cities: form.target_audience,
          budget_range: `${selectedPackage.reservationPriceMxn} MXN launch reservation`,
          service_line: 'geobooker_connect',
          intake_source: 'connect_checkout',
          launch_offer_code: GBOOKER_CONNECT_LAUNCH.code,
          pricing_snapshot: {
            reservation_price_mxn: selectedPackage.reservationPriceMxn,
            package_code: selectedPackage.code,
            package_name: selectedPackage.name
          },
          message: JSON.stringify(metadataPayload),
          status: 'new'
        });

      if (leadError) throw leadError;

      const { error: campaignError } = await supabase
        .from('connect_campaigns')
        .insert({
          id: campaignId,
          enterprise_lead_id: leadId,
          package_code: selectedPackage.code,
          package_name: selectedPackage.name,
          campaign_objective: form.objective,
          target_audience: form.target_audience,
          batch_size: selectedPackage.batchSize,
          launch_price_mxn: selectedPackage.reservationPriceMxn,
          billing_email: form.contact_email,
          metadata: metadataPayload
        });

      if (campaignError) throw campaignError;

      const response = await fetch('/.netlify/functions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: selectedPackage.reservationPriceMxn * 100,
          currency: 'mxn',
          productName: `${selectedPackage.name} - Reserva de lanzamiento`,
          customerEmail: form.contact_email,
          successUrl: buildPaymentReturnUrl(`/b2b-connect/success?campaign=${campaignId}`),
          cancelUrl: buildPaymentReturnUrl(`/b2b-connect/checkout?package=${selectedPackage.code}&canceled=true`),
          metadata: {
            type: 'connect_launch_payment',
            connect_campaign_id: campaignId,
            enterprise_lead_id: leadId,
            package_code: selectedPackage.code,
            package_name: selectedPackage.name,
            company_name: form.company_name,
            billing_email: form.contact_email,
            reservation_price_mxn: selectedPackage.reservationPriceMxn
          }
        })
      });

      const session = await response.json();
      if (!response.ok || !session.url) {
        throw new Error(session.error || 'No pudimos iniciar el checkout de Stripe.');
      }

      window.location.href = session.url;
    } catch (error) {
      console.error('[ConnectCheckout] Error creating launch checkout:', error);
      toast.error(error.message || 'No pudimos crear tu reserva de lanzamiento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <SEO
        title="Checkout Geobooker Connect"
        description="Reserva el piloto de lanzamiento de Geobooker Connect con checkout seguro."
      />

      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/b2b-connect"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Geobooker Connect
        </Link>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
              <BadgeCheck className="w-4 h-4" />
              Checkout de reserva
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mt-4">
              Reserva tu piloto Geobooker Connect
            </h1>
            <p className="text-slate-300 mt-3">
              Esta reserva activa la revision del brief, aparta capacidad operativa y nos permite
              estructurar un piloto B2B administrado sin contaminar los remitentes o el CRM
              principal de Geobooker.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 mt-8">
              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-slate-300">Empresa / Marca *</span>
                  <input
                    name="company_name"
                    value={form.company_name}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                    placeholder="Tu empresa"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Email corporativo *</span>
                  <input
                    type="email"
                    name="contact_email"
                    value={form.contact_email}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                    placeholder="ceo@tuempresa.mx"
                  />
                </label>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-sm text-slate-300">Nombre de contacto</span>
                  <input
                    name="contact_name"
                    value={form.contact_name}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                    placeholder="Ing. / Lic."
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-slate-300">Telefono / WhatsApp</span>
                  <input
                    name="contact_phone"
                    value={form.contact_phone}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                    placeholder="+52..."
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-sm text-slate-300">Sitio web</span>
                <input
                  name="company_website"
                  value={form.company_website}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                  placeholder="https://..."
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Audiencia objetivo *</span>
                <input
                  name="target_audience"
                  value={form.target_audience}
                  onChange={handleChange}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white"
                  placeholder="Ej: talleres pesados en Monterrey"
                />
              </label>

              <label className="block">
                <span className="text-sm text-slate-300">Objetivo del piloto *</span>
                <textarea
                  name="objective"
                  value={form.objective}
                  onChange={handleChange}
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white resize-none"
                  placeholder="Describe la oferta, el giro, la urgencia comercial y el resultado que quieres medir."
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 font-bold text-slate-950 hover:bg-emerald-400 transition disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Preparando checkout...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Pagar {formatCurrency(selectedPackage.reservationPriceMxn)} MXN
                  </>
                )}
              </button>
            </form>
          </section>

          <aside className="rounded-3xl border border-white/10 bg-gradient-to-b from-white/10 to-white/5 p-6 md:p-8">
            <h2 className="text-2xl font-bold">{selectedPackage.name}</h2>
            <p className="text-sm text-slate-300 mt-2">{selectedPackage.summary}</p>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 mt-6">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-semibold">
                Anticipo de lanzamiento
              </p>
              <p className="text-4xl font-black mt-2">
                {formatCurrency(selectedPackage.reservationPriceMxn)}
              </p>
              <p className="text-sm text-slate-200 mt-2">
                Hasta {selectedPackage.batchSize.toLocaleString('es-MX')} contactos elegibles por
                lote piloto, sujeto a brief aprobado y reglas de cumplimiento.
              </p>
            </div>

            <div className="mt-6 space-y-3 text-sm text-slate-200">
              {GBOOKER_CONNECT_LAUNCH.guardrails.map((item) => (
                <div key={item} className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 mt-0.5 text-emerald-300 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
