// src/components/modals/GuestLoginPromptModal.jsx
/**
 * Modal que aparece cuando un invitado supera el limite de busquedas sin cuenta.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { X, LogIn, UserPlus, Search, Lock, Store, ShieldCheck } from 'lucide-react';

const GuestLoginPromptModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[slideUp_0.3s_ease-out]">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition z-10"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-600 px-6 py-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        Unete a Geobooker
                    </h2>
                    <p className="text-white/90 text-sm">
                        Crea una cuenta gratis para seguir buscando, guardar negocios o publicar el tuyo.
                    </p>
                </div>

                <div className="p-6">
                    <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Search className="w-4 h-4 text-green-600" />
                            </div>
                            <span>Busqueda ilimitada de negocios, productos y servicios cercanos.</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Store className="w-4 h-4 text-blue-600" />
                            </div>
                            <span>Registra tu negocio gratis o solicita control si ya aparece.</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <ShieldCheck className="w-4 h-4 text-purple-600" />
                            </div>
                            <span>Mejora datos, contacto y visibilidad sin perder trazabilidad.</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Link
                            to="/signup?source=guest_search_limit"
                            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-700 to-cyan-600 text-white py-3.5 rounded-xl font-bold hover:from-blue-800 hover:to-cyan-700 transition shadow-lg"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear cuenta gratis
                        </Link>

                        <Link
                            to="/login?source=guest_search_limit"
                            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                        >
                            <LogIn className="w-5 h-5" />
                            Ya tengo cuenta
                        </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                        <Link to="/business/register?source=guest_search_limit" className="rounded-xl bg-blue-50 px-3 py-2 text-center text-blue-700 hover:bg-blue-100">
                            Registrar negocio
                        </Link>
                        <Link to="/claim?source=guest_search_limit" className="rounded-xl bg-slate-100 px-3 py-2 text-center text-slate-700 hover:bg-slate-200">
                            Reclamar negocio
                        </Link>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full text-center text-sm text-gray-400 mt-4 hover:text-gray-600 transition"
                    >
                        Quizas despues
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};

export default GuestLoginPromptModal;
