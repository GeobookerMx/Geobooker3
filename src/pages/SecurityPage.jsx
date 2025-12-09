// src/pages/SecurityPage.jsx
import React from 'react';
import { Shield, Phone, AlertTriangle, FileWarning, CheckCircle, Info } from 'lucide-react';
import SafetyBanner from '../components/SafetyBanner';

const EMERGENCY_NUMBERS = [
    { name: 'Emergencias', number: '911', description: 'Policía, bomberos, ambulancia', color: 'bg-red-500' },
    { name: 'Línea de la Vida', number: '800 911 2000', description: 'Crisis y apoyo emocional 24/7', color: 'bg-blue-500' },
    { name: 'CONDUSEF', number: '800 999 8080', description: 'Fraudes financieros y bancarios', color: 'bg-green-500' },
    { name: 'PROFECO', number: '800 468 8722', description: 'Protección al consumidor', color: 'bg-yellow-500' },
    { name: 'Policía Cibernética', number: '55 5242 5100', description: 'Delitos en internet y redes', color: 'bg-purple-500' },
    { name: 'Denuncia Anónima', number: '089', description: 'Reportar delitos sin dar tu nombre', color: 'bg-gray-700' },
];

const EXTORTION_SIGNS = [
    'Te llaman diciendo que tienes un problema urgente y debes pagar ahora',
    'Amenazan con cerrar tu negocio o hacerte daño',
    'Piden depósitos a cuentas personales, no empresariales',
    'No te dan tiempo de verificar la información',
    'Se hacen pasar por el gobierno, CFE, SAT o bancos',
    'Conocen algunos datos tuyos para parecer más creíbles',
];

const PROTECTION_TIPS = [
    { tip: 'Cuelga y verifica', description: 'Nunca tomes decisiones en la llamada. Cuelga y llama directamente a la institución.' },
    { tip: 'No des información', description: 'Nunca proporciones datos bancarios, contraseñas o códigos por teléfono.' },
    { tip: 'Reporta siempre', description: 'Aunque no hayas caído, reportar ayuda a proteger a otros.' },
    { tip: 'Usa canales oficiales', description: 'Verifica cualquier cobro en sitios oficiales, no en links que te envíen.' },
];

const SecurityPage = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-purple-900 text-white py-16">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Shield className="w-10 h-10 text-blue-900" />
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Tu Seguridad es Nuestra Prioridad
                    </h1>
                    <p className="text-xl text-blue-200 max-w-2xl mx-auto">
                        En Geobooker estamos comprometidos con proteger a los negocios mexicanos.
                        Aquí encontrarás recursos para mantenerte seguro.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 py-12">
                {/* Alerta importante */}
                <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-r-xl mb-12">
                    <div className="flex items-start gap-4">
                        <AlertTriangle className="w-8 h-8 text-red-500 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold text-red-800 mb-2">
                                ⚠️ Geobooker NUNCA te llamará para pedir pagos
                            </h2>
                            <p className="text-red-700">
                                Todos nuestros pagos se realizan de forma segura a través de nuestra plataforma con Stripe.
                                Si alguien te llama pidiendo dinero en nombre de Geobooker, es una estafa.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Números de emergencia */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <Phone className="w-7 h-7 text-blue-600" />
                        Números de Emergencia Oficiales
                    </h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {EMERGENCY_NUMBERS.map((item, idx) => (
                            <div key={idx} className="bg-white rounded-xl shadow-md hover:shadow-lg transition overflow-hidden">
                                <div className={`${item.color} text-white px-4 py-2`}>
                                    <span className="font-bold">{item.name}</span>
                                </div>
                                <div className="p-4">
                                    <a
                                        href={`tel:${item.number.replace(/\s/g, '')}`}
                                        className="text-3xl font-bold text-gray-900 hover:text-blue-600 transition"
                                    >
                                        {item.number}
                                    </a>
                                    <p className="text-gray-600 text-sm mt-1">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Señales de extorsión */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <FileWarning className="w-7 h-7 text-red-600" />
                        Señales de Extorsión Telefónica
                    </h2>
                    <div className="bg-white rounded-xl shadow-md p-6">
                        <p className="text-gray-600 mb-4">
                            Si recibes una llamada con cualquiera de estas características, probablemente es un intento de extorsión:
                        </p>
                        <ul className="space-y-3">
                            {EXTORTION_SIGNS.map((sign, idx) => (
                                <li key={idx} className="flex items-start gap-3">
                                    <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-sm font-bold">
                                        {idx + 1}
                                    </span>
                                    <span className="text-gray-700">{sign}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </section>

                {/* Tips de protección */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                        <CheckCircle className="w-7 h-7 text-green-600" />
                        Cómo Protegerte
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        {PROTECTION_TIPS.map((item, idx) => (
                            <div key={idx} className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                                <h3 className="font-bold text-lg text-green-800 mb-2">
                                    {item.tip}
                                </h3>
                                <p className="text-green-700">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Sobre Geobooker */}
                <section className="bg-blue-50 rounded-2xl p-8">
                    <div className="flex items-start gap-4">
                        <Info className="w-8 h-8 text-blue-600 flex-shrink-0" />
                        <div>
                            <h2 className="text-xl font-bold text-blue-900 mb-3">
                                Compromiso de Geobooker
                            </h2>
                            <ul className="space-y-2 text-blue-800">
                                <li>✅ Todos nuestros pagos son a través de Stripe (plataforma certificada)</li>
                                <li>✅ Nunca solicitamos pagos por teléfono o transferencia directa</li>
                                <li>✅ Nuestros precios están publicados en nuestra página web</li>
                                <li>✅ Puedes contactarnos siempre a través de canales oficiales</li>
                            </ul>
                            <div className="mt-4 flex gap-4">
                                <a
                                    href="mailto:ventasgeobooker@gmail.com"
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                                >
                                    Contactar a Geobooker
                                </a>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default SecurityPage;
