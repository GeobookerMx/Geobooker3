// src/components/recommendations/RecommendationForm.jsx
// Modal/Formulario para que usuarios recomienden negocios

import React, { useState, useEffect, useCallback } from 'react';
import { X, Star, MapPin, Camera, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

// Categorías disponibles para negocios
const CATEGORIES = [
    { value: 'restaurantes', label: '🍴 Restaurantes y Comida' },
    { value: 'salud', label: '💊 Salud y Farmacias' },
    { value: 'servicios', label: '💼 Servicios Profesionales' },
    { value: 'belleza', label: '💅 Belleza y Spa' },
    { value: 'educacion', label: '🎓 Educación' },
    { value: 'tiendas', label: '🛒 Tiendas y Comercios' },
    { value: 'entretenimiento', label: '🎮 Entretenimiento' },
    { value: 'automotriz', label: '🚗 Automotriz' },
    { value: 'hogar', label: '🏠 Hogar y Jardín' },
    { value: 'otro', label: '📦 Otro' }
];

const RecommendationForm = ({ isOpen, onClose, userLocation, onSuccess }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [checkingLimit, setCheckingLimit] = useState(true);
    const [limitInfo, setLimitInfo] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        address: '',
        rating: 0,
        pros: '',
        cons: '',
        photo: null
    });

    const [location, setLocation] = useState({
        lat: userLocation?.lat || null,
        lng: userLocation?.lng || null,
        verified: !!(userLocation?.lat)
    });

    const [photoPreview, setPhotoPreview] = useState(null);

    // Verificar límite del usuario
    useEffect(() => {
        const checkLimit = async () => {
            if (!user?.id) return;

            try {
                const { data, error } = await supabase.rpc('can_user_recommend', {
                    p_user_id: user.id
                });

                if (error) throw error;
                setLimitInfo(data?.[0] || { can_recommend: true, current_count: 0, monthly_limit: 10, remaining: 10 });
            } catch (err) {
                console.error('Error checking recommendation limit:', err);
                setLimitInfo({ can_recommend: true, current_count: 0, monthly_limit: 10, remaining: 10 });
            } finally {
                setCheckingLimit(false);
            }
        };

        if (isOpen) {
            checkLimit();
        }
    }, [user?.id, isOpen]);

    // Obtener ubicación actual
    const getCurrentLocation = useCallback(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        verified: true
                    });
                    toast.success('¡Ubicación verificada! Tu recomendación tendrá el badge 📍 Verificado');
                },
                (error) => {
                    console.error('Error getting location:', error);
                    toast.error('No se pudo obtener tu ubicación');
                }
            );
        }
    }, []);

    // Manejar cambio de foto
    const handlePhotoChange = (e) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('La imagen debe ser menor a 5MB');
                return;
            }
            setFormData(prev => ({ ...prev, photo: file }));
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    // Subir foto a Supabase Storage
    const uploadPhoto = async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;

        const { data, error } = await supabase.storage
            .from('recommendations')
            .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('recommendations')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    // Enviar recomendación
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!user?.id) {
            toast.error('Debes iniciar sesión para recomendar');
            return;
        }

        if (!formData.name || !formData.category || !formData.rating) {
            toast.error('Completa los campos requeridos');
            return;
        }

        if (!limitInfo?.can_recommend) {
            toast.error('Has alcanzado tu límite mensual de recomendaciones');
            return;
        }

        setLoading(true);

        try {
            let photoUrl = null;

            // Subir foto si existe
            if (formData.photo) {
                photoUrl = await uploadPhoto(formData.photo);
            }

            // Insertar recomendación
            const { data, error } = await supabase
                .from('user_recommendations')
                .insert({
                    user_id: user.id,
                    name: formData.name.trim(),
                    category: formData.category,
                    address: formData.address.trim() || null,
                    latitude: location.lat || null,
                    longitude: location.lng || null,
                    rating: formData.rating,
                    pros: formData.pros.trim() || null,
                    cons: formData.cons.trim() || null,
                    photo_url: photoUrl,
                    status: 'pending'
                })
                .select()
                .single();

            if (error) throw error;

            toast.success('¡Recomendación enviada! Será revisada pronto.');

            // Reset form
            setFormData({
                name: '',
                category: '',
                address: '',
                rating: 0,
                pros: '',
                cons: ''
            });
            setPhotoPreview(null);

            onSuccess?.();
            onClose();
        } catch (err) {
            console.error('Error submitting recommendation:', err);
            toast.error('Error al enviar recomendación');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold">Recomendar Negocio</h2>
                            <p className="text-green-100 text-sm mt-1">
                                Comparte un lugar que te gustó
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-full transition"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Contador de recomendaciones */}
                    {!checkingLimit && limitInfo && (
                        <div className="mt-3 bg-white/20 rounded-lg px-3 py-2 text-sm">
                            <span className="font-medium">
                                {limitInfo.current_count}/{limitInfo.monthly_limit}
                            </span>
                            <span className="opacity-80"> recomendaciones este mes</span>
                            {limitInfo.remaining > 0 && (
                                <span className="ml-2 text-green-200">
                                    ({limitInfo.remaining} disponibles)
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Contenido */}
                {checkingLimit ? (
                    <div className="p-8 text-center">
                        <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                        <p className="mt-4 text-gray-600">Verificando disponibilidad...</p>
                    </div>
                ) : !limitInfo?.can_recommend ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-800 mb-2">
                            Límite mensual alcanzado
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Has usado {limitInfo.current_count} de {limitInfo.monthly_limit} recomendaciones este mes.
                        </p>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-left">
                            <p className="text-sm text-amber-800">
                                <strong>💡 Tip:</strong> Invita amigos con tu código de referido
                                para desbloquear +5 recomendaciones adicionales por cada invitación exitosa.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-6 space-y-5">
                        {/* Nombre del negocio */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del negocio *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="Ej: Café La Parroquia"
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            />
                        </div>

                        {/* Categoría */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tipo de negocio *
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                required
                            >
                                <option value="">Selecciona una categoría</option>
                                {CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rating */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                ¿Cómo lo calificas? *
                            </label>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                                        className={`p-2 rounded-full transition ${formData.rating >= star
                                            ? 'text-yellow-400 hover:text-yellow-500'
                                            : 'text-gray-300 hover:text-gray-400'
                                            }`}
                                    >
                                        <Star className="w-8 h-8" fill={formData.rating >= star ? 'currentColor' : 'none'} />
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Ubicación */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ubicación
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                                    placeholder="Dirección o referencia (opcional)"
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500"
                                />
                                <button
                                    type="button"
                                    onClick={getCurrentLocation}
                                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition"
                                    title="Usar mi ubicación"
                                >
                                    <MapPin className="w-5 h-5 text-gray-600" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {location.verified ? (
                                    <span className="text-green-600 font-medium">
                                        ✅ Ubicación verificada • Lat: {location.lat?.toFixed(4)}, Lng: {location.lng?.toFixed(4)}
                                    </span>
                                ) : (
                                    <span className="text-amber-600">
                                        ⚠️ Sin ubicación verificada. Toca el botón 📍 para verificar tu zona y dar más credibilidad.
                                    </span>
                                )}
                            </p>
                        </div>

                        {/* Pros */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ¿Qué te gustó? 👍
                            </label>
                            <textarea
                                value={formData.pros}
                                onChange={(e) => setFormData(prev => ({ ...prev, pros: e.target.value }))}
                                placeholder="Buena comida, excelente servicio, precios justos..."
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 resize-none"
                            />
                        </div>

                        {/* Cons */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ¿Qué NO te gustó? 👎
                            </label>
                            <textarea
                                value={formData.cons}
                                onChange={(e) => setFormData(prev => ({ ...prev, cons: e.target.value }))}
                                placeholder="Tardaron mucho, muy ruidoso..."
                                rows={2}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 resize-none"
                            />
                        </div>

                        {/* Foto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Agregar foto (opcional)
                            </label>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition">
                                    <Camera className="w-5 h-5 text-gray-600" />
                                    <span className="text-sm text-gray-700">Subir imagen</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoChange}
                                        className="hidden"
                                    />
                                </label>
                                {photoPreview && (
                                    <img
                                        src={photoPreview}
                                        alt="Preview"
                                        className="w-16 h-16 object-cover rounded-lg"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send className="w-5 h-5" />
                                    Enviar Recomendación
                                </>
                            )}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default RecommendationForm;
