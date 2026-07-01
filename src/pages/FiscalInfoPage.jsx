// src/pages/FiscalInfoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Globe, Mail } from 'lucide-react';
import { CONTACT_EMAILS, getMailtoLink } from '../config/contacts';

const FiscalInfoPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <Link to="/" className="text-blue-600 hover:text-blue-800 flex items-center mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Volver al inicio
                    </Link>
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        Información Fiscal
                    </h1>
                    <p className="text-gray-600">
                        Información sobre facturación e impuestos para usuarios de Geobooker
                    </p>
                </div>

                {/* México */}
                <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl">🇲🇽</span>
                        <h2 className="text-2xl font-bold text-gray-900">México</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-green-600" />
                                Facturación Electrónica (CFDI)
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <p className="text-gray-600">
                                    Emitimos facturas electrónicas conforme a las disposiciones del SAT.
                                </p>
                                <ul className="list-disc list-inside text-gray-600 space-y-1">
                                    <li>Solicita tu factura dentro de los primeros 7 días del mes siguiente</li>
                                    <li>Proporciona tu RFC y datos fiscales actualizados</li>
                                    <li>Las facturas se envían por correo electrónico</li>
                                </ul>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3">Para solicitar tu factura:</h3>
                            <ol className="list-decimal list-inside text-gray-600 space-y-2">
                                <li>Envía un correo a <a href={getMailtoLink('ventas')} className="text-blue-600 hover:underline">{CONTACT_EMAILS.ventas}</a></li>
                                <li>Incluye tu RFC, razón social, régimen fiscal y código postal</li>
                                <li>Indica el servicio contratado y fecha de pago</li>
                            </ol>
                        </div>
                    </div>
                </section>

                {/* USA & Canadá */}
                <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl">🇺🇸 🇨🇦</span>
                        <h2 className="text-2xl font-bold text-gray-900">Estados Unidos & Canadá</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-600" />
                                Impuestos y Facturación
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <p className="text-gray-600">
                                    Los pagos realizados desde USA y Canadá se procesan a través de Stripe.
                                </p>
                                <ul className="list-disc list-inside text-gray-600 space-y-1">
                                    <li><strong>USA:</strong> Los impuestos sobre ventas (Sales Tax) aplican según el estado</li>
                                    <li><strong>Canadá:</strong> GST/HST aplica según la provincia</li>
                                    <li>Recibirás un recibo automático por correo electrónico</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Europa */}
                <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <span className="text-3xl">🇪🇺</span>
                        <h2 className="text-2xl font-bold text-gray-900">Unión Europea</h2>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-purple-600" />
                                IVA (VAT) y GDPR
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                                <p className="text-gray-600">
                                    Para clientes en la Unión Europea:
                                </p>
                                <ul className="list-disc list-inside text-gray-600 space-y-1">
                                    <li><strong>IVA:</strong> El IVA se calcula automáticamente según tu país</li>
                                    <li><strong>GDPR:</strong> Cumplimos con el Reglamento General de Protección de Datos</li>
                                    <li>Facturas disponibles en formato PDF electrónico</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Contacto General */}
                <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                    <h2 className="text-2xl font-bold mb-4">¿Tienes dudas?</h2>
                    <p className="mb-6 text-blue-100">
                        Para cualquier información sobre facturación o consultas generales, contáctanos:
                    </p>
                    <a
                        href={getMailtoLink('ventas') }
                        className="inline-flex items-center gap-2 bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
                    >
                        <Mail className="w-5 h-5" />
                        {CONTACT_EMAILS.ventas}
                    </a>
                </section>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    Última actualización: Diciembre 2024
                </p>
            </div>
        </div>
    );
};

export default FiscalInfoPage;

