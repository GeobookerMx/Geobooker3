// src/components/modals/GuestLoginPromptModal.jsx
/**
 * Invitacion no bloqueante para que usuarios invitados creen cuenta despues de buscar.
 * En apps nativas se evita copy de compra directa para mantener compliance de stores.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { X, LogIn, UserPlus, Search, Lock, Store, ShieldCheck } from 'lucide-react';

const GuestLoginPromptModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const isNativeMobile = Capacitor.isNativePlatform() && ['ios', 'android'].includes(Capacitor.getPlatform());
    const headline = isNativeMobile ? 'Crea tu cuenta en Geobooker' : 'Unete a Geobooker';
    const intro = isNativeMobile
        ? 'Guarda busquedas, reclama o registra negocios y accede a mejores herramientas desde tu cuenta.'
        : 'Crea una cuenta gratis para guardar busquedas, reclamar negocios y acceder a opciones avanzadas de visibilidad.';
    const primaryCta = isNativeMobile ? 'Crear cuenta gratis' : 'Crear cuenta / opciones avanzadas';
    const thirdBenefit = isNativeMobile
        ? 'Mejora datos, contacto y seguimiento de tus negocios desde un perfil seguro.'
        : 'Activa herramientas avanzadas: visibilidad, metricas, reputacion y seguimiento.';

    return (
        <div className="fixed inset-0 z-[9999] flex items-end justify-center p-0 md:items-center md:p-4">
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm md:bg-black/60"
                onClick={onClose}
            />

            <div className="relative max-h-[88vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white shadow-2xl animate-[slideUp_0.3s_ease-out] md:rounded-3xl">
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 z-10 rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white md:text-gray-400 md:hover:bg-gray-100 md:hover:text-gray-600"
                    aria-label="Cerrar"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="bg-gradient-to-r from-slate-950 via-blue-700 to-cyan-600 px-6 py-8 text-center text-white">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                        <Lock className="h-8 w-8" />
                    </div>
                    <h2 className="mb-2 text-2xl font-bold">
                        {headline}
                    </h2>
                    <p className="text-sm text-white/90">
                        {intro}
                    </p>
                </div>

                <div className="p-6 pb-[calc(1.5rem+var(--safe-area-inset-bottom,0px))]">
                    <div className="mb-6 space-y-3">
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
                                <Search className="h-4 w-4 text-green-600" />
                            </div>
                            <span>Guarda busquedas, favoritos y rutas de negocios, productos y servicios cercanos.</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
                                <Store className="h-4 w-4 text-blue-600" />
                            </div>
                            <span>Registra tu negocio o solicita control si ya aparece en Geobooker.</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-600">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-purple-100">
                                <ShieldCheck className="h-4 w-4 text-purple-600" />
                            </div>
                            <span>{thirdBenefit}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Link
                            to="/signup?source=guest_search_prompt"
                            onClick={onClose}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-700 to-cyan-600 py-3.5 font-bold text-white shadow-lg transition hover:from-blue-800 hover:to-cyan-700"
                        >
                            <UserPlus className="h-5 w-5" />
                            {primaryCta}
                        </Link>

                        <Link
                            to="/login?source=guest_search_prompt"
                            onClick={onClose}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-100 py-3.5 font-semibold text-gray-700 transition hover:bg-gray-200"
                        >
                            <LogIn className="h-5 w-5" />
                            Ya tengo cuenta
                        </Link>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-semibold">
                        <Link onClick={onClose} to="/business/register?source=guest_search_prompt" className="rounded-xl bg-blue-50 px-3 py-2 text-center text-blue-700 hover:bg-blue-100">
                            Registrar negocio
                        </Link>
                        <Link onClick={onClose} to="/claim?source=guest_search_prompt" className="rounded-xl bg-slate-100 px-3 py-2 text-center text-slate-700 hover:bg-slate-200">
                            Reclamar negocio
                        </Link>
                    </div>

                    <button
                        onClick={onClose}
                        className="mt-4 w-full text-center text-sm text-gray-400 transition hover:text-gray-600"
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
