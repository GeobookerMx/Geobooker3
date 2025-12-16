// src/pages/BusinessProfilePage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link, Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    MapPin, Phone, Globe, Clock, Star,
    Navigation, Share2, Heart, ArrowLeft,
    Instagram, Facebook, MessageCircle,
    Wifi, PawPrint, CreditCard, Car, Baby,
    Shield, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

// Mapeo de tags a iconos y nombres
const TAG_CONFIG = {
    wifi: { icon: Wifi, label: 'WiFi Gratis', color: 'text-blue-600' },
    pet_friendly: { icon: PawPrint, label: 'Pet Friendly', color: 'text-green-600' },
    accepts_cards: { icon: CreditCard, label: 'Acepta Tarjetas', color: 'text-purple-600' },
    parking: { icon: Car, label: 'Estacionamiento', color: 'text-gray-600' },
    kids_friendly: { icon: Baby, label: 'Apto para Niños', color: 'text-pink-600' },
    verified: { icon: Shield, label: 'Verificado', color: 'text-yellow-600' }
};

const BusinessProfilePage = () => {
    const { id } = useParams();
    const [business, setBusiness] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFavorite, setIsFavorite] = useState(false);

    // Si no hay ID, redirigir al inicio
    if (!id) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        const loadBusiness = async () => {
            try {
                const { data, error } = await supabase
                    .from('businesses')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                setBusiness(data);
            } catch (error) {
                console.error('Error loading business:', error);
                toast.error('No se pudo cargar el negocio');
            } finally {
                setLoading(false);
            }
        };

        if (id) loadBusiness();
    }, [id]);

    const handleShare = async () => {
        const shareData = {
            title: business?.name,
            text: `Mira ${business?.name} en Geobooker`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Enlace copiado al portapapeles');
            }
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const handleDirections = () => {
        if (business?.latitude && business?.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${business.latitude},${business.longitude}`;
            window.open(url, '_blank');
        }
    };

    const handleCall = () => {
        if (business?.phone) {
            window.location.href = `tel:${business.phone}`;
        }
    };

    const toggleFavorite = () => {
        setIsFavorite(!isFavorite);
        toast.success(isFavorite ? 'Eliminado de favoritos' : 'Agregado a favoritos');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!business) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">Negocio no encontrado</h1>
                <Link to="/" className="text-blue-600 hover:underline">
                    ← Volver al inicio
                </Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* SEO Meta Tags */}
            <SEO
                title={`${business.name} - ${business.category}`}
                description={business.description || `${business.name} en ${business.address || 'Geobooker'}`}
                image={business.image_url || '/images/geobooker-og.png'}
                type="business.business"
                business={business}
            />

            {/* Header con imagen */}
            <div className="relative h-64 md:h-80 bg-gradient-to-r from-blue-600 to-indigo-700">
                {business.image_url ? (
                    <img
                        src={business.image_url}
                        alt={business.name}
                        className="w-full h-full object-cover opacity-90"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="text-8xl">🏪</span>
                    </div>
                )}

                {/* Overlay con botones */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Botón Atrás */}
                <Link
                    to="/"
                    className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-800" />
                </Link>

                {/* Botones de acciones */}
                <div className="absolute top-4 right-4 flex gap-2">
                    <button
                        onClick={toggleFavorite}
                        className={`p-2 rounded-full shadow-lg transition ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-800'
                            }`}
                    >
                        <Heart className="w-6 h-6" fill={isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                        onClick={handleShare}
                        className="bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg hover:bg-white transition"
                    >
                        <Share2 className="w-6 h-6 text-gray-800" />
                    </button>
                </div>

                {/* Badge Premium */}
                {business.is_premium && (
                    <div className="absolute bottom-4 right-4 bg-gradient-to-r from-yellow-400 to-amber-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        VERIFICADO
                    </div>
                )}
            </div>

            {/* Contenido principal */}
            <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-10">
                {/* Card principal */}
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    {/* Nombre y categoría */}
                    <div className="mb-4">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                            {business.name}
                        </h1>
                        <div className="flex items-center gap-2 text-gray-600">
                            <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                                {business.category}
                            </span>
                            {business.subcategory && (
                                <span className="text-gray-400">•</span>
                            )}
                            {business.subcategory && (
                                <span className="text-gray-500 text-sm">{business.subcategory}</span>
                            )}
                        </div>
                    </div>

                    {/* Rating */}
                    {business.rating > 0 && (
                        <div className="flex items-center gap-2 mb-4">
                            <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-lg">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <span className="ml-1 font-bold text-gray-800">{business.rating.toFixed(1)}</span>
                            </div>
                            <span className="text-gray-500 text-sm">
                                ({business.review_count || 0} reseñas)
                            </span>
                        </div>
                    )}

                    {/* Descripción */}
                    {business.description && (
                        <p className="text-gray-600 mb-6 leading-relaxed">
                            {business.description}
                        </p>
                    )}

                    {/* Tags / Características */}
                    {business.tags && business.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            {business.tags.map((tag, index) => {
                                const config = TAG_CONFIG[tag] || { icon: CheckCircle, label: tag, color: 'text-gray-600' };
                                const Icon = config.icon;
                                return (
                                    <div
                                        key={index}
                                        className="flex items-center gap-1 bg-gray-100 px-3 py-1.5 rounded-lg text-sm"
                                    >
                                        <Icon className={`w-4 h-4 ${config.color}`} />
                                        <span className="text-gray-700">{config.label}</span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Botones de acción principales */}
                    <div className="grid grid-cols-3 gap-3 mb-6">
                        <button
                            onClick={handleDirections}
                            className="flex flex-col items-center justify-center gap-1 bg-blue-600 text-white py-3 px-2 rounded-xl font-semibold hover:bg-blue-700 transition"
                        >
                            <Navigation className="w-5 h-5" />
                            <span className="text-xs">Cómo llegar</span>
                        </button>

                        {/* Botón Llamar */}
                        {business.phone && (
                            <button
                                onClick={handleCall}
                                className="flex flex-col items-center justify-center gap-1 bg-green-600 text-white py-3 px-2 rounded-xl font-semibold hover:bg-green-700 transition"
                            >
                                <Phone className="w-5 h-5" />
                                <span className="text-xs">Llamar</span>
                            </button>
                        )}

                        {/* Botón WhatsApp - Usa whatsapp específico o el teléfono del negocio */}
                        {(business.whatsapp || business.phone) && (
                            <a
                                href={`https://wa.me/${(business.whatsapp || business.phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola! Vi tu negocio ${business.name} en Geobooker y me gustaría más información.`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center justify-center gap-1 bg-[#25D366] text-white py-3 px-2 rounded-xl font-semibold hover:bg-[#128C7E] transition"
                            >
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-xs">WhatsApp</span>
                            </a>
                        )}
                    </div>

                    {/* Información de contacto */}
                    <div className="space-y-3 border-t pt-6">
                        {/* Dirección */}
                        {business.address && (
                            <div className="flex items-start gap-3">
                                <MapPin className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{business.address}</span>
                            </div>
                        )}

                        {/* Teléfono */}
                        {business.phone && (
                            <div className="flex items-center gap-3">
                                <Phone className="w-5 h-5 text-gray-400" />
                                <a href={`tel:${business.phone}`} className="text-blue-600 hover:underline">
                                    {business.phone}
                                </a>
                            </div>
                        )}

                        {/* Sitio web */}
                        {business.website && (
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-gray-400" />
                                <a
                                    href={business.website.startsWith('http') ? business.website : `https://${business.website}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline truncate"
                                >
                                    {business.website}
                                </a>
                            </div>
                        )}

                        {/* Horarios */}
                        {business.hours && (
                            <div className="flex items-start gap-3">
                                <Clock className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                                <span className="text-gray-700">{business.hours}</span>
                            </div>
                        )}
                    </div>

                    {/* Redes sociales (Solo Premium) */}
                    {business.is_premium && (
                        <div className="border-t mt-6 pt-6">
                            <h3 className="font-semibold text-gray-800 mb-3">Síguenos</h3>
                            <div className="flex gap-3">
                                {business.instagram && (
                                    <a
                                        href={`https://instagram.com/${business.instagram}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition"
                                    >
                                        <Instagram className="w-5 h-5" />
                                    </a>
                                )}
                                {business.facebook && (
                                    <a
                                        href={business.facebook.startsWith('http') ? business.facebook : `https://facebook.com/${business.facebook}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:scale-110 transition"
                                    >
                                        <Facebook className="w-5 h-5" />
                                    </a>
                                )}
                                {business.whatsapp && (
                                    <a
                                        href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white hover:scale-110 transition"
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </a>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Mapa */}
                {business.latitude && business.longitude && (
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                        <div className="p-4 border-b">
                            <h3 className="font-semibold text-gray-800">Ubicación</h3>
                        </div>
                        <div className="h-64 bg-gray-200">
                            <iframe
                                title="Ubicación del negocio"
                                width="100%"
                                height="100%"
                                frameBorder="0"
                                style={{ border: 0 }}
                                src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}&q=${business.latitude},${business.longitude}&zoom=16`}
                                allowFullScreen
                            />
                        </div>
                    </div>
                )}

                {/* CTA Premium */}
                {!business.is_premium && (
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-center text-white mb-6">
                        <h3 className="text-xl font-bold mb-2">¿Este es tu negocio?</h3>
                        <p className="text-purple-100 mb-4">
                            Obtén el Badge de Verificado y más visibilidad
                        </p>
                        <Link
                            to="/dashboard/upgrade"
                            className="inline-block bg-white text-purple-600 px-6 py-2 rounded-lg font-semibold hover:bg-purple-50 transition"
                        >
                            Actualizar a Premium
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessProfilePage;
