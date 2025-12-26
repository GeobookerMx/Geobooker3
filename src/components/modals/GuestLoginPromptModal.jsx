// src/components/modals/GuestLoginPromptModal.jsx
/**
 * Modal que aparece cuando un invitado intenta hacer más búsquedas
 * de las permitidas sin iniciar sesión
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { X, LogIn, UserPlus, Search, Lock } from 'lucide-react';

const GuestLoginPromptModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-[slideUp_0.3s_ease-out]">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header with gradient */}
                <div className="bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 px-6 py-8 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">
                        ¡Únete a Geobooker!
                    </h2>
                    <p className="text-white/90 text-sm">
                        Crea una cuenta gratis para seguir buscando negocios
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Benefits */}
                    <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Search className="w-4 h-4 text-green-600" />
                            </div>
                            <span>Búsquedas ilimitadas de negocios</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">🏪</span>
                            </div>
                            <span>Registra tu negocio GRATIS</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-lg">⭐</span>
                            </div>
                            <span>Guarda tus negocios favoritos</span>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3">
                        <Link
                            to="/signup"
                            className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition shadow-lg"
                        >
                            <UserPlus className="w-5 h-5" />
                            Crear cuenta gratis
                        </Link>

                        <Link
                            to="/login"
                            className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-3.5 rounded-xl font-semibold hover:bg-gray-200 transition"
                        >
                            <LogIn className="w-5 h-5" />
                            Ya tengo cuenta
                        </Link>
                    </div>

                    {/* Skip link */}
                    <button
                        onClick={onClose}
                        className="w-full text-center text-sm text-gray-400 mt-4 hover:text-gray-600 transition"
                    >
                        Quizás después
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
