// src/components/business/LocationEditModal.jsx
/**
 * Modal for editing business location
 * - Google Maps picker for new location
 * - Shows remaining changes this month (max 3)
 * - Updates via Supabase RPC
 */
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { X, MapPin, AlertCircle, Check, Navigation } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const mapContainerStyle = {
    width: '100%',
    height: '300px',
    borderRadius: '0.75rem',
};

export default function LocationEditModal({
    isOpen,
    onClose,
    business,
    onLocationUpdated
}) {
    const [position, setPosition] = useState({
        lat: business?.latitude || 19.4326,
        lng: business?.longitude || -99.1332
    });
    const [loading, setLoading] = useState(false);
    const [canChange, setCanChange] = useState(true);
    const [changesRemaining, setChangesRemaining] = useState(3);
    const [checkingLimit, setCheckingLimit] = useState(true);
    const mapRef = useRef(null);

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    // Check if user can change location
    useEffect(() => {
        const checkCanChange = async () => {
            if (!business?.id) return;

            try {
                const { data, error } = await supabase.rpc('can_change_business_location', {
                    p_business_id: business.id
                });

                if (error) throw error;

                setCanChange(data.can_change);
                setChangesRemaining(data.changes_remaining);
            } catch (err) {
                console.error('Error checking location change limit:', err);
                // Default to allowing if check fails
                setCanChange(true);
                setChangesRemaining(3);
            } finally {
                setCheckingLimit(false);
            }
        };

        if (isOpen) {
            checkCanChange();
        }
    }, [business?.id, isOpen]);

    // Update position when business changes
    useEffect(() => {
        if (business?.latitude && business?.longitude) {
            setPosition({
                lat: business.latitude,
                lng: business.longitude
            });
        }
    }, [business]);

    const onMapClick = useCallback((e) => {
        if (!canChange) return;
        setPosition({
            lat: e.latLng.lat(),
            lng: e.latLng.lng()
        });
    }, [canChange]);

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Tu navegador no soporta geolocalización');
            return;
        }

        toast.loading('Obteniendo tu ubicación...', { id: 'geo' });

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                mapRef.current?.panTo({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                toast.success('Ubicación actualizada', { id: 'geo' });
            },
            (err) => {
                toast.error('No se pudo obtener tu ubicación', { id: 'geo' });
            }
        );
    };

    const handleSave = async () => {
        if (!canChange) {
            toast.error('Has alcanzado el límite de cambios este mes');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.rpc('update_business_location', {
                p_business_id: business.id,
                p_lat: position.lat,
                p_lng: position.lng
            });

            if (error) throw error;

            if (data.success) {
                toast.success(`¡Ubicación actualizada! Te quedan ${data.changes_remaining} cambios este mes`);
                onLocationUpdated?.({
                    ...business,
                    latitude: position.lat,
                    longitude: position.lng
                });
                onClose();
            } else {
                toast.error(data.error || 'Error al actualizar ubicación');
            }
        } catch (err) {
            console.error('Error updating location:', err);
            toast.error('Error al guardar la nueva ubicación');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <MapPin className="w-6 h-6" />
                        <div>
                            <h2 className="text-lg font-bold">Cambiar Ubicación</h2>
                            <p className="text-sm text-white/80">{business?.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Limit Warning */}
                {!checkingLimit && (
                    <div className={`p-3 flex items-center gap-2 ${canChange ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                        {canChange ? (
                            <>
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">
                                    Te quedan <strong>{changesRemaining}</strong> cambios de ubicación este mes
                                </span>
                            </>
                        ) : (
                            <>
                                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm">
                                    Has usado los 3 cambios de ubicación permitidos este mes
                                </span>
                            </>
                        )}
                    </div>
                )}

                {/* Map */}
                <div className="p-4">
                    {isLoaded ? (
                        <GoogleMap
                            mapContainerStyle={mapContainerStyle}
                            center={position}
                            zoom={15}
                            onClick={onMapClick}
                            onLoad={(map) => { mapRef.current = map; }}
                            options={{
                                streetViewControl: false,
                                mapTypeControl: false,
                            }}
                        >
                            <Marker
                                position={position}
                                draggable={canChange}
                                onDragEnd={(e) => {
                                    setPosition({
                                        lat: e.latLng.lat(),
                                        lng: e.latLng.lng()
                                    });
                                }}
                            />
                        </GoogleMap>
                    ) : (
                        <div className="h-[300px] bg-gray-100 rounded-xl flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
                        </div>
                    )}

                    {/* Current Location Button */}
                    <button
                        onClick={handleGetCurrentLocation}
                        disabled={!canChange}
                        className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition disabled:opacity-50"
                    >
                        <Navigation className="w-4 h-4" />
                        Usar mi ubicación actual
                    </button>

                    <p className="text-xs text-gray-500 mt-2 text-center">
                        Haz clic en el mapa o arrastra el marcador para seleccionar la nueva ubicación
                    </p>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-100 p-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium text-gray-700 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!canChange || loading}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Guardando...
                            </>
                        ) : (
                            <>
                                <Check className="w-4 h-4" />
                                Guardar Ubicación
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
