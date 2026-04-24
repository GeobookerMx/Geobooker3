import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone, ArrowLeft } from 'lucide-react';

const SupportPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header / Nav */}
            <div className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Volver al inicio
                    </Link>
                    <img src="/images/geobooker-logo-horizontal-new.png" alt="Geobooker Logo" className="h-8" />
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-grow max-w-4xl mx-auto px-4 py-12 w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Soporte Técnico Geobooker</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        ¿Tienes problemas con tu cuenta, dudas sobre la plataforma o necesitas ayuda con la facturación? Estamos aquí para ayudarte a impulsar tu negocio.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-12">
                    <div className="grid md:grid-cols-2">
                        {/* Contact Info Section */}
                        <div className="p-8 bg-blue-600 text-white">
                            <h2 className="text-2xl font-bold mb-6">Información de Contacto</h2>
                            <p className="text-blue-100 mb-8 max-w-sm">
                                Nuestro equipo de soporte está disponible de Lunes a Viernes de 9:00 AM a 6:00 PM (Hora de México Central).
                            </p>
                            
                            <div className="space-y-6">
                                <div className="flex items-center">
                                    <Mail className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">Email de soporte / empresarial</p>
                                        <a href="mailto:ventasgeobooker@gmail.com" className="font-semibold text-lg hover:underline">
                                            ventasgeobooker@gmail.com
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">Teléfono (Solo emergencias)</p>
                                        <a href="tel:+525526702368" className="font-semibold text-lg hover:underline">
                                            +52 55 2670 2368
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <MessageCircle className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">WhatsApp (Respuesta rápida)</p>
                                        <a href="https://wa.me/525526702368" target="_blank" rel="noreferrer" className="font-semibold text-lg hover:underline">
                                            Chat en línea →
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* FAQs / Steps */}
                        <div className="p-8 bg-white">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Preguntas Frecuentes</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">¿Cómo elimino mi cuenta?</h4>
                                    <p className="text-gray-600 text-sm">
                                        Ve a tu "Panel Principal" → "Mi Perfil" → Dirígete a la parte inferior y haz clic en "Eliminar mi cuenta". Todos los datos de negocio y credenciales se borrarán permanentemente y esta acción no se puede deshacer.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">El mapa no muestra mi ubicación</h4>
                                    <p className="text-gray-600 text-sm">
                                        Valida que los servicios de localización de tu dispositivo estén activos. Puedes cambiar tu ubicación manualmente arrastrando el PIN en la sección de búsqueda si prefieres no compartir tus coordenadas.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Problemas en la validación del negocio</h4>
                                    <p className="text-gray-600 text-sm">
                                        Si tu negocio figura como duplicado (por el registro DENUE) o como no validado, por favor adjunta una foto oficial y tu INE al correo de ventasgeobooker@gmail.com con asunto: "Validar Negocio".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer minificado */}
            <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-500">
                <p>© {new Date().getFullYear()} Geobooker. Todos los derechos reservados.</p>
                <div className="mt-2 space-x-4">
                    <Link to="/terms" className="hover:text-blue-600">Términos y Condiciones</Link>
                    <Link to="/privacy" className="hover:text-blue-600">Aviso de Privacidad</Link>
                </div>
            </footer>
        </div>
    );
};

export default SupportPage;
