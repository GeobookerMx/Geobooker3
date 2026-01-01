// src/components/common/LocationRefreshButton.jsx
/**
 * Botón flotante discreto para actualizar ubicación
 * Se muestra en la esquina del mapa, sin interrumpir la experiencia
 * 
 * Beneficios:
 * - No requiere modal/popup
 * - Feedback visual inmediato (spinner)
 * - Muestra última actualización
 */
import React, { useState } from 'react';
import { Navigation, Loader2, Check } from 'lucide-react';
import { useLocation } from '../../contexts/LocationContext';
import toast from 'react-hot-toast';

export default function LocationRefreshButton({ className = '' }) {
    const { refreshLocation, userLocation, loading } = useLocation();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [justUpdated, setJustUpdated] = useState(false);

    const handleRefresh = async () => {
        if (isRefreshing || loading) return;

        setIsRefreshing(true);
        try {
            await refreshLocation();
            setJustUpdated(true);
            toast.success('📍 Ubicación actualizada', { duration: 2000 });

            // Mostrar checkmark por 2 segundos
            setTimeout(() => setJustUpdated(false), 2000);
        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            toast.error('No se pudo actualizar la ubicación');
        } finally {
            setIsRefreshing(false);
        }
    };

    if (!userLocation) return null;

    return (
        <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className={`
                group flex items-center gap-2 
                bg-white/95 backdrop-blur-sm
                text-gray-700 
                px-3 py-2 
                rounded-full 
                shadow-lg hover:shadow-xl
                border border-gray-200
                transition-all duration-300
                hover:bg-blue-50 hover:border-blue-300
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
            title="Actualizar mi ubicación"
        >
            {/* Ícono con animación */}
            <div className="relative">
                {isRefreshing ? (
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                ) : justUpdated ? (
                    <Check className="w-5 h-5 text-green-500" />
                ) : (
                    <Navigation className="w-5 h-5 text-blue-500 group-hover:text-blue-600" />
                )}
            </div>

            {/* Texto (se oculta en móviles muy pequeños) */}
            <span className="hidden sm:inline text-sm font-medium">
                {isRefreshing ? 'Actualizando...' :
                    justUpdated ? '¡Actualizado!' :
                        'Mi ubicación'}
            </span>

            {/* Punto de ubicación pulsante */}
            {!isRefreshing && !justUpdated && (
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
            )}
        </button>
    );
}
