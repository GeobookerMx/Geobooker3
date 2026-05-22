// src/components/recommendations/AIRecommendations.jsx
/**
 * Carrusel de recomendaciones "La IA de Geobooker te recomienda"
 * Muestra negocios personalizados basados en:
 * - Ubicación del usuario
 * - Hora del día
 * - Rating alto
 * - Negocios Premium
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useLocation } from '../../contexts/LocationContext';
import { Phone, MessageCircle, MapPin, Star, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { trackWhatsAppClick, trackCallClick, trackDirectionsClick, trackAIRecommendationShown, trackAIRecommendationClick } from '../../services/analyticsService';

const AIRecommendations = () => {
    const { userLocation } = useLocation();
    const navigate = useNavigate();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [timeContext, setTimeContext] = useState('');
    const autoRotateRef = useRef(null);

    useEffect(() => {
        loadRecommendations();
        setTimeContext(getTimeContext());
    }, [userLocation]);

    // Determinar contexto de hora del día
    const getTimeContext = () => {
        const hour = new Date().getHours();
        if (hour >= 6 && hour < 12) return 'mañana';
        if (hour >= 12 && hour < 17) return 'tarde';
        if (hour >= 17 && hour < 21) return 'atardecer';
        return 'noche';
    };

    // Obtener categorías relevantes según la hora
    const getRelevantCategories = () => {
        const hour = new Date().getHours();

        if (hour >= 7 && hour < 11) {
            return ['cafeteria', 'panaderia', 'restaurante']; // Desayuno
        } else if (hour >= 12 && hour < 15) {
            return ['restaurante', 'comida_rapida', 'cocina_economica']; // Comida
        } else if (hour >= 17 && hour < 21) {
            return ['restaurante', 'bar', 'entretenimiento']; // Cena
        } else if (hour >= 21 || hour < 6) {
            return ['farmacia', 'clinica', 'gasolineria']; // Noche/emergencias
        }
        return []; // Todo
    };

    const loadRecommendations = async () => {
        try {
            setLoading(true);

            // Query base: negocios aprobados, más recientes primero
            let query = supabase
                .from('businesses')
                .select('*')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(10);

            // Filtrar por categorías si es hora específica
            const relevantCategories = getRelevantCategories();
            if (relevantCategories.length > 0) {
                query = query.in('category', relevantCategories);
            }

            const { data, error } = await query;

            if (error) throw error;

            // Si hay ubicación, calcular distancias y ordenar
            if (userLocation?.lat && userLocation?.lng && data) {
                const withDistance = data.map(business => ({
                    ...business,
                    distance: calculateDistance(
                        userLocation.lat,
                        userLocation.lng,
                        business.latitude,
                        business.longitude
                    )
                }));

                // Ordenar: mejor rating y cerca primero
                withDistance.sort((a, b) => {
                    // Primero por rating
                    if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
                    // Luego por distancia
                    return a.distance - b.distance;
                });

                const finalRecs = withDistance.slice(0, 6);
                setRecommendations(finalRecs);
                if (finalRecs.length > 0) trackAIRecommendationShown(finalRecs.length);
            } else {
                const finalRecs = data || [];
                setRecommendations(finalRecs);
                if (finalRecs.length > 0) trackAIRecommendationShown(finalRecs.length);
            }
        } catch (error) {
            console.error('Error loading recommendations:', error);
        } finally {
            setLoading(false);
        }
    };

    // Calcular distancia en km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return 999;
        const R = 6371;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    // Auto-rotación cada 4 segundos
    const startAutoRotate = useCallback(() => {
        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
        autoRotateRef.current = setInterval(() => {
            setCurrentIndex(prev =>
                prev + 2 >= recommendations.length ? 0 : prev + 2
            );
        }, 4000);
    }, [recommendations.length]);

    useEffect(() => {
        if (recommendations.length > 2) {
            startAutoRotate();
        }
        return () => { if (autoRotateRef.current) clearInterval(autoRotateRef.current); };
    }, [recommendations.length, startAutoRotate]);

    const nextSlide = () => {
        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
        setCurrentIndex((prev) =>
            prev + 2 >= recommendations.length ? 0 : prev + 2
        );
        startAutoRotate();
    };

    const prevSlide = () => {
        if (autoRotateRef.current) clearInterval(autoRotateRef.current);
        setCurrentIndex((prev) =>
            prev - 2 < 0 ? Math.max(0, recommendations.length - 2) : prev - 2
        );
        startAutoRotate();
    };

    const openWhatsApp = (businessId, businessName, phone) => {
        trackWhatsAppClick(businessId, businessName, 'ai_recommendations');
        const cleanPhone = phone?.replace(/\D/g, '');
        const message = `Hola, encontré tu negocio ${businessName} en Geobooker y me gustaría más información.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const openPhone = (businessId, businessName, phone) => {
        trackCallClick(businessId, businessName, 'ai_recommendations');
        window.open(`tel:${phone}`, '_self');
    };

    const openMaps = (businessId, businessName, lat, lng) => {
        trackDirectionsClick(businessId, businessName, 'ai_recommendations');
        window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
    };

    if (loading) {
        return (
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-6 h-6 text-purple-600 animate-pulse" />
                    <span className="font-bold text-gray-800">Analizando recomendaciones...</span>
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex-1 bg-white rounded-xl p-4 animate-pulse">
                            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (recommendations.length === 0) return null;

    const visibleItems = recommendations.slice(currentIndex, currentIndex + 2);

    return (
        <div className="rounded-2xl mb-6 overflow-hidden" style={{ background: 'linear-gradient(135deg, #f5f3ff 0%, #eff6ff 50%, #ecfeff 100%)', border: '1px solid #e9d5ff' }}>
            {/* Header pill — "La IA te recomienda" */}
            <div style={{
                background: 'linear-gradient(90deg, #7c3aed, #2563eb)',
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                        background: 'rgba(255,255,255,0.2)',
                        borderRadius: '10px',
                        padding: '6px',
                        display: 'flex',
                        alignItems: 'center',
                    }}>
                        <Sparkles style={{ width: 18, height: 18, color: '#fff' }} />
                    </div>
                    <div>
                        <p style={{ color: '#fff', fontWeight: 700, fontSize: '15px', margin: 0 }}>
                            🤖 La IA te recomienda
                        </p>
                        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '11px', margin: 0 }}>
                            Basado en tu ubicación · Esta {timeContext}
                        </p>
                    </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-1.5">
                    <button
                        onClick={prevSlide}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        aria-label="Anterior"
                    >
                        <ChevronLeft style={{ width: 18, height: 18, color: '#fff' }} />
                    </button>
                    <button
                        onClick={nextSlide}
                        style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        aria-label="Siguiente"
                    >
                        <ChevronRight style={{ width: 18, height: 18, color: '#fff' }} />
                    </button>
                </div>
            </div>

            <div style={{ padding: '16px' }}>

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{ marginBottom: '12px' }}>
                {visibleItems.map((business) => (
                    <div
                        key={business.id}
                        className="bg-white rounded-xl p-4 shadow-md hover:shadow-lg transition-all duration-300 border border-gray-100 relative overflow-hidden"
                    >
                        {/* Premium Badge */}
                        {business.is_premium && (
                            <div className="absolute top-0 right-0 bg-gradient-to-l from-yellow-400 to-amber-500 text-white text-xs px-3 py-1 rounded-bl-lg font-semibold">
                                ⭐ Premium
                            </div>
                        )}

                        {/* Business Info — click goes to profile */}
                        <div
                            className="flex items-start gap-3 mb-3 cursor-pointer"
                            onClick={() => {
                                trackAIRecommendationClick(business.id, business.name);
                                navigate(`/business/${business.id}`);
                            }}
                        >
                            {business.logo_url ? (
                                <img
                                    src={business.logo_url}
                                    alt={business.name}
                                    className="w-14 h-14 rounded-xl object-cover border-2 border-gray-100"
                                />
                            ) : (
                                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                                    {business.name?.charAt(0)}
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                    <h4 className="font-bold text-gray-900 truncate hover:text-blue-600 transition-colors">{business.name}</h4>
                                    {business.is_verified && (
                                        <span title="Negocio Verificado" className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded-full font-bold border border-blue-200">
                                            ✓
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-gray-500 truncate">{business.category}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    {business.rating && (
                                        <span className="flex items-center text-sm text-yellow-600">
                                            <Star className="w-4 h-4 fill-yellow-400 mr-0.5" />
                                            {business.rating.toFixed(1)}
                                        </span>
                                    )}
                                    {business.distance && business.distance < 100 && (
                                        <span className="text-xs text-gray-400">
                                            📍 {business.distance.toFixed(1)} km
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            {business.phone && (
                                <>
                                    <button
                                        onClick={() => openWhatsApp(business.id, business.name, business.phone)}
                                        className="flex-1 flex items-center justify-center gap-1 bg-green-500 hover:bg-green-600 text-white py-2 rounded-lg text-sm font-medium transition"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                    </button>
                                    <button
                                        onClick={() => openPhone(business.id, business.name, business.phone)}
                                        className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition"
                                    >
                                        <Phone className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => openMaps(business.id, business.name, business.latitude, business.longitude)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition"
                            >
                                <MapPin className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Pagination Dots */}
            {Math.ceil(recommendations.length / 2) > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                    {Array.from({ length: Math.ceil(recommendations.length / 2) }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => { setCurrentIndex(i * 2); startAutoRotate(); }}
                            style={{
                                width: Math.floor(currentIndex / 2) === i ? '20px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                background: Math.floor(currentIndex / 2) === i ? '#7c3aed' : '#d1d5db',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                padding: 0,
                            }}
                            aria-label={`Página ${i + 1}`}
                        />
                    ))}
                </div>
            )}
            </div>{/* cierre padding wrapper */}
        </div>
    );
};

export default AIRecommendations;
