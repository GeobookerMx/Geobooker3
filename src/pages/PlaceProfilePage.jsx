// src/pages/PlaceProfilePage.jsx
/**
 * Página de perfil para negocios de Google Places
 * Muestra detalles usando Place Details API con caché
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getPlaceDetails } from '../services/googlePlacesService';
import { openMapsNavigation, openPhoneCall, openWhatsApp, trackViewProfile } from '../services/navigationService';
import { useLocation } from '../contexts/LocationContext';
import {
    MapPin, Phone, Globe, Clock, Star, ArrowLeft,
    Navigation, Share2, ExternalLink, AlertCircle,
    CheckCircle, XCircle, Image as ImageIcon
} from 'lucide-react';
import toast from 'react-hot-toast';
import SEO from '../components/SEO';

// Mapeo de tipos de Places a categorías legibles
const TYPE_LABELS = {
    restaurant: 'Restaurante',
    cafe: 'Cafetería',
    bar: 'Bar',
    bakery: 'Panadería',
    store: 'Tienda',
    supermarket: 'Supermercado',
    pharmacy: 'Farmacia',
    hospital: 'Hospital',
    doctor: 'Doctor',
    dentist: 'Dentista',
    gym: 'Gimnasio',
    beauty_salon: 'Salón de Belleza',
    hair_care: 'Peluquería',
    car_repair: 'Taller Mecánico',
    gas_station: 'Gasolinera',
    bank: 'Banco',
    atm: 'Cajero',
    lodging: 'Hotel',
    school: 'Escuela',
    university: 'Universidad'
};

const PlaceProfilePage = () => {
    const { placeId } = useParams();
    const navigate = useNavigate();
    const { userLocation } = useLocation();
    const [place, setPlace] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedPhoto, setSelectedPhoto] = useState(0);

    useEffect(() => {
        const loadPlace = async () => {
            if (!placeId) {
                setError('ID de lugar no válido');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const details = await getPlaceDetails(placeId);

                if (!details) {
                    setError('No se encontró información del negocio');
                    return;
                }

                setPlace(details);
                trackViewProfile(placeId, details.name, true);
            } catch (err) {
                console.error('Error loading place:', err);
                setError('Error al cargar el negocio');
            } finally {
                setLoading(false);
            }
        };

        loadPlace();
    }, [placeId]);

    const handleShare = async () => {
        const shareData = {
            title: place?.name || 'Negocio en Geobooker',
            text: `Mira ${place?.name} en Geobooker`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Enlace copiado');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleDirections = () => {
        if (place?.latitude && place?.longitude) {
            openMapsNavigation(
                place.latitude,
                place.longitude,
                place.name,
                placeId,
                userLocation
            );
        }
    };

    const handleCall = () => {
        if (place?.phone) {
            openPhoneCall(place.phone, placeId, place.name);
        }
    };

    const getReadableType = (types) => {
        if (!types || types.length === 0) return 'Negocio';
        for (const type of types) {
            if (TYPE_LABELS[type]) return TYPE_LABELS[type];
        }
        return types[0].replace(/_/g, ' ');
    };

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando información...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error || !place) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        {error || 'Negocio no encontrado'}
                    </h1>
                    <p className="text-gray-600 mb-6">
                        No pudimos cargar la información de este negocio.
                    </p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
                    >
                        ← Volver al mapa
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <SEO
                title={`${place.name} | Geobooker`}
                description={`${place.name} - ${place.address}. Encuentra negocios cerca de ti en Geobooker.`}
            />

            {/* Header con foto */}
            <div className="relative h-64 md:h-80 bg-gradient-to-br from-blue-600 to-purple-600">
                {place.photos && place.photos.length > 0 ? (
                    <img
                        src={place.photos[selectedPhoto]}
                        alt={place.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="w-20 h-20 text-white/50" />
                    </div>
                )}

                {/* Overlay gradient */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="absolute top-4 left-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-white transition"
                >
                    <ArrowLeft className="w-6 h-6 text-gray-800" />
                </button>

                {/* Share button */}
                <button
                    onClick={handleShare}
                    className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg hover:bg-white transition"
                >
                    <Share2 className="w-6 h-6 text-gray-800" />
                </button>

                {/* Photo thumbnails */}
                {place.photos && place.photos.length > 1 && (
                    <div className="absolute bottom-4 left-4 flex gap-2">
                        {place.photos.slice(0, 5).map((photo, idx) => (
                            <button
                                key={idx}
                                onClick={() => setSelectedPhoto(idx)}
                                className={`w-12 h-12 rounded-lg overflow-hidden border-2 ${selectedPhoto === idx ? 'border-white' : 'border-transparent'
                                    }`}
                            >
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Contenido */}
            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-10">
                <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                    {/* Header info */}
                    <div className="mb-6">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                    {getReadableType(place.types)}
                                </span>
                                <span className="ml-2 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                                    Google Maps
                                </span>
                            </div>
                            {place.rating && (
                                <div className="flex items-center gap-1 bg-yellow-50 px-3 py-1 rounded-full">
                                    <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                    <span className="font-bold text-yellow-700">{place.rating}</span>
                                    {place.userRatingsTotal && (
                                        <span className="text-xs text-gray-500">
                                            ({place.userRatingsTotal})
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">{place.name}</h1>
                        <p className="text-gray-600 flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            {place.address}
                        </p>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        <button
                            onClick={handleDirections}
                            className="flex flex-col items-center gap-2 bg-green-600 text-white py-4 rounded-xl hover:bg-green-700 transition"
                        >
                            <Navigation className="w-6 h-6" />
                            <span className="font-semibold">Ir</span>
                        </button>

                        {place.phone && (
                            <button
                                onClick={handleCall}
                                className="flex flex-col items-center gap-2 bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition"
                            >
                                <Phone className="w-6 h-6" />
                                <span className="font-semibold">Llamar</span>
                            </button>
                        )}

                        {place.website && (
                            <a
                                href={place.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex flex-col items-center gap-2 bg-purple-600 text-white py-4 rounded-xl hover:bg-purple-700 transition"
                            >
                                <Globe className="w-6 h-6" />
                                <span className="font-semibold">Web</span>
                            </a>
                        )}

                        <button
                            onClick={handleShare}
                            className="flex flex-col items-center gap-2 bg-gray-600 text-white py-4 rounded-xl hover:bg-gray-700 transition"
                        >
                            <Share2 className="w-6 h-6" />
                            <span className="font-semibold">Compartir</span>
                        </button>
                    </div>

                    {/* Horarios */}
                    {place.openingHours && place.openingHours.length > 0 && (
                        <div className="border-t pt-6 mb-6">
                            <h2 className="font-bold text-lg text-gray-900 mb-3 flex items-center gap-2">
                                <Clock className="w-5 h-5" />
                                Horarios
                            </h2>
                            <div className="space-y-2">
                                {place.openingHours.map((day, idx) => (
                                    <div key={idx} className="flex justify-between text-sm">
                                        <span className="text-gray-600">{day}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Status */}
                    {place.isOpen !== null && (
                        <div className={`flex items-center gap-2 text-sm font-medium ${place.isOpen ? 'text-green-600' : 'text-red-600'
                            }`}>
                            {place.isOpen ? (
                                <>
                                    <CheckCircle className="w-4 h-4" />
                                    Abierto ahora
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4" />
                                    Cerrado
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* CTA: Reclamar negocio */}
                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-2xl p-6 mb-6">
                    <h3 className="font-bold text-lg text-gray-900 mb-2">
                        ¿Eres el dueño de este negocio?
                    </h3>
                    <p className="text-gray-600 text-sm mb-4">
                        Reclama tu negocio en Geobooker para actualizar información,
                        responder reseñas y aparecer destacado en las búsquedas.
                    </p>
                    <Link
                        to={`/business/register?claim=${placeId}&name=${encodeURIComponent(place.name)}`}
                        className="inline-flex items-center gap-2 bg-yellow-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-yellow-600 transition"
                    >
                        Reclamar negocio gratis
                        <ExternalLink className="w-4 h-4" />
                    </Link>
                </div>

                {/* Reviews link */}
                <div className="text-center pb-8">
                    <a
                        href={`https://www.google.com/maps/place/?q=place_id:${placeId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                    >
                        Ver reseñas en Google Maps →
                    </a>
                </div>
            </div>
        </div>
    );
};

export default PlaceProfilePage;
