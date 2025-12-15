// src/pages/GuiaResicoPage.jsx
// Guía completa para darse de alta en el SAT como RESICO
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
    CheckCircle,
    AlertCircle,
    FileText,
    DollarSign,
    Calendar,
    Shield,
    ArrowRight,
    ExternalLink,
    ChevronDown,
    ChevronUp,
    Building2,
    Calculator,
    Clock,
    Lightbulb
} from 'lucide-react';

const GuiaResicoPage = () => {
    const [openSection, setOpenSection] = useState(null);

    const toggleSection = (index) => {
        setOpenSection(openSection === index ? null : index);
    };

    const benefits = [
        { icon: DollarSign, title: "Tasas Bajas", desc: "Paga entre 1% y 2.5% de tus ingresos" },
        { icon: FileText, title: "Menos Trámites", desc: "Sin contabilidad compleja" },
        { icon: Calendar, title: "Declaración Fácil", desc: "El SAT te precalcula" },
        { icon: Shield, title: "Seguridad", desc: "Acceso a créditos y facturación" },
    ];

    const requirements = [
        "Ser persona física (no empresa/sociedad)",
        "Ingresos anuales menores a $3,500,000 MXN",
        "No tener empleados propios (puedes usar outsourcing)",
        "No ser socio o accionista de empresas",
        "Contar con e.firma o Contraseña SAT"
    ];

    const steps = [
        {
            title: "1️⃣ Obtén tu RFC",
            content: `
**Si no tienes RFC:**
1. Agenda cita en [sat.gob.mx/agendar-cita](https://citas.sat.gob.mx/)
2. Lleva: INE, CURP, comprobante de domicilio
3. Te darán tu RFC y Contraseña SAT

**Si ya tienes RFC:**
- Solo necesitas cambiar tu régimen fiscal a RESICO
            `
        },
        {
            title: "2️⃣ Crea tu e.firma (Opcional pero recomendado)",
            content: `
La e.firma es tu firma electrónica avanzada:

1. Agenda cita de "Renovación/Obtención de e.firma"
2. Lleva: USB, INE, correo electrónico
3. Te darán archivos .cer y .key

**¿Es obligatoria?**
- Para facturar más de $400,000/año: SÍ
- Para empezar con ingresos bajos: puedes usar Contraseña SAT
            `
        },
        {
            title: "3️⃣ Inscríbete al RESICO",
            content: `
**En línea (recomendado):**
1. Entra a [sat.gob.mx](https://www.sat.gob.mx)
2. Inicia sesión con RFC + Contraseña o e.firma
3. Ve a: Trámites > RFC > Actualización de actividades
4. Selecciona: "Régimen Simplificado de Confianza"
5. Agrega tu actividad económica (ej: "Comercio al por menor")
6. Guarda tu acuse de actualización

**Presencial:**
- Agenda cita para "Inscripción o actualización al RFC"
            `
        },
        {
            title: "4️⃣ Configura tu facturación",
            content: `
**Opciones gratuitas para facturar:**

1. **Factura SAT Móvil** (App oficial)
   - Gratis, disponible en iOS y Android
   - Ideal para pocas facturas al mes

2. **Portal del SAT**
   - sat.gob.mx > Factura electrónica
   - Sin costo

3. **Sistemas de terceros**
   - Facturama, Alegra, Aspel (desde $200/mes)
   - Mejor para volumen alto
            `
        },
        {
            title: "5️⃣ Declara tus impuestos mensualmente",
            content: `
**¿Cuándo declarar?**
- A más tardar el día 17 de cada mes
- Ejemplo: Ingresos de enero → declaras antes del 17 de febrero

**¿Cuánto pagas?**

| Ingresos Mensuales | Tasa |
|-------------------|------|
| Hasta $25,000 | 1.00% |
| $25,001 - $50,000 | 1.10% |
| $50,001 - $83,333 | 1.50% |
| $83,334 - $208,333 | 2.00% |
| $208,334 - $291,667 | 2.50% |

**Ejemplo:**
Si facturaste $30,000 en el mes → pagas $330 de ISR (1.1%)
            `
        },
        {
            title: "6️⃣ Tips importantes",
            content: `
✅ **Hazlo antes del 31 de enero** cada año para renovar RESICO

✅ **Guarda tus facturas** tanto de ingresos como gastos

✅ **Declara aunque no factures** (declaración en ceros)

✅ **Si superas los 3.5 millones** cambias automáticamente de régimen

⚠️ **No mezcles ingresos** con sueldos de trabajo (nómina)

💡 **Recomendación:** Usa una cuenta bancaria separada para tu negocio
            `
        }
    ];

    const faqs = [
        {
            q: "¿Puedo tener otro trabajo y estar en RESICO?",
            a: "Sí, pero los ingresos por sueldos (nómina) NO entran en RESICO. Solo los de tu negocio."
        },
        {
            q: "¿Qué pasa si no facturo un mes?",
            a: "Debes presentar declaración en ceros. No pagar no significa no declarar."
        },
        {
            q: "¿Necesito contador?",
            a: "Para RESICO no es obligatorio, ya que el SAT te precalcula. Pero es recomendable para asesoría."
        },
        {
            q: "¿Puedo tener empleados?",
            a: "Si contratas empleados directos (con nómina tuya), ya no puedes estar en RESICO."
        },
        {
            q: "¿Cuánto cuesta darse de alta?",
            a: "Es completamente GRATIS. Solo inviertes tu tiempo en la cita y trámites."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
            {/* Hero */}
            <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white py-16 px-4">
                <div className="max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center bg-white/20 px-4 py-2 rounded-full text-sm mb-6">
                        📋 Guía Gratuita de Geobooker
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Cómo Darte de Alta en el SAT como RESICO
                    </h1>
                    <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
                        Formaliza tu negocio, factura a tus clientes y paga menos impuestos con el Régimen Simplificado de Confianza
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <a
                            href="https://citas.sat.gob.mx/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white text-blue-700 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition flex items-center gap-2"
                        >
                            Agendar Cita SAT <ExternalLink className="w-4 h-4" />
                        </a>
                        <a
                            href="#pasos"
                            className="bg-blue-500/30 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-500/50 transition"
                        >
                            Ver los 6 pasos
                        </a>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-12">
                {/* ¿Qué es RESICO? */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        ¿Qué es el RESICO?
                    </h2>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <p className="text-lg text-gray-700 mb-4">
                            El <strong>Régimen Simplificado de Confianza (RESICO)</strong> es un régimen fiscal del SAT diseñado para emprendedores y pequeños negocios. Te permite:
                        </p>
                        <div className="grid md:grid-cols-2 gap-4">
                            {benefits.map((b, i) => (
                                <div key={i} className="flex items-start gap-3 p-4 bg-green-50 rounded-xl">
                                    <div className="p-2 bg-green-500 text-white rounded-lg">
                                        <b.icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="font-semibold text-gray-900">{b.title}</h4>
                                        <p className="text-sm text-gray-600">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Requisitos */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                        Requisitos para RESICO
                    </h2>
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        <ul className="space-y-3">
                            {requirements.map((req, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-gray-700">{req}</span>
                                </li>
                            ))}
                        </ul>
                        <div className="mt-6 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                <p className="text-sm text-yellow-800">
                                    <strong>Importante:</strong> Si tienes ingresos por sueldos (nómina) Y por negocio propio, solo los del negocio entran en RESICO. Los de nómina siguen tributando aparte.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Pasos */}
                <section id="pasos" className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Los 6 Pasos para Darte de Alta
                    </h2>
                    <div className="space-y-4">
                        {steps.map((step, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                                <button
                                    onClick={() => toggleSection(i)}
                                    className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition"
                                >
                                    <span className="text-lg font-semibold text-gray-900">{step.title}</span>
                                    {openSection === i ? (
                                        <ChevronUp className="w-5 h-5 text-gray-500" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-gray-500" />
                                    )}
                                </button>
                                {openSection === i && (
                                    <div className="px-6 pb-6">
                                        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-line">
                                            {step.content}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Calculadora Simple */}
                <section className="mb-16">
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-8 text-white">
                        <div className="flex items-center gap-3 mb-4">
                            <Calculator className="w-8 h-8" />
                            <h2 className="text-2xl font-bold">¿Cuánto pagarías en RESICO?</h2>
                        </div>
                        <p className="text-green-100 mb-6">
                            Ejemplo: Si facturas <strong>$50,000 al mes</strong>, tu tasa es de 1.5%
                        </p>
                        <div className="bg-white/20 rounded-xl p-6">
                            <div className="text-center">
                                <p className="text-green-100 text-sm">ISR mensual aproximado</p>
                                <p className="text-5xl font-bold">$750</p>
                                <p className="text-green-200 text-sm mt-2">vs ~$5,000+ en otros regímenes</p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* FAQs */}
                <section className="mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Lightbulb className="w-8 h-8 text-yellow-500" />
                        Preguntas Frecuentes
                    </h2>
                    <div className="space-y-4">
                        {faqs.map((faq, i) => (
                            <div key={i} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                                <h4 className="font-semibold text-gray-900 mb-2">{faq.q}</h4>
                                <p className="text-gray-600">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA Final */}
                <section className="text-center">
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white">
                        <h2 className="text-2xl font-bold mb-4">¿Listo para formalizar tu negocio?</h2>
                        <p className="text-blue-100 mb-6 max-w-lg mx-auto">
                            Registra tu negocio en Geobooker y llega a miles de clientes cerca de ti
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Link
                                to="/signup"
                                className="bg-white text-blue-700 px-6 py-3 rounded-full font-semibold hover:bg-blue-50 transition"
                            >
                                Crear cuenta gratis
                            </Link>
                            <a
                                href="https://citas.sat.gob.mx/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-blue-500/30 text-white px-6 py-3 rounded-full font-semibold hover:bg-blue-500/50 transition flex items-center gap-2"
                            >
                                Agendar cita SAT <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>
                    </div>
                </section>

                {/* Disclaimer */}
                <div className="mt-12 p-4 bg-gray-100 rounded-xl text-center">
                    <p className="text-sm text-gray-600">
                        <strong>Aviso:</strong> Esta guía es informativa y no sustituye asesoría fiscal profesional.
                        Consulta con un contador para tu situación específica.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default GuiaResicoPage;
