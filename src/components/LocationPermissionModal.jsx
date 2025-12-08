import React, { useState } from 'react';
import { MapPin, Settings, Navigation, X, Smartphone } from 'lucide-react';

/**
 * Modal que solicita permisos de ubicación de forma amigable
 * Incluye instrucciones para activar en iOS/Android/Desktop
 */
const LocationPermissionModal = ({
    isOpen,
    onClose,
    onRequestPermission,
    permissionDenied = false
}) => {
    const [showInstructions, setShowInstructions] = useState(false);

    if (!isOpen) return null;

    const handleRequestPermission = async () => {
        try {
            await onRequestPermission();
            onClose();
        } catch (error) {
            setShowInstructions(true);
        }
    };

    // Detectar dispositivo
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isAndroid = /Android/.test(navigator.userAgent);
    const isMobile = isIOS || isAndroid;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                {/* Header con icono */}
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-center text-white">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <MapPin className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold">Activa tu Ubicación</h2>
                    <p className="text-blue-100 mt-2">
                        Para mostrarte negocios cerca de ti
                    </p>
                </div>

                {/* Contenido */}
                <div className="p-6">
                    {!showInstructions && !permissionDenied ? (
                        <>
                            <div className="space-y-4 mb-6">
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <Navigation className="w-4 h-4 text-green-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Encuentra negocios cercanos</h3>
                                        <p className="text-sm text-gray-600">Restaurantes, talleres y servicios a tu alrededor</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-4 h-4 text-blue-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">Mapa centrado en ti</h3>
                                        <p className="text-sm text-gray-600">Verás tu ubicación en el mapa automáticamente</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleRequestPermission}
                                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:from-blue-700 hover:to-purple-700 transition shadow-lg"
                            >
                                📍 Permitir Ubicación
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full mt-3 text-gray-500 py-2 text-sm hover:text-gray-700"
                            >
                                Ahora no
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Instrucciones para activar manualmente */}
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                                <div className="flex items-center gap-2 text-yellow-700 font-semibold mb-2">
                                    <Settings className="w-5 h-5" />
                                    ¿Ubicación bloqueada?
                                </div>
                                <p className="text-sm text-yellow-600">
                                    Parece que la ubicación está desactivada. Sigue estos pasos para activarla:
                                </p>
                            </div>

                            {isMobile ? (
                                <>
                                    {isIOS && (
                                        <div className="space-y-3 mb-4">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                <Smartphone className="w-5 h-5" /> En iPhone/iPad:
                                            </h4>
                                            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                                                <li>Abre <strong>Ajustes</strong> de tu dispositivo</li>
                                                <li>Ve a <strong>Privacidad y seguridad</strong></li>
                                                <li>Toca <strong>Localización</strong></li>
                                                <li>Activa la localización</li>
                                                <li>Busca <strong>Safari/Chrome</strong> y permite ubicación</li>
                                            </ol>
                                        </div>
                                    )}
                                    {isAndroid && (
                                        <div className="space-y-3 mb-4">
                                            <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                                <Smartphone className="w-5 h-5" /> En Android:
                                            </h4>
                                            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                                                <li>Abre <strong>Configuración</strong> de tu dispositivo</li>
                                                <li>Ve a <strong>Ubicación</strong></li>
                                                <li>Activa la ubicación</li>
                                                <li>En Chrome: Toca los 3 puntos → Configuración → Ubicación</li>
                                            </ol>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="space-y-3 mb-4">
                                    <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                        <Settings className="w-5 h-5" /> En tu navegador:
                                    </h4>
                                    <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
                                        <li>Haz clic en el icono de candado 🔒 en la barra de direcciones</li>
                                        <li>Busca "Ubicación" o "Location"</li>
                                        <li>Cambia a <strong>"Permitir"</strong></li>
                                        <li>Recarga la página</li>
                                    </ol>
                                </div>
                            )}

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                            >
                                🔄 Ya activé la ubicación, recargar
                            </button>

                            <button
                                onClick={onClose}
                                className="w-full mt-3 text-gray-500 py-2 text-sm hover:text-gray-700"
                            >
                                Cerrar
                            </button>
                        </>
                    )}
                </div>

                {/* Privacidad */}
                <div className="bg-gray-50 px-6 py-3 text-center">
                    <p className="text-xs text-gray-500">
                        🔒 Tu ubicación solo se usa para mostrarte negocios cercanos. No almacenamos tu ubicación exacta.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LocationPermissionModal;
