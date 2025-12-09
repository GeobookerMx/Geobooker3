// src/components/SafetyBanner.jsx
import React, { useState } from 'react';
import { Shield, Phone, AlertTriangle, ChevronDown, ChevronUp, X } from 'lucide-react';

const EMERGENCY_NUMBERS = [
    { name: 'Emergencias', number: '911', description: 'Policía, bomberos, ambulancia' },
    { name: 'Línea de la Vida', number: '800 911 2000', description: 'Crisis y apoyo emocional' },
    { name: 'CONDUSEF', number: '800 999 8080', description: 'Fraudes financieros' },
    { name: 'PROFECO', number: '800 468 8722', description: 'Protección al consumidor' },
    { name: 'Policía Cibernética', number: '55 5242 5100', description: 'Delitos en internet' },
    { name: 'Denuncia Anónima', number: '089', description: 'Reportar delitos anónimamente' },
];

const SAFETY_TIPS = [
    'Nunca pagues dinero por teléfono sin verificar la identidad',
    'Los negocios legítimos NO solicitan pagos por transferencia inmediata',
    'Desconfía de llamadas que crean urgencia o amenazas',
    'Verifica siempre con fuentes oficiales antes de actuar',
    'Toma nota del número que te llama y repórtalo si es sospechoso',
];

const SafetyBanner = ({ variant = 'footer' }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed && variant === 'alert') return null;

    // Versión compacta para footer
    if (variant === 'footer') {
        return (
            <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white py-6">
                <div className="max-w-6xl mx-auto px-4">
                    <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <div className="flex items-center gap-3">
                            <Shield className="w-6 h-6 text-yellow-400" />
                            <div>
                                <h3 className="font-bold">🛡️ Seguridad y Emergencias</h3>
                                <p className="text-sm text-blue-200">
                                    Números oficiales y tips anti-extorsión
                                </p>
                            </div>
                        </div>
                        {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                        ) : (
                            <ChevronDown className="w-5 h-5" />
                        )}
                    </div>

                    {isExpanded && (
                        <div className="mt-6 grid md:grid-cols-2 gap-6">
                            {/* Números de emergencia */}
                            <div>
                                <h4 className="font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                                    <Phone className="w-4 h-4" />
                                    Números de Emergencia
                                </h4>
                                <div className="space-y-2">
                                    {EMERGENCY_NUMBERS.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-white/10 rounded-lg p-2">
                                            <div>
                                                <span className="font-medium">{item.name}</span>
                                                <span className="text-xs text-blue-200 block">{item.description}</span>
                                            </div>
                                            <a
                                                href={`tel:${item.number.replace(/\s/g, '')}`}
                                                className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-full text-sm font-bold transition"
                                            >
                                                {item.number}
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Tips anti-extorsión */}
                            <div>
                                <h4 className="font-semibold text-red-400 mb-3 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Protégete de Extorsiones
                                </h4>
                                <ul className="space-y-2">
                                    {SAFETY_TIPS.map((tip, idx) => (
                                        <li key={idx} className="flex items-start gap-2 text-sm">
                                            <span className="text-yellow-400 mt-0.5">•</span>
                                            <span>{tip}</span>
                                        </li>
                                    ))}
                                </ul>
                                <div className="mt-4 p-3 bg-red-500/20 rounded-lg border border-red-400/30">
                                    <p className="text-sm font-medium text-red-300">
                                        ⚠️ Geobooker NUNCA te llamará para pedir pagos.
                                        Todos nuestros pagos son a través de Stripe.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Versión alerta para mostrar en momentos específicos
    return (
        <div className="fixed bottom-4 right-4 max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    <span className="font-bold">Seguridad</span>
                </div>
                <button
                    onClick={() => setIsDismissed(true)}
                    className="text-white/70 hover:text-white"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="p-4">
                <p className="text-sm text-gray-600 mb-3">
                    ¿Recibiste una llamada sospechosa sobre tu negocio?
                </p>
                <div className="space-y-2">
                    <a
                        href="tel:911"
                        className="block w-full bg-red-500 hover:bg-red-600 text-white text-center py-2 rounded-lg font-bold transition"
                    >
                        📞 Llamar al 911
                    </a>
                    <a
                        href="tel:089"
                        className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-center py-2 rounded-lg font-medium transition"
                    >
                        Denuncia Anónima: 089
                    </a>
                </div>
                <p className="text-xs text-gray-400 mt-3 text-center">
                    Geobooker está comprometido con tu seguridad
                </p>
            </div>
        </div>
    );
};

export default SafetyBanner;
