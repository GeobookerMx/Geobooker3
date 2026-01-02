// src/pages/AppDevelopmentPage.jsx
/**
 * Página de solicitud de cotización para desarrollo de apps
 * Formulario atractivo para capturar leads de desarrollo personalizado
 */
import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import {
    Smartphone, Globe, Layout, Code, Send, CheckCircle,
    Zap, Palette, Shield, Clock, ArrowRight
} from 'lucide-react';

const PROJECT_TYPES = [
    { id: 'pwa', label: 'PWA (App Web Progresiva)', icon: Smartphone, desc: 'App que se instala desde el navegador' },
    { id: 'website', label: 'Sitio Web / Landing Page', icon: Globe, desc: 'Página web profesional' },
    { id: 'ecommerce', label: 'Tienda Online (E-commerce)', icon: Layout, desc: 'Vende productos en línea' },
    { id: 'system', label: 'Sistema Web / Dashboard', icon: Code, desc: 'Aplicación de gestión interna' },
    { id: 'mobile', label: 'App Móvil (iOS/Android)', icon: Smartphone, desc: 'Aplicación nativa' },
    { id: 'other', label: 'Otro proyecto', icon: Zap, desc: 'Cuéntanos tu idea' },
];

const BUDGET_RANGES = [
    { value: 'under5k', label: 'Menos de $5,000 MXN' },
    { value: '5k-15k', label: '$5,000 - $15,000 MXN' },
    { value: '15k-30k', label: '$15,000 - $30,000 MXN' },
    { value: '30k-50k', label: '$30,000 - $50,000 MXN' },
    { value: 'over50k', label: 'Más de $50,000 MXN' },
    { value: 'notsure', label: 'No estoy seguro' },
];

const TIMELINE_OPTIONS = [
    { value: 'asap', label: 'Lo antes posible' },
    { value: '1month', label: 'En 1 mes' },
    { value: '2-3months', label: 'En 2-3 meses' },
    { value: 'flexible', label: 'Flexible / Sin prisa' },
];

export default function AppDevelopmentPage() {
    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        company: '',
        projectType: '',
        description: '',
        budget: '',
        timeline: '',
        hasDesign: false,
        needsHosting: false,
    });
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.name || !form.email || !form.projectType || !form.description) {
            toast.error('Por favor completa los campos obligatorios');
            return;
        }

        setSubmitting(true);

        try {
            // Enviar por email usando mailto (simple) o webhook
            const mailtoLink = `mailto:geobookerr@gmail.com?subject=${encodeURIComponent(
                `Cotización: ${PROJECT_TYPES.find(p => p.id === form.projectType)?.label || form.projectType}`
            )}&body=${encodeURIComponent(
                `📱 SOLICITUD DE COTIZACIÓN DE APP\n\n` +
                `👤 Nombre: ${form.name}\n` +
                `📧 Email: ${form.email}\n` +
                `📞 Teléfono: ${form.phone || 'No proporcionado'}\n` +
                `🏢 Empresa: ${form.company || 'No proporcionada'}\n\n` +
                `📋 DETALLES DEL PROYECTO\n` +
                `Tipo: ${PROJECT_TYPES.find(p => p.id === form.projectType)?.label}\n` +
                `Presupuesto: ${BUDGET_RANGES.find(b => b.value === form.budget)?.label || 'No definido'}\n` +
                `Timeline: ${TIMELINE_OPTIONS.find(t => t.value === form.timeline)?.label || 'No definido'}\n` +
                `¿Ya tiene diseño?: ${form.hasDesign ? 'Sí' : 'No'}\n` +
                `¿Necesita hosting?: ${form.needsHosting ? 'Sí' : 'No'}\n\n` +
                `📝 DESCRIPCIÓN:\n${form.description}`
            )}`;

            window.location.href = mailtoLink;

            setSubmitted(true);
            toast.success('¡Gracias! Te contactaremos pronto');
        } catch (error) {
            toast.error('Error al enviar. Intenta por correo directo.');
        } finally {
            setSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900 flex items-center justify-center px-4">
                <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">¡Solicitud Enviada!</h1>
                    <p className="text-gray-600 mb-6">
                        Revisa tu aplicación de correo para completar el envío.
                        Te contactaremos en menos de 24 horas.
                    </p>
                    <a
                        href="/"
                        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        Volver al inicio
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-gray-900">
            {/* Hero */}
            <div className="container mx-auto px-4 pt-12 pb-8">
                <div className="text-center mb-10">
                    <span className="inline-block bg-purple-500/30 text-purple-300 px-4 py-2 rounded-full text-sm font-medium mb-4">
                        🚀 Desarrollo de Software
                    </span>
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Cotiza tu App Personalizada
                    </h1>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                        Desarrollamos aplicaciones web y móviles a la medida de tu negocio.
                        Cuéntanos tu idea y te enviamos una cotización sin compromiso.
                    </p>
                </div>

                {/* Benefits */}
                <div className="grid md:grid-cols-4 gap-4 mb-10 max-w-4xl mx-auto">
                    {[
                        { icon: Zap, title: 'Desarrollo Rápido', desc: 'Entrega ágil' },
                        { icon: Palette, title: 'Diseño Moderno', desc: 'UI/UX premium' },
                        { icon: Shield, title: 'Código Seguro', desc: 'Best practices' },
                        { icon: Clock, title: 'Soporte 24/7', desc: 'Post-lanzamiento' },
                    ].map((benefit, i) => (
                        <div key={i} className="bg-white/10 backdrop-blur rounded-xl p-4 text-center">
                            <benefit.icon className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                            <h4 className="font-semibold text-white text-sm">{benefit.title}</h4>
                            <p className="text-gray-400 text-xs">{benefit.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Form */}
            <div className="container mx-auto px-4 pb-16">
                <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Datos de contacto */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                                Datos de contacto
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo *</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={form.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="Tu nombre"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                    <input
                                        type="email"
                                        name="email"
                                        value={form.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                                    <input
                                        type="tel"
                                        name="phone"
                                        value={form.phone}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="+52 55 1234 5678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Empresa / Negocio</label>
                                    <input
                                        type="text"
                                        name="company"
                                        value={form.company}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                        placeholder="Nombre de tu empresa"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tipo de proyecto */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                                ¿Qué tipo de proyecto necesitas? *
                            </h3>
                            <div className="grid md:grid-cols-3 gap-3">
                                {PROJECT_TYPES.map((type) => (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setForm(prev => ({ ...prev, projectType: type.id }))}
                                        className={`p-4 rounded-xl border-2 text-left transition-all ${form.projectType === type.id
                                                ? 'border-purple-500 bg-purple-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <type.icon className={`w-6 h-6 mb-2 ${form.projectType === type.id ? 'text-purple-600' : 'text-gray-400'}`} />
                                        <div className="font-medium text-gray-800 text-sm">{type.label}</div>
                                        <div className="text-xs text-gray-500">{type.desc}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Descripción */}
                        <div>
                            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="bg-purple-100 text-purple-600 w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                                Cuéntanos sobre tu proyecto *
                            </h3>
                            <textarea
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                                required
                                rows={5}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                placeholder="Describe tu idea: ¿qué quieres lograr?, ¿qué funcionalidades necesitas?, ¿tienes algún ejemplo de referencia?"
                            />
                        </div>

                        {/* Presupuesto y timeline */}
                        <div className="grid md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Presupuesto aproximado</label>
                                <select
                                    name="budget"
                                    value={form.budget}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Selecciona...</option>
                                    {BUDGET_RANGES.map(range => (
                                        <option key={range.value} value={range.value}>{range.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">¿Para cuándo lo necesitas?</label>
                                <select
                                    name="timeline"
                                    value={form.timeline}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Selecciona...</option>
                                    {TIMELINE_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Checkboxes */}
                        <div className="flex flex-wrap gap-6">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="hasDesign"
                                    checked={form.hasDesign}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-purple-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Ya tengo diseño / mockups</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="needsHosting"
                                    checked={form.needsHosting}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-purple-600 rounded"
                                />
                                <span className="text-sm text-gray-700">Necesito hosting / dominio</span>
                            </label>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg"
                        >
                            {submitting ? (
                                'Enviando...'
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar solicitud de cotización
                                </>
                            )}
                        </button>

                        <p className="text-center text-gray-500 text-sm">
                            ¿Prefieres contacto directo? Escríbenos a{' '}
                            <a href="mailto:geobookerr@gmail.com" className="text-purple-600 hover:underline">
                                geobookerr@gmail.com
                            </a>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
