// src/components/LocationPrompt.jsx
// Apple Guideline 5.1.1(iv) compliant — neutral button wording
import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { useLocation } from '../contexts/LocationContext';

const LocationPrompt = () => {
    const { userLocation, permissionGranted, requestLocationPermission } = useLocation();
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Only show if no location and not dismissed
        const wasDismissed = localStorage.getItem('locationPromptDismissed');

        if (!userLocation && !permissionGranted && !wasDismissed) {
            // Wait before showing to avoid being intrusive
            const timer = setTimeout(() => setIsVisible(true), 3000);
            return () => clearTimeout(timer);
        }
    }, [userLocation, permissionGranted]);

    const handleContinue = async () => {
        setIsLoading(true);
        setError(null);

        try {
            await requestLocationPermission();
            setIsVisible(false);
        } catch (err) {
            setError(err.message);
            if (err.message.includes('denegado')) {
                setError('Para habilitar la ubicación, ve a Configuración de tu navegador → Permisos → Ubicación');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        setIsVisible(false);
        setDismissed(true);
        localStorage.setItem('locationPromptDismissed', 'true');
    };

    if (!isVisible || dismissed || permissionGranted) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-slide-up">
                {/* Header con logo de Geobooker */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white text-center">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 p-2 shadow-lg">
                        <img
                            src="/images/geobooker-logo.png"
                            alt="Geobooker"
                            className="w-full h-full object-contain"
                        />
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

                    {/* Buttons — Apple 5.1.1(iv) compliant */}
                    <div className="space-y-3">
                        <button
                            onClick={handleContinue}
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
                                    Continuar
                                </>
                            )}
                        </button>

                        <button
                            onClick={handleSkip}
                            className="w-full py-2 px-4 text-gray-400 hover:bg-gray-100 rounded-lg transition text-sm"
                        >
                            Omitir
                        </button>
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
