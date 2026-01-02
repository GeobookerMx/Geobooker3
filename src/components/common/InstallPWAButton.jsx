// src/components/common/InstallPWAButton.jsx
/**
 * Botón visible e intuitivo para instalar Geobooker como PWA
 * Muestra diferentes estados según el soporte del navegador
 */
import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Check, Share, ExternalLink } from 'lucide-react';

export default function InstallPWAButton({ variant = 'button', showDismiss = true }) {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSInstructions, setShowIOSInstructions] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Detectar si ya está instalada
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Detectar iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // Verificar si fue descartado previamente
        const wasDismissed = localStorage.getItem('pwa_install_dismissed');
        if (wasDismissed) {
            const dismissedTime = new Date(wasDismissed).getTime();
            const now = new Date().getTime();
            // Volver a mostrar después de 7 días
            if (now - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                setDismissed(true);
            }
        }

        // Capturar el evento beforeinstallprompt (Chrome, Edge, etc.)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        // Detectar cuando se instala
        const handleAppInstalled = () => {
            setIsInstalled(true);
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSInstructions(true);
            return;
        }

        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setIsInstalled(true);
        }

        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setDismissed(true);
        localStorage.setItem('pwa_install_dismissed', new Date().toISOString());
    };

    // No mostrar si ya está instalada o fue descartada
    if (isInstalled || dismissed) return null;

    // No mostrar si no hay soporte y no es iOS
    if (!deferredPrompt && !isIOS) return null;

    // VARIANTE: Banner flotante (más visible)
    if (variant === 'banner') {
        return (
            <>
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-2xl shadow-2xl p-4 z-50 animate-slide-up">
                    <div className="flex items-start gap-3">
                        {/* Icono */}
                        <div className="flex-shrink-0 w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                            <img
                                src="/images/geobooker-favicon.png"
                                alt="Geobooker"
                                className="w-10 h-10 object-contain"
                            />
                        </div>

                        {/* Contenido */}
                        <div className="flex-1">
                            <h4 className="font-bold text-lg">📱 Instala Geobooker</h4>
                            <p className="text-blue-100 text-sm mb-3">
                                Acceso rápido desde tu pantalla de inicio
                            </p>

                            <div className="flex gap-2">
                                <button
                                    onClick={handleInstallClick}
                                    className="flex-1 flex items-center justify-center gap-2 bg-white text-blue-600 font-bold py-2.5 px-4 rounded-xl hover:bg-blue-50 transition-all transform hover:scale-105 shadow-lg"
                                >
                                    <Download className="w-5 h-5" />
                                    {isIOS ? 'Cómo instalar' : 'Instalar gratis'}
                                </button>

                                {showDismiss && (
                                    <button
                                        onClick={handleDismiss}
                                        className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 transition-colors"
                                        aria-label="Cerrar"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal instrucciones iOS */}
                {showIOSInstructions && <IOSInstructionsModal onClose={() => setShowIOSInstructions(false)} />}
            </>
        );
    }

    // VARIANTE: Botón simple
    return (
        <>
            <button
                onClick={handleInstallClick}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
            >
                <Download className="w-5 h-5" />
                <span>Instalar App</span>
            </button>

            {showIOSInstructions && <IOSInstructionsModal onClose={() => setShowIOSInstructions(false)} />}
        </>
    );
}

/**
 * Modal con instrucciones para iOS (Safari)
 */
function IOSInstructionsModal({ onClose }) {
    return (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end md:items-center justify-center p-4">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-md shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-3xl md:rounded-t-3xl">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold">📱 Instalar en iPhone/iPad</h3>
                        <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-blue-100 text-sm">
                        En Safari, sigue estos pasos para agregar Geobooker a tu pantalla de inicio:
                    </p>
                </div>

                {/* Steps */}
                <div className="p-6 space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                            1
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Toca el botón compartir</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                El ícono <Share className="w-4 h-4 inline" /> en la barra de Safari
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-bold">
                            2
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">Desliza y busca</p>
                            <p className="text-sm text-gray-500">
                                "Agregar a pantalla de inicio"
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold">
                            3
                        </div>
                        <div>
                            <p className="font-medium text-gray-900">¡Toca "Agregar"!</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                                <Check className="w-4 h-4 text-green-500" />
                                Geobooker aparecerá como app
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preview */}
                <div className="px-6 pb-6">
                    <div className="bg-gray-100 rounded-xl p-4 flex items-center gap-3">
                        <img
                            src="/images/geobooker-favicon.png"
                            alt="Geobooker"
                            className="w-12 h-12 rounded-xl shadow"
                        />
                        <div>
                            <p className="font-bold text-gray-900">Geobooker</p>
                            <p className="text-xs text-gray-500">geobooker.com.mx</p>
                        </div>
                    </div>
                </div>

                {/* Close button */}
                <div className="px-6 pb-6">
                    <button
                        onClick={onClose}
                        className="w-full bg-gray-900 text-white py-3 rounded-xl font-semibold hover:bg-gray-800 transition"
                    >
                        ¡Entendido!
                    </button>
                </div>
            </div>
        </div>
    );
}

/**
 * Banner pequeño para el header/navbar
 */
export function InstallPWABadge({ className = '' }) {
    const [showBanner, setShowBanner] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);

    useEffect(() => {
        if (window.matchMedia('(display-mode: standalone)').matches) return;

        const handlePrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handlePrompt);
        return () => window.removeEventListener('beforeinstallprompt', handlePrompt);
    }, []);

    if (!showBanner) return null;

    return (
        <button
            onClick={async () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice;
                    setShowBanner(false);
                }
            }}
            className={`flex items-center gap-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full animate-pulse ${className}`}
        >
            <Download className="w-3 h-3" />
            Instalar
        </button>
    );
}
