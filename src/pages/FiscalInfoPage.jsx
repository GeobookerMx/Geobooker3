// src/pages/FiscalInfoPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Globe, Building, Mail, Phone, Shield } from 'lucide-react';

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
                        Información importante sobre facturación e impuestos para usuarios de Geobooker
                    </p>
                </div>

                {/* Datos de Geobooker */}
                <section className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-3 bg-blue-100 rounded-xl">
                            <Building className="w-6 h-6 text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">Datos de Geobooker</h2>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Razón Social</h3>
                            <p className="text-gray-600">Geobooker Technologies S.A. de C.V.</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">RFC (México)</h3>
                            <p className="text-gray-600">GTE241001XXX</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Domicilio Fiscal</h3>
                            <p className="text-gray-600">Ciudad de México, México</p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-gray-700 mb-2">Contacto Facturación</h3>
                            <p className="text-gray-600">
                                <a href="mailto:facturacion@geobooker.com.mx"
                                    className="text-blue-600 hover:underline flex items-center gap-1">
                                    <Mail className="w-4 h-4" />
                                    facturacion@geobooker.com.mx
                                </a>
                            </p>
                        </div>
                    </div>
                </section>

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
                                    Emitimos facturas electrónicas (CFDI 4.0) conforme a las disposiciones del SAT.
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
                                <li>Envía un correo a <a href="mailto:facturacion@geobooker.com.mx" className="text-blue-600 hover:underline">facturacion@geobooker.com.mx</a></li>
                                <li>Incluye tu RFC, razón social, régimen fiscal y código postal</li>
                                <li>Adjunta tu Constancia de Situación Fiscal (CSF) actualizada</li>
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
                                    <li>Para reembolsos, contáctanos en los primeros 14 días</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <p className="text-blue-800 flex items-center gap-2">
                                <Shield className="w-5 h-5" />
                                <strong>Tax ID:</strong> Si requieres un W-8BEN o W-9, contáctanos para más información.
                            </p>
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
                                    <li><strong>Empresas con VAT ID:</strong> Puedes aplicar reverse charge</li>
                                    <li><strong>GDPR:</strong> Cumplimos con el Reglamento General de Protección de Datos</li>
                                    <li>Facturas disponibles en formato PDF electrónico</li>
                                </ul>
                            </div>
                        </div>

                        <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                            <p className="text-purple-800">
                                <strong>¿Tienes un VAT ID válido?</strong> Envíanos tu número de identificación fiscal
                                a <a href="mailto:facturacion@geobooker.com.mx" className="underline">facturacion@geobooker.com.mx</a> para
                                aplicar la exención de IVA en transacciones B2B.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Contacto General */}
                <section className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white">
                    <h2 className="text-2xl font-bold mb-4">¿Tienes dudas sobre facturación?</h2>
                    <p className="mb-6 text-blue-100">
                        Nuestro equipo está disponible para ayudarte con cualquier consulta fiscal.
                    </p>
                    <div className="flex flex-wrap gap-4">
                        <a
                            href="mailto:facturacion@geobooker.com.mx"
                            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition flex items-center gap-2"
                        >
                            <Mail className="w-5 h-5" />
                            facturacion@geobooker.com.mx
                        </a>
                        <a
                            href="mailto:soporte@geobooker.com.mx"
                            className="bg-white/20 text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/30 transition flex items-center gap-2"
                        >
                            <Phone className="w-5 h-5" />
                            Soporte General
                        </a>
                    </div>
                </section>

                {/* Footer Note */}
                <p className="text-center text-gray-500 text-sm mt-8">
                    Última actualización: Diciembre 2024 | Geobooker está comprometido con la transparencia fiscal.
                </p>
            </div>
        </div>
    );
};

export default FiscalInfoPage;
