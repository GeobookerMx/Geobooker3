// src/components/pwa/DownloadAppModal.jsx
/**
 * Modal atractivo que sugiere descargar la app PWA
 * Se muestra después de que el usuario ha navegado un poco
 */
import React, { useState, useEffect } from 'react';
import { X, Download, Smartphone, Star, Zap, Bell, Check } from 'lucide-react';

export default function DownloadAppModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
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

        // Check if already dismissed recently
        const lastDismissed = localStorage.getItem('app_modal_dismissed');
        if (lastDismissed) {
            const dismissedDate = new Date(lastDismissed);
            const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceDismissed < 7) return; // Don't show for 7 days
        }

        // Listen for install prompt
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // Show modal after 30 seconds of browsing
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 30000);

        // Or after 3 page views
        const pageViews = parseInt(sessionStorage.getItem('page_views') || '0') + 1;
        sessionStorage.setItem('page_views', pageViews.toString());

        if (pageViews >= 3) {
            setTimeout(() => setIsVisible(true), 5000);
        }

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            clearTimeout(timer);
        };
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsVisible(false);
                localStorage.setItem('app_installed', 'true');
            }
            setDeferredPrompt(null);
        } else if (isIOS) {
            // Show iOS instructions
            alert('Para instalar:\n\n1. Toca el botón "Compartir" (📤)\n2. Selecciona "Agregar a pantalla de inicio"\n3. Toca "Agregar"');
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('app_modal_dismissed', new Date().toISOString());
    };

    if (isInstalled || !isVisible) return null;

    const benefits = [
        { icon: Zap, text: 'Acceso instantáneo sin abrir navegador' },
        { icon: Bell, text: 'Notificaciones de ofertas cercanas' },
        { icon: Star, text: 'Experiencia premium sin anuncios' },
    ];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden animate-scaleIn">
                {/* Header con gradiente */}
                <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 p-6 text-white relative overflow-hidden">
                    {/* Decoración de fondo */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />

                    <button
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="relative">
                        <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4 mx-auto overflow-hidden">
                            <img
                                src="/images/geobooker-app-icon-original.jpg"
                                alt="Geobooker"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <h2 className="text-2xl font-bold text-center">
                            ¡Lleva Geobooker contigo!
                        </h2>
                        <p className="text-indigo-100 text-center mt-2">
                            Instala nuestra app gratuita en tu dispositivo
                        </p>
                    </div>
                </div>

                {/* Beneficios */}
                <div className="p-6">
                    <div className="space-y-4 mb-6">
                        {benefits.map((benefit, idx) => (
                            <div key={idx} className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                                    <benefit.icon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="text-gray-700">{benefit.text}</span>
                                <Check className="w-5 h-5 text-green-500 ml-auto" />
                            </div>
                        ))}
                    </div>

                    {/* Botones */}
                    <div className="space-y-3">
                        <button
                            onClick={handleInstall}
                            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                        >
                            <Download className="w-6 h-6" />
                            <span className="text-lg">Descargar App Gratis</span>
                        </button>

                        <button
                            onClick={handleDismiss}
                            className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm transition"
                        >
                            Quizás más tarde
                        </button>
                    </div>

                    {/* Footer */}
                    <p className="text-center text-xs text-gray-400 mt-4">
                        Sin necesidad de ir a la tienda de apps
                    </p>
                </div>
            </div>
        </div>
    );
}
