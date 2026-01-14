// src/components/pwa/InstallPrompt.jsx
/**
 * PWA Install Prompt Component
 * Shows a visible banner/button to install the app
 * Works even after the native browser prompt has been dismissed
 */
import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showBanner, setShowBanner] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Check if iOS
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        setIsIOS(isIOSDevice);

        // Check if dismissed before (localStorage)
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        const dismissedTime = dismissed ? parseInt(dismissed) : 0;
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);

        if (dismissedTime < oneDayAgo) {
            setShowBanner(true);
        }

        // Listen for install prompt
        const handler = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if installed after
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setShowBanner(false);
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            // Show iOS instructions
            alert('Para instalar en iPhone/iPad:\n\n1. Toca el botón "Compartir" (📤)\n2. Selecciona "Agregar a pantalla de inicio"\n3. Confirma "Agregar"');
        }
    };

    const handleDismiss = () => {
        setShowBanner(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    if (isInstalled || !showBanner) return null;

    return (
        <>
            {/* Floating Button (Mobile) */}
            <div className="fixed bottom-20 right-4 z-50 md:hidden">
                <button
                    onClick={handleInstall}
                    className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all animate-bounce"
                >
                    <Download className="w-5 h-5" />
                    <span className="font-bold">Descargar App</span>
                </button>
            </div>

            {/* Banner (Desktop) */}
            <div className="hidden md:block fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
                <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl shadow-2xl border border-gray-100">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Smartphone className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">¡Descarga Geobooker!</h3>
                        <p className="text-sm text-gray-500">Accede más rápido desde tu dispositivo</p>
                    </div>
                    <button
                        onClick={handleInstall}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Instalar
                    </button>
                    <button
                        onClick={handleDismiss}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Mobile Banner */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 safe-area-pb">
                <div className="flex items-center justify-between max-w-lg mx-auto">
                    <div className="flex items-center gap-3">
                        <Smartphone className="w-8 h-8" />
                        <div>
                            <p className="font-bold text-sm">Instala Geobooker</p>
                            <p className="text-xs text-indigo-200">Acceso directo en tu celular</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleInstall}
                            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50"
                        >
                            Instalar
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-1.5 text-indigo-200 hover:text-white"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default InstallPrompt;
