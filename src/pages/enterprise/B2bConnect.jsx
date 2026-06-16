import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft, Building2, Mail, Phone, Globe,
    MapPin, Send, CheckCircle, Loader2, Users,
    Target, Zap, Shield, ChevronRight, BarChart3,
    ArrowRight
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import SEO from '../../components/SEO';
import { getStoredQrAttribution } from '../../services/qrAttributionService';
import { getCrossPlatformPackage } from '../../config/crossPlatformPackages';

export default function B2bConnect() {
    const [searchParams] = useSearchParams();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const selectedPackage = getCrossPlatformPackage(searchParams.get('package'));

    const [form, setForm] = useState({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        country: 'México',
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

            const payload = {
                company_name: form.company_name,
                contact_name: form.contact_name,
                contact_email: form.contact_email,
                contact_phone: form.contact_phone || null,
                country: form.country || 'México',
                company_website: form.company_website || null,
                target_cities: form.target_audience,
                message: JSON.stringify({
                    lead_type: 'b2b_connect',
                    target_audience: form.target_audience,
                    notes: form.message || '',
                    company_website: form.company_website || null,
                    contact_phone: form.contact_phone || null,
                    package_code: selectedPackage?.code || null,
                    package_name: selectedPackage?.name || null,
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
                    company_name: form.company_name,
                    contact_name: form.contact_name,
                    contact_email: form.contact_email,
                    country: form.country || 'México',
                    target_cities: form.target_audience,
                    message: form.message || `Lead B2B desde Geobooker Connect. Paquete: ${selectedPackage?.name || 'general'}`,
                    status: 'new'
                };

                const retry = await supabase.from('enterprise_leads').insert(fallback);
                error = retry.error;
            }

            if (error) {
                throw error;
            }

            setSubmitted(true);
            toast.success('¡Solicitud inicial recibida con éxito!');

        } catch (error) {
            console.error('Error enviando formulario B2B:', error);
            toast.error(`No pudimos registrar tu solicitud. Intenta de nuevo o escríbenos a hola@geobooker.com.mx. ${error.message || ''}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 overflow-x-hidden">
            <SEO
                title="B2B Connect - Lead Generation por Geobooker"
                description="Servicios premium de prospección B2B y campañas de email en frío para mayoristas y proveedores en México."
            />

            {/* Sticky Header Simple para la Landing */}
            <div className="relative py-16 lg:py-24 px-4 overflow-hidden">
                <div className="absolute inset-0">
                    <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-amber-600/30 to-purple-800/20 rounded-full blur-3xl opacity-50"></div>
                </div>

                {/* Encabezado / Hero Central */}
                <div className="max-w-7xl mx-auto relative z-10">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Regresar a la página principal
                    </Link>

                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 px-4 py-2 rounded-full mb-6 border border-amber-500/30">
                                <Zap className="w-4 h-4" />
                                <span className="font-bold text-sm tracking-wide">LANZAMIENTO EXCLUSIVO MÉXICO</span>
                            </div>
                            
                            {selectedPackage && (
                                <div className="mb-6 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                                        Paquete preseleccionado
                                    </p>
                                    <h2 className="text-xl font-bold text-white mt-2">{selectedPackage.name}</h2>
                                    <p className="text-sm text-emerald-100 mt-1">{selectedPackage.summary}</p>
                                    <p className="text-xs text-emerald-200/80 mt-2">
                                        Inversion de referencia: ${selectedPackage.priceMxn.toLocaleString('es-MX')} MXN
                                    </p>
                                </div>
                            )}

                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white leading-tight mb-6">
                                Mayoristas y <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Proveedores</span>.
                            </h1>
                            <p className="text-xl md:text-2xl text-gray-300 font-light mb-8 max-w-lg leading-relaxed">
                                No persiga clientes. Apunte directo al blanco llegando al tomador de decisiones a través de nuestra base de datos hiper-segmentada.
                            </p>

                            <div className="flex flex-wrap gap-2 mb-8">
                                {[
                                    'Mayoristas',
                                    'Proveedores logisticos',
                                    'Refaccionarias',
                                    'Talleres pesados',
                                    'Servicios industriales'
                                ].map((tag) => (
                                    <span
                                        key={tag}
                                        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => document.getElementById('b2b-form').scrollIntoView({ behavior: 'smooth' })}
                                    className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/50 hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                                >
                                    Estructurar mi Campaña
                                    <ArrowRight className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="mt-10 flex items-center gap-6 opacity-60">
                                <div className="text-sm font-medium text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <Shield className="w-4 h-4"/> Bases de datos validadas por:
                                </div>
                            </div>
                        </div>

                        {/* Panel de Métrica Rápida Visual */}
                        <div className="relative">
                            <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 to-blue-500/10 rounded-3xl transform rotate-3 scale-105"></div>
                            <div className="relative bg-gray-900/60 backdrop-blur-xl border border-gray-700 p-8 rounded-3xl shadow-2xl">
                                <div className="grid grid-cols-2 gap-6 mb-8">
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">16,000+</div>
                                        <div className="text-yellow-500 font-medium text-sm">Restaurantes, Talleres y Clínicas</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-black text-white mb-1">99%</div>
                                        <div className="text-green-500 font-medium text-sm">Tasa de Entregabilidad</div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {[
                                        'Identificación del "Candidato Ideal" (ICP)',
                                        'Creación de correos corporativos en frío (Cold Emailing)',
                                        'Envío automatizado a prospectos por nicho',
                                        'Seguimiento estadístico del CTR y Aperturas'
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

            {/* Características del Servicio */}
            <section className="py-20 px-4 bg-gray-900/50 border-y border-gray-800">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">¿Qué incluye el Piloto Geobooker Connect?</h2>
                        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Nuestra infraestructura trabajando en exclusiva para ser el brazo tecnológico de tu estrategia comercial B2B.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors">
                            <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center mb-6">
                                <Target className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Segmentación Geográfica</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Extraemos y localizamos únicamente negocios activos verificados en todo el país por sector, ciudad y rubro para garantizar afinidad total con tus productos, incluyendo verticales industriales y logísticas.
                            </p>
                        </div>
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">TOP</div>
                            <div className="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center mb-6">
                                <Mail className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Redacción Copywriting</h3>
                            <p className="text-gray-400 leading-relaxed">
                                No envíamos publicidad aburrida. Redactamos mensajes B2B altamente persuasivos utilizando marcos profesionales (Premium Email HTML Wrapper) que evitan la bandeja de spam.
                            </p>
                        </div>
                        <div className="bg-gray-800/40 p-8 rounded-2xl border border-gray-700 hover:border-amber-500/30 transition-colors">
                            <div className="w-14 h-14 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center mb-6">
                                <BarChart3 className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">Envío Inicial: 500 Prospectos</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Nos hacemos cargo de las herramientas pesadas disparando la campaña hasta a 500 tomadores de decisión mediante ráfagas controladas diarias para máxima apertura.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Formulario y Next Steps */}
            <section id="b2b-form" className="py-20 px-4 bg-gradient-to-b from-transparent to-black/40">
                <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-16">
                    {/* Sección Interactiva Izquierda */}
                    <div className="flex-1">
                        <div className="mb-10">
                            <h2 className="text-4xl font-bold text-white mb-4">Da el primer paso hoy.</h2>
                            <p className="text-lg text-gray-400">
                                Llena este breve formulario para indicarnos tu interés particular. Sin compromiso analizaremos si tenemos el alcance que requieres en tu estado y sector.
                            </p>
                        </div>

                        {selectedPackage && (
                            <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-5">
                                <h3 className="text-lg font-bold text-white mb-3">Lo que incluye este paquete</h3>
                                <div className="space-y-2">
                                    {selectedPackage.includes.map((feature) => (
                                        <div key={feature} className="flex items-start gap-3 text-sm text-gray-300">
                                            <CheckCircle className="w-4 h-4 mt-0.5 text-emerald-400 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

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
                                            ¿A qué giro de cliente quieres llegar? <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="target_audience"
                                            value={form.target_audience}
                                            onChange={handleChange}
                                            required
                                            className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition"
                                            placeholder="Ej: Doctores en Monterrey, Restaurantes en Jalisco..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Características u Objetivo General de tu campaña
                                    </label>
                                    <textarea
                                        name="message"
                                        value={form.message}
                                        onChange={handleChange}
                                        rows={4}
                                        className="w-full bg-gray-900 border border-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none transition resize-none"
                                        placeholder="Tengo un inventario de equipo médico y quiero enviarle una promoción a las clínicas..."
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
                                        <><Send className="w-5 h-5" /> Enviar y Pre-Agendar Proyecto</>
                                    )}
                                </button>
                            </form>
                        ) : (
                            <div className="bg-green-500/10 border border-green-500/30 p-8 rounded-2xl text-center">
                                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                                <h3 className="text-2xl font-bold text-white mb-2">Recibimos sus datos corporativos</h3>
                                <p className="text-gray-300">
                                    Nuestra mesa de análisis evaluará la viabilidad y nos comunicaremos al correo provisto muy pronto.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Sección Siguiente Paso / Contacto Directo */}
                    <div className="flex-1 lg:max-w-md">
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-700 rounded-3xl p-8 sticky top-24 shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                                <Globe className="text-blue-400" />
                                El Siguiente Paso Inmediato
                            </h3>
                            <p className="text-gray-400 mb-8 border-b border-gray-700 pb-8">
                                ¿Tiene urgencia o requiere detalles exactos del <strong>Paquete B2B Pilot</strong>? 
                                Omita la espera y contáctenos por estos medios corporativos directos. Le daremos atención inmediata y cotización adaptada a sus necesidades.
                            </p>

                            <div className="space-y-6">
                                <a 
                                    href="https://wa.me/525526702368?text=Hola,%20me%20interesa%20el%20servicio%20Geobooker%20B2B%20Connect" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-500 group-hover:text-white transition-colors">
                                        <Phone className="w-6 h-6 text-green-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">WhatsApp Directo</h4>
                                        <p className="text-gray-400 text-sm font-light">+52 55 2670 2368</p>
                                        <span className="text-amber-500 text-xs font-semibold uppercase tracking-wider mt-2 block">Ventas Especializadas</span>
                                    </div>
                                </a>

                                <a 
                                    href="mailto:ventasgeobooker@gmail.com" 
                                    className="group flex items-start gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors"
                                >
                                    <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                        <Mail className="w-6 h-6 text-blue-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold mb-1">Email Corporativo</h4>
                                        <p className="text-gray-400 text-sm font-light">ventasgeobooker@gmail.com</p>
                                        <span className="text-blue-400 text-xs font-semibold uppercase tracking-wider mt-2 block">Soporte y Cotizaciones</span>
                                    </div>
                                </a>
                            </div>

                            <div className="mt-8 bg-black/40 rounded-xl p-4 flex items-center gap-4 text-xs text-gray-500">
                                <Shield className="w-8 h-8 opacity-50" />
                                <p>Su información nunca se comparte con terceros. Todo el proceso cuenta con NDA (Acuerdo de confidencialidad) si así lo requiere.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
