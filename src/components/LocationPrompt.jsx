// src/components/LocationPrompt.jsx
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, X, AlertCircle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationPrompt = () => {
    const { userLocation, permissionGranted, requestLocationPermission } = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Solo mostrar si no hay ubicación y no se ha descartado
        const wasDismissed = localStorage.getItem('locationPromptDismissed');
        if (!userLocation && !permissionGranted && !wasDismissed) {
            // Esperar un poco antes de mostrar para no ser intrusivo
            const timer = setTimeout(() => setIsVisible(true), 2000);
            return () => clearTimeout(timer);
        }
    }, [userLocation, permissionGranted]);

    const handleEnableLocation = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await requestLocationPermission();
            setIsVisible(false);
        } catch (err) {
            setError(err.message);
            // Si es error de permisos, mostrar instrucciones específicas
            if (err.message.includes('denegado')) {
                setError('Para habilitar la ubicación, ve a Configuración de tu navegador → Permisos → Ubicación');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setDismissed(true);
        localStorage.setItem('locationPromptDismissed', 'true');
    };

    const handleRemindLater = () => {
        setIsVisible(false);
        // Mostrar de nuevo en 5 minutos
        setTimeout(() => {
            if (!permissionGranted) {
                setIsVisible(true);
            }
        }, 5 * 60 * 1000);
    };

    if (!isVisible || dismissed || permissionGranted) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                {/* Header visual */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">
                        📍 Mejora tu experiencia
                    </h3>
                    <p className="text-blue-100 text-sm">
                        Permite acceder a tu ubicación para encontrar negocios cerca de ti
                    </p>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-3 text-gray-700">
                            <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                ✅
                            </span>
                            <span className="text-sm">Ver negocios cercanos a ti</span>
                        </li>
                        <li className="flex items-center gap-3 text-gray-700">
                            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                🗺️
                            </span>
                            <span className="text-sm">Obtener direcciones precisas</span>
                        </li>
                        <li className="flex items-center gap-3 text-gray-700">
                            <span className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                ⚡
                            </span>
                            <span className="text-sm">Resultados personalizados</span>
                        </li>
                    </ul>

                    {/* Buttons */}
                    <div className="space-y-3">
                        <button
                            onClick={handleEnableLocation}
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
                        >
                            {isLoading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    Obteniendo ubicación...
                                </>
                            ) : (
                                <>
                                    <Navigation className="w-5 h-5" />
                                    Habilitar ubicación
                                </>
                            )}
                        </button>

                        <div className="flex gap-2">
                            <button
                                onClick={handleRemindLater}
                                className="flex-1 py-2 px-4 text-gray-600 hover:bg-gray-100 rounded-lg transition text-sm"
                            >
                                Recordar después
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="flex-1 py-2 px-4 text-gray-400 hover:bg-gray-100 rounded-lg transition text-sm"
                            >
                                No, gracias
                            </button>
                        </div>
                    </div>

                    <p className="text-xs text-gray-400 text-center mt-4">
                        🔒 Tu ubicación solo se usa para mostrarte negocios cercanos.
                        Nunca compartimos tus datos.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LocationPrompt;
