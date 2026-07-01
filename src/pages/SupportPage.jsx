import React from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageCircle, Phone, ArrowLeft, Search, Store, Megaphone } from 'lucide-react';
import { CONTACT_EMAILS, getMailtoLink } from '../config/contacts';

const SupportPage = () => {
    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <div className="bg-white shadow-sm sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <Link to="/" className="flex items-center text-blue-600 hover:text-blue-800 transition">
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Volver al inicio
                    </Link>
                    <img src="/images/geobooker-logo-horizontal-new.png" alt="Geobooker Logo" className="h-8" />
                </div>
            </div>

            <div className="flex-grow max-w-5xl mx-auto px-4 py-12 w-full">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-extrabold text-gray-900 mb-4">Soporte y orientacion Geobooker</h1>
                    <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                        Te ayudamos a resolver dudas sobre busqueda local, registro o reclamo de negocios, publicidad, facturacion y uso general de la plataforma.
                    </p>
                </div>

                <div className="mb-10 grid gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5">
                        <Search className="h-8 w-8 text-cyan-700" />
                        <h2 className="mt-3 text-lg font-bold text-slate-900">Usuarios</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Geobooker te ayuda a encontrar negocios y servicios cercanos cuando necesitas resolver algo rapido.</p>
                    </div>
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                        <Store className="h-8 w-8 text-emerald-700" />
                        <h2 className="mt-3 text-lg font-bold text-slate-900">Negocios</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Ayudamos a que los negocios aparezcan mejor por categoria, ciudad y necesidad de busqueda local.</p>
                    </div>
                    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                        <Megaphone className="h-8 w-8 text-amber-700" />
                        <h2 className="mt-3 text-lg font-bold text-slate-900">Marcas</h2>
                        <p className="mt-2 text-sm leading-6 text-slate-600">Tambien operamos publicidad local y enterprise para marcas que quieren presencia por territorio.</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-12">
                    <div className="grid md:grid-cols-2">
                        <div className="p-8 bg-blue-600 text-white">
                            <h2 className="text-2xl font-bold mb-6">Informacion de contacto</h2>
                            <p className="text-blue-100 mb-8 max-w-sm">
                                Te orientamos sobre soporte, visibilidad de negocio, publicidad y facturacion. Si tu caso requiere revision operativa, lo canalizamos con el equipo correcto.
                            </p>

                            <div className="space-y-6">
                                <div className="flex items-center">
                                    <Mail className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">Correo oficial Geobooker</p>
                                        <a href={getMailtoLink('soporte')} className="font-semibold text-lg hover:underline">
                                            {CONTACT_EMAILS.soporte}
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <Phone className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">Telefono corporativo</p>
                                        <a href="tel:+525526702368" className="font-semibold text-lg hover:underline">
                                            +52 55 2670 2368
                                        </a>
                                    </div>
                                </div>
                                <div className="flex items-center">
                                    <MessageCircle className="w-6 h-6 mr-4 text-blue-300" />
                                    <div>
                                        <p className="text-sm text-blue-200">WhatsApp</p>
                                        <a href="https://wa.me/525526702368" target="_blank" rel="noreferrer" className="font-semibold text-lg hover:underline">
                                            Chat en linea ?
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-white">
                            <h3 className="text-xl font-bold text-gray-900 mb-6">Orientacion rapida</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Quiero registrar o reclamar mi negocio</h4>
                                    <p className="text-gray-600 text-sm">
                                        Si tu negocio ya aparece en Geobooker, puedes reclamarlo. Si todavia no aparece, puedes registrarlo para empezar a ganar visibilidad local.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Necesito ayuda con publicidad</h4>
                                    <p className="text-gray-600 text-sm">
                                        Te ayudamos a entender formatos, territorios, tiempos de revision, reportes y alcances de las pautas locales o enterprise.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Problemas en la validacion del negocio</h4>
                                    <p className="text-gray-600 text-sm">
                                        Si tu negocio figura como duplicado o no validado, comparte evidencia de operacion y datos de contacto en {CONTACT_EMAILS.soporte} con asunto: "Validar Negocio".
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-1">Facturacion o pagos</h4>
                                    <p className="text-gray-600 text-sm">
                                        Para incidencias de pago, CFDI o aclaraciones operativas, escribe desde el mismo correo con el que hiciste tu compra y agrega tu referencia.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <footer className="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-500">
                <p>? {new Date().getFullYear()} Geobooker. Todos los derechos reservados.</p>
                <div className="mt-2 space-x-4">
                    <Link to="/terms" className="hover:text-blue-600">T?rminos y Condiciones</Link>
                    <Link to="/privacy" className="hover:text-blue-600">Aviso de Privacidad</Link>
                </div>
            </footer>
        </div>
    );
};

export default SupportPage;
