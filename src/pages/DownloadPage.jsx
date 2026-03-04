// src/pages/DownloadPage.jsx
// Landing page para descargar la PWA - se usará en QR codes

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import SEO from '../components/SEO';

const DownloadPage = () => {
    const [platform, setPlatform] = useState('unknown');
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Detectar plataforma
        const userAgent = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        } else if (/windows/.test(userAgent)) {
            setPlatform('windows');
        } else if (/macintosh|mac os x/.test(userAgent)) {
            setPlatform('mac');
        }

        // Verificar si ya está instalado
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
        }

        // Capturar evento beforeinstallprompt
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstall = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                setIsInstalled(true);
            }
            setDeferredPrompt(null);
        }
    };

    const renderIOSInstructions = () => (
        <div className="bg-gray-800 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">📱 Instalar en iPhone/iPad</h3>
            <ol className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                    <span>Toca el botón <strong>Compartir</strong> (📤) en Safari</span>
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                    <span>Desplázate y toca <strong>"Añadir a pantalla de inicio"</strong></span>
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">3</span>
                    <span>Confirma tocando <strong>"Añadir"</strong></span>
                </li>
            </ol>
            <p className="text-sm text-gray-400 mt-4">
                💡 Pronto estaremos disponibles en App Store
            </p>
        </div>
    );

    const renderAndroidInstructions = () => (
        <div className="bg-gray-800 rounded-xl p-6 mt-6">
            <h3 className="text-lg font-bold text-white mb-4">📱 Instalar en Android</h3>
            {deferredPrompt ? (
                <button
                    onClick={handleInstall}
                    className="w-full bg-green-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-green-500 transition flex items-center justify-center gap-2"
                >
                    <span className="text-2xl">📲</span>
                    Instalar App Ahora
                </button>
            ) : (
                <ol className="space-y-3 text-gray-300">
                    <li className="flex gap-3">
                        <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">1</span>
                        <span>Toca el menú <strong>⋮</strong> de tu navegador</span>
                    </li>
                    <li className="flex gap-3">
                        <span className="bg-green-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold">2</span>
                        <span>Selecciona <strong>"Instalar app"</strong> o <strong>"Añadir a inicio"</strong></span>
                    </li>
                </ol>
            )}
            <p className="text-sm text-gray-400 mt-4">
                💡 Descarga Geobooker y lleva el directorio en tu bolsillo
            </p>
        </div>
    );

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
            <SEO
                title="Descargar Geobooker App | Directorio de Negocios"
                description="Descarga la app de Geobooker gratis. Encuentra negocios cerca de ti desde tu celular."
            />

            {/* Hero */}
            <div className="container mx-auto px-4 py-12">
                <div className="max-w-lg mx-auto text-center">
                    {/* Logo */}
                    <img
                        src="/images/geobooker-logo.png"
                        alt="Geobooker"
                        className="h-20 mx-auto mb-6"
                    />

                    <h1 className="text-4xl font-bold text-white mb-4">
                        📍 Geobooker
                    </h1>
                    <p className="text-xl text-gray-300 mb-8">
                        Encuentra negocios cerca de ti
                    </p>

                    {isInstalled ? (
                        <div className="bg-green-600/20 border border-green-500 rounded-xl p-6 text-center">
                            <span className="text-4xl">✅</span>
                            <h2 className="text-xl font-bold text-green-400 mt-2">¡App Instalada!</h2>
                            <p className="text-gray-300 mt-2">Abre Geobooker desde tu pantalla de inicio</p>
                            <Link
                                to="/"
                                className="inline-block mt-4 bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-500 transition"
                            >
                                Abrir Geobooker
                            </Link>
                        </div>
                    ) : (
                        <>
                            {/* Botón principal */}
                            {platform === 'android' && deferredPrompt && (
                                <button
                                    onClick={handleInstall}
                                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-xl font-bold text-xl hover:from-green-500 hover:to-emerald-500 transition shadow-lg flex items-center justify-center gap-3"
                                >
                                    <span className="text-3xl">📲</span>
                                    Instalar Gratis
                                </button>
                            )}

                            {/* Características */}
                            <div className="grid grid-cols-2 gap-4 mt-8">
                                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                    <span className="text-3xl">🗺️</span>
                                    <p className="text-white mt-2 text-sm font-medium">Mapa interactivo</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                    <span className="text-3xl">⭐️</span>
                                    <p className="text-white mt-2 text-sm font-medium">Reseñas reales</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                    <span className="text-3xl">📍</span>
                                    <p className="text-white mt-2 text-sm font-medium">Geolocalización</p>
                                </div>
                                <div className="bg-gray-800/50 rounded-xl p-4 text-center">
                                    <span className="text-3xl">💰</span>
                                    <p className="text-white mt-2 text-sm font-medium">100% Gratis</p>
                                </div>
                            </div>

                            {/* Instrucciones según plataforma */}
                            {platform === 'ios' && renderIOSInstructions()}
                            {platform === 'android' && renderAndroidInstructions()}

                            {/* Desktop */}
                            {(platform === 'windows' || platform === 'mac') && (
                                <div className="bg-gray-800 rounded-xl p-6 mt-6 text-center">
                                    <p className="text-gray-300">
                                        📱 Para la mejor experiencia, abre esta página desde tu celular
                                    </p>
                                    <div className="mt-4 p-4 bg-white rounded-lg inline-block">
                                        <p className="text-gray-800 font-mono text-sm">geobooker.com.mx/download</p>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Footer */}
                    <div className="mt-12 text-center">
                        <Link to="/" className="text-blue-400 hover:underline">
                            ← Volver al inicio
                        </Link>
                        <p className="text-gray-500 text-sm mt-4">
                            © 2026 Geobooker. Todos los derechos reservados.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DownloadPage;
