import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Mail, Phone, Globe,
    Send, CheckCircle, Loader2,
    Target, Zap, Shield, ChevronRight, BarChart3,
    ArrowRight, BadgeCheck, Workflow
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { getStoredQrAttribution } from '../../services/qrAttributionService';
import { getCrossPlatformPackage } from '../../config/crossPlatformPackages';
import {
    GBOOKER_CONNECT_LAUNCH,
    GBOOKER_CONNECT_PACKAGES,
    getGeobookerConnectPackage
} from '../../config/geobookerConnect';

export default function B2bConnect() {
    const [searchParams] = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const selectedPackage = getCrossPlatformPackage(searchParams.get('package'));
    const connectPackage = getGeobookerConnectPackage(searchParams.get('package'));

    const [form, setForm] = useState({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        country: 'Mexico',
        company_website: '',
        target_audience: '',
        message: ''
    });

    useEffect(() => {
        if (!selectedPackage) return;

        setForm((prev) => ({
            ...prev,
            target_audience: prev.target_audience || selectedPackage.audience,
            message: prev.message || `Me interesa el ${selectedPackage.name}. Busco una propuesta para ${selectedPackage.audience}.`
        }));
    }, [selectedPackage]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.company_name || !form.contact_email || !form.target_audience) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        try {
            setSubmitting(true);
            const qrAttribution = getStoredQrAttribution();

            const leadId = crypto.randomUUID();
            const payload = {
                id: leadId,
                company_name: form.company_name,
                contact_name: form.contact_name,
                contact_email: form.contact_email,
                contact_phone: form.contact_phone || null,
                country: form.country || 'Mexico',
                company_website: form.company_website || null,
                industry: 'Geobooker Connect',
                service_line: 'geobooker_connect',
                intake_source: 'b2b_connect_landing',
                launch_offer_code: GBOOKER_CONNECT_LAUNCH.code,
                pricing_snapshot: {
                    reservation_price_mxn: connectPackage.reservationPriceMxn,
                    package_code: connectPackage.code,
                    package_name: connectPackage.name,
                    batch_size: connectPackage.batchSize
                },
                target_cities: form.target_audience,
                selected_plan: connectPackage.name,
                budget_range: `${connectPackage.reservationPriceMxn} MXN launch reservation`,
                message: JSON.stringify({
                    service_line: 'geobooker_connect',
                    lead_type: 'b2b_connect',
                    target_audience: form.target_audience,
                    notes: form.message || '',
                    company_website: form.company_website || null,
                    contact_phone: form.contact_phone || null,
                    package_code: connectPackage.code,
                    package_name: connectPackage.name,
                    launch_offer_code: GBOOKER_CONNECT_LAUNCH.code,
                    reservation_price_mxn: connectPackage.reservationPriceMxn,
                    batch_size: connectPackage.batchSize,
                    source: 'b2b_connect_landing',
                    qr_attribution: qrAttribution || null,
                    submitted_at: new Date().toISOString()
                }),
                status: 'new'
            };

            let { error } = await supabase.from('enterprise_leads').insert(payload);

            if (error) {
                console.warn('B2B insert with extended payload failed, retrying minimal payload:', error);
                const fallback = {
                    id: leadId,
                    company_name: form.company_name,
                    contact_name: form.contact_name,
                    contact_email: form.contact_email,
                    country: form.country || 'Mexico',
                    target_cities: form.target_audience,
                    service_line: 'geobooker_connect',
                    intake_source: 'b2b_connect_landing',
                    launch_offer_code: GBOOKER_CONNECT_LAUNCH.code,
                    message: form.message || `Lead B2B desde Geobooker Connect. Paquete: ${connectPackage.name}`,
                    status: 'new'
                };

                const retry = await supabase.from('enterprise_leads').insert(fallback);
                error = retry.error;
            }

            if (error) throw error;

            try {
                const notifyResponse = await fetch('/.netlify/functions/notify-connect-brief', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        lead: {
                            ...payload,
                            id: leadId,
                            message: payload.message
                        }
                    })
                });

                const notifyPayload = await notifyResponse.json().catch(() => ({}));
                if (!notifyResponse.ok || notifyPayload.error) {
                    console.warn('[B2bConnect] Brief notification failed:', notifyPayload.error || notifyPayload);
                }
            } catch (notifyError) {
                console.warn('[B2bConnect] Brief notification skipped:', notifyError);
            }

            setSubmitted(true);
            toast.success('Solicitud inicial recibida con exito');

        } catch (error) {
            console.error('Error enviando formulario B2B:', error);
            toast.error(`No pudimos registrar tu solicitud. Intenta de nuevo o escribenos a hola@geobooker.com.mx. ${error.message || ''}`);
        } finally {
            setSubmitting(false);
        }
    };

    const applyPackageToForm = (pkg) => {
        setForm((prev) => ({
            ...prev,
            target_audience: pkg.audience,
            message: prev.message || `Me interesa ${pkg.name}. Busco un piloto gestionado para ${pkg.audience}.`
        }));
        document.getElementById('b2b-form')?.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-x-hidden">
            <SEO
                title="Geobooker Connect - Outbound B2B gestionado"
                description="Servicio gestionado de prospeccion B2B por Geobooker Connect para mayoristas, proveedores logisticos y verticales industriales."
            />

            <div className="relative py-16 lg:py-24 px-4 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-amber-600/30 to-emerald-800/20 rounded-full blur-3xl opacity-50"></div>
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition">
                        <ArrowLeft className="w-4 h-4" />
                        Regresar a la pagina principal
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 px-4 py-2 rounded-full mb-6 border border-amber-500/30">
                                <Zap className="w-4 h-4" />
                                <span className="font-bold text-sm tracking-wide">LANZAMIENTO EXCLUSIVO MEXICO</span>
                            </div>

                            <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-semibold">
                                    {GBOOKER_CONNECT_LAUNCH.offerLabel}
                                </p>
                                <h2 className="text-2xl font-bold text-white mt-2">
                                    {`Reserva tu piloto desde $${GBOOKER_CONNECT_LAUNCH.reservationPriceMxn.toLocaleString('es-MX')} MXN`}
                                </h2>
                                <p className="text-sm text-slate-300 mt-2">
                                    Anticipo operativo para estructurar un piloto gestionado de hasta {GBOOKER_CONNECT_LAUNCH.batchSize.toLocaleString('es-MX')} contactos elegibles.
                                </p>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
                                Geobooker <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Connect</span>.
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-300 font-light mb-8 max-w-lg leading-relaxed">
                                No persiga clientes a ciegas. Estructure un piloto gestionado para llegar al tomador de decisiones con segmentacion, copy y ejecucion controlada.
                            </p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {[
                                    'Mayoristas',
                                    'Proveedores logisticos',
                                    'Refaccionarias',
                                    'Talleres pesados',
                                    'Servicios industriales'
                                ].map((tag) => (
                                    <span key={tag} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200">
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={() => document.getElementById('b2b-form')?.scrollIntoView({ behavior: 'smooth' })}
                                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                >
                                    Estructurar mi Campana
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                                <Link
                                    to={`/b2b-connect/checkout?package=${connectPackage.code}`}
                                    className="border border-emerald-400/40 bg-emerald-500/10 text-emerald-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    Reservar Piloto
                                    <ChevronRight className="w-5 h-5" />
                                </Link>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-blue-500/10 rounded-3xl transform rotate-3 scale-105"></div>
                            <div className="relative bg-gray-900/60 backdrop-blur-xl border border-gray-700 p-8 rounded-3xl shadow-2xl">
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">16,000+</div>
                                        <div className="text-yellow-500 font-medium text-sm">Contactos y nichos operables por vertical</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">$500</div>
                                        <div className="text-green-500 font-medium text-sm">Reserva de lanzamiento por piloto</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        'Identificacion del Candidato Ideal (ICP)',
                                        'Construccion o depuracion de audiencias por nicho',
                                        'Piloto outbound gestionado con copy y validacion',
                                        'Seguimiento estadistico de aperturas, clics y respuestas'
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-start gap-3">
                                            <CheckCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                            <span className="text-gray-300">{feat}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <section className="py-20 px-4 bg-gray-900/50 border-y border-gray-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">Que incluye Geobooker Connect</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Infraestructura de outreach, copy y seguimiento para operar pilotos B2B sin mezclar ni ensuciar el producto principal.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors">
                            <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                                <Target className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Segmentacion</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Construimos lotes objetivo por estado, ciudad, corredor o vertical para que el outreach salga con un ICP claro y una operacion defendible.
                            </p>
                        </div>
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">TOP</div>
                            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-6">
                                <Mail className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Copy y secuencia</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Redactamos mensajes B2B con layout profesional y cadencia controlada para no maltratar reputacion ni prometer automatizaciones irreales.
                            </p>
                        </div>
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors">
                            <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Piloto controlado</h3>
                            <p className="text-gray-400 leading-relaxed">
                                El piloto se reserva con anticipo y se ejecuta por lotes controlados solo despues de validar brief, audiencia, copy, remitente y cumplimiento.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-16 px-4 bg-black/30 border-y border-white/5">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
                    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Que puede esperar de Geobooker Connect</h2>
                        <div className="space-y-3 text-sm text-emerald-50">
                            <p>Segmentacion por nicho, zona y perfil de cliente ideal.</p>
                            <p>Preparacion de audiencia elegible y filtros de exclusion.</p>
                            <p>Ejecucion por lotes controlados con copy B2B y seguimiento medible.</p>
                            <p>Reporte con enviados, aperturas, clics, respuestas, rebotes y siguiente recomendacion.</p>
                        </div>
                    </div>
                    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-8">
                        <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">Lo que no debemos vender como promesa</h2>
                        <div className="space-y-3 text-sm text-amber-50">
                            <p>No prometemos ventas cerradas, reuniones garantizadas ni entregabilidad universal.</p>
                            <p>No vendemos una base de datos descargable ni envios indiscriminados.</p>
                            <p>El alcance final depende del brief aprobado, compliance y reputacion del remitente.</p>
                        </div>
                    </div>
                </div>
            </section>

            <section className="py-14 px-4 bg-slate-950/40 border-y border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Modelos de entrada sugeridos</h2>
                        <p className="text-gray-400 max-w-3xl mx-auto">
                            La reserva de lanzamiento no sustituye una cotizacion final. Sirve para apartar operacion, validar el brief y estructurar el piloto correcto.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        {GBOOKER_CONNECT_PACKAGES.map((pkg) => (
                            <div key={pkg.code} className="rounded-2xl border border-white/10 bg-white/5 p-5">
                                <div className="flex items-center justify-between gap-3">
                                    <h3 className="text-xl font-bold text-white">{pkg.name}</h3>
                                    <span className="rounded-full bg-emerald-400/15 px-3 py-1 text-xs font-semibold text-emerald-300">
                                        ${pkg.reservationPriceMxn.toLocaleString('es-MX')} MXN
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 mt-3">{pkg.summary}</p>
                                <p className="text-xs text-slate-400 mt-3">{pkg.audience}</p>
                                <p className="text-xs text-slate-500 mt-4">
                                    Batch objetivo: hasta {pkg.batchSize.toLocaleString('es-MX')} contactos elegibles.
                                </p>
                                <div className="mt-5 flex gap-3">
                                    <Link
                                        to={`/b2b-connect/checkout?package=${pkg.code}`}
                                        className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-center text-sm font-bold text-white hover:bg-emerald-400 transition"
                                    >
                                        Reservar
                                    </Link>
                                    <button
                                        type="button"
                                        onClick={() => applyPackageToForm(pkg)}
                                        className="rounded-xl border border-white/15 px-4 py-3 text-sm font-semibold text-slate-200 hover:bg-white/5 transition"
                                    >
                                        Brief
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section id="b2b-form" className="py-20 px-4 bg-gradient-to-b from-transparent to-black/40">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16">
                    <div className="flex-1">
                        <div className="mb-10">
                            <h2 className="text-4xl font-bold text-white mb-4">Da el primer paso hoy.</h2>
                            <p className="text-lg text-gray-400">
                                Llena este brief inicial para evaluar viabilidad, audiencia, copy y el mejor formato de piloto para tu caso.
                            </p>
                        </div>

                        {!submitted ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Nombre de la empresa / Marca <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="company_name"
                                            value={form.company_name}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            placeholder="Tu empresa"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Email Corporativo <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            name="contact_email"
                                            value={form.contact_email}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            placeholder="ceo@tuempresa.mx"
                                        />
                                    </div>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Tu Nombre
                                        </label>
                                        <input
                                            type="text"
                                            name="contact_name"
                                            value={form.contact_name}
                                            onChange={handleChange}
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            placeholder="Ing. / Lic."
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">
                                            Giro o audiencia objetivo <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="target_audience"
                                            value={form.target_audience}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            placeholder="Ej: talleres pesados en Monterrey"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Objetivo general del piloto
                                    </label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition resize-none"
                                        placeholder="Explica tu oferta, la audiencia deseada y lo que quieres medir o vender."
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full bg-amber-500 text-slate-900 py-4 px-6 rounded-xl font-black text-lg shadow-lg hover:shadow-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Procesando, por favor espere...</>
                                    ) : (
                                        <><Send className="w-5 h-5" /> Enviar Brief Inicial</>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-2xl text-center">
                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-white mb-2">Recibimos tu brief inicial</h3>
                                <p className="text-gray-300">
                                    Nuestra mesa de analisis validara audiencia, copy y viabilidad operativa antes de enviarte el siguiente paso o pedirte el anticipo del piloto.
                                </p>
                                <p className="mt-4 text-sm text-emerald-100">
                                    Este brief no constituye contrato ni inicia envios automaticos. Si avanzas, la reserva se documenta con aceptacion digital de terminos y, si requieres CFDI o invoice, podras responder el correo con tus datos fiscales.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 lg:max-w-md">
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-8 sticky top-24 shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <Workflow className="text-blue-400" />
                                El siguiente paso inmediato
                            </h3>
                            <p className="text-gray-400 mb-8 border-b border-gray-700 pb-8">
                                Si ya tienes claro el brief y deseas apartar la operacion, puedes reservar el piloto con checkout seguro. Si necesitas revision previa, usa el formulario y te guiaremos primero.
                            </p>

                            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-5 mb-8">
                                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300 font-semibold">
                                    Piloto de lanzamiento
                                </p>
                                <h4 className="text-3xl font-black text-white mt-2">
                                    ${GBOOKER_CONNECT_LAUNCH.reservationPriceMxn.toLocaleString('es-MX')} MXN
                                </h4>
                                <p className="text-sm text-emerald-100 mt-2">
                                    Reserva para estructurar un lote inicial de hasta {GBOOKER_CONNECT_LAUNCH.batchSize.toLocaleString('es-MX')} contactos elegibles por brief aprobado.
                                </p>
                                <Link
                                    to={`/b2b-connect/checkout?package=${connectPackage.code}`}
                                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white text-slate-950 px-4 py-3 text-sm font-bold hover:bg-slate-100 transition"
                                >
                                    Reservar ahora
                                    <ChevronRight className="w-4 h-4" />
                                </Link>
                            </div>

                            <div className="space-y-6">
                                <a
                                    href="https://wa.me/525526702368?text=Hola,%20me%20interesa%20Geobooker%20Connect"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-500 transition-colors">
                                        <Phone className="w-6 h-6 text-green-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">WhatsApp Directo</h4>
                                        <p className="text-gray-400 text-sm font-light">+52 55 2670 2368</p>
                                        <span className="text-amber-500 text-xs font-semibold uppercase tracking-wider mt-2 block">Ventas especializadas</span>
                                    </div>
                                </a>

                                <a href="mailto:hola@geobooker.com.mx" className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors">
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 transition-colors">
                                        <Mail className="w-6 h-6 text-blue-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Email Connect</h4>
                                        <p className="text-gray-400 text-sm font-light">hola@geobooker.com.mx</p>
                                        <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider mt-2 block">Briefs y cotizaciones</span>
                                    </div>
                                </a>
                            </div>

                            <div className="mt-8 bg-black/40 rounded-xl p-4 flex items-center gap-4 text-xs text-gray-500">
                                <Shield className="w-8 h-8 opacity-50" />
                                <p>Su informacion nunca se vende como base descargable. Todo el proceso puede operar con NDA, trazabilidad y reglas de exclusion por cliente.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="px-4 pb-20">
                <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-6">
                    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <BarChart3 className="w-6 h-6 text-emerald-300" />
                            <h3 className="text-2xl font-bold text-white">KPIs que si entregamos</h3>
                        </div>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>Contactos aprobados, lote enviado, aperturas, clics, respuestas, rebotes y exclusiones aplicadas por proyecto.</p>
                            <p>No prometemos ventas garantizadas, reuniones garantizadas ni entregabilidad universal sin validacion previa.</p>
                            <p>La reserva de lanzamiento activa revision, setup y trazabilidad; el alcance final depende del brief aprobado.</p>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
                        <div className="flex items-center gap-3 mb-5">
                            <Shield className="w-6 h-6 text-amber-300" />
                            <h3 className="text-2xl font-bold text-white">Marco informativo del servicio</h3>
                        </div>
                        <div className="space-y-3 text-sm text-slate-300">
                            <p>Geobooker Connect opera como servicio gestionado y no como venta de una base descargable.</p>
                            <p>Aplicamos criterios de cumplimiento, exclusiones por cliente, NDA cuando aplique y control de reputacion de remitente.</p>
                            <p>Para arranques sensibles o verticales reguladas, conviene validar terminos finales y privacidad con asesoria legal propia.</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
