// Sistema de Reviews y Calificaciones
// src/components/business/ReviewsSection.jsx

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Camera, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ReviewsSection = ({ businessId, ownerId }) => {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWriteReview, setShowWriteReview] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [filterRating, setFilterRating] = useState('all');
    const [sortBy, setSortBy] = useState('recent');

    // Nuevo review state
    const [newReview, setNewReview] = useState({
        rating: 5,
        title: '',
        review_text: '',
        service_rating: 5,
        quality_rating: 5,
        price_rating: 5,
        photos: []
    });

    useEffect(() => {
        loadReviews();
        getCurrentUser();
    }, [businessId, filterRating, sortBy]);

    const getCurrentUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setCurrentUser(user);
    };

    const loadReviews = async () => {
        try {
            let query = supabase
                .from('business_reviews')
                .select(`
                    *,
                    reviewer:reviewer_id (
                        id,
                        full_name
                    )
                `)
                .eq('business_id', businessId)
                .eq('is_approved', true);

            // Filtrar por rating
            if (filterRating !== 'all') {
                query = query.eq('rating', parseInt(filterRating));
            }

            // Ordenar
            if (sortBy === 'recent') {
                query = query.order('created_at', { ascending: false });
            } else if (sortBy === 'helpful') {
                query = query.order('helpful_count', { ascending: false });
            } else if (sortBy === 'rating_high') {
                query = query.order('rating', { ascending: false });
            }

            const { data, error } = await query;

            if (error) throw error;
            setReviews(data || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const submitReview = async () => {
        if (!currentUser) {
            toast.error('Debes iniciar sesión para dejar una reseña');
            return;
        }

        if (!newReview.review_text.trim()) {
            toast.error('Escribe tu reseña');
            return;
        }

        try {
            const { error } = await supabase
                .from('business_reviews')
                .insert({
                    business_id: businessId,
                    reviewer_id: currentUser.id,
                    ...newReview
                });

            if (error) throw error;

            toast.success('¡Reseña publicada!');
            setShowWriteReview(false);
            setNewReview({
                rating: 5,
                title: '',
                review_text: '',
                service_rating: 5,
                quality_rating: 5,
                price_rating: 5,
                photos: []
            });
            loadReviews();
        } catch (error) {
            if (error.code === '23505') { // Unique violation
                toast.error('Ya dejaste una reseña para este negocio');
            } else {
                toast.error('Error al publicar reseña');
            }
        }
    };

    const markAsHelpful = async (reviewId) => {
        if (!currentUser) {
            toast.error('Inicia sesión para votar');
            return;
        }

        try {
            const { error } = await supabase
                .from('review_helpfulness')
                .insert({
                    review_id: reviewId,
                    user_id: currentUser.id,
                    is_helpful: true
                });

            if (error) throw error;

            // Increment helpful_count
            await supabase.rpc('increment_helpful_count', { review_id: reviewId });

            toast.success('Gracias por tu voto');
            loadReviews();
        } catch (error) {
            if (error.code === '23505') {
                toast('Ya votaste en esta reseña');
            }
        }
    };

    const StarRating = ({ rating, size = 'md', onChange }) => {
        const sizes = { sm: 'w-4 h-4', md: 'w-5 h-5', lg: 'w-6 h-6' };

        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${sizes[size]} ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                            } ${onChange ? 'cursor-pointer' : ''}`}
                        onClick={() => onChange && onChange(star)}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return <div className="text-center py-8">Cargando reseñas...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Reseñas de Clientes</h2>
                <button
                    onClick={() => setShowWriteReview(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Escribir Reseña
                </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 items-center">
                <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="all">Todas las calificaciones</option>
                    <option value="5">5 estrellas</option>
                    <option value="4">4 estrellas</option>
                    <option value="3">3 estrellas</option>
                    <option value="2">2 estrellas</option>
                    <option value="1">1 estrella</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border rounded-lg"
                >
                    <option value="recent">Más recientes</option>
                    <option value="helpful">Más útiles</option>
                    <option value="rating_high">Mejor calificadas</option>
                </select>
            </div>

            {/* Lista de Reviews */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <p className="text-gray-500">Sé el primero en dejar una reseña</p>
                    </div>
                ) : (
                    reviews.map((review) => (
                        <div key={review.id} className="bg-white border rounded-xl p-6">
                            {/* Header de review */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                        {review.reviewer?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <div>
                                        <p className="font-medium">{review.reviewer?.full_name || 'Usuario'}</p>
                                        <p className="text-sm text-gray-500">
                                            {new Date(review.created_at).toLocaleDateString('es-MX', {
                                                month: 'long',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                                {review.is_verified && (
                                    <div className="flex items-center gap-1 text-green-600 text-sm">
                                        <CheckCircle className="w-4 h-4" />
                                        Verificada
                                    </div>
                                )}
                            </div>

                            {/* Rating */}
                            <StarRating rating={review.rating} />

                            {/* Título */}
                            {review.title && (
                                <h3 className="font-bold text-lg mt-3">{review.title}</h3>
                            )}

                            {/* Texto */}
                            <p className="text-gray-700 mt-2">{review.review_text}</p>

                            {/* Criterios específicos */}
                            {(review.service_rating || review.quality_rating || review.price_rating) && (
                                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                                    {review.service_rating && (
                                        <div>
                                            <p className="text-sm text-gray-600">Servicio</p>
                                            <StarRating rating={review.service_rating} size="sm" />
                                        </div>
                                    )}
                                    {review.quality_rating && (
                                        <div>
                                            <p className="text-sm text-gray-600">Calidad</p>
                                            <StarRating rating={review.quality_rating} size="sm" />
                                        </div>
                                    )}
                                    {review.price_rating && (
                                        <div>
                                            <p className="text-sm text-gray-600">Precio</p>
                                            <StarRating rating={review.price_rating} size="sm" />
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fotos */}
                            {review.photos && review.photos.length > 0 && (
                                <div className="flex gap-2 mt-4">
                                    {review.photos.slice(0, 4).map((photo, idx) => (
                                        <img
                                            key={idx}
                                            src={photo}
                                            alt={`Foto ${idx + 1}`}
                                            className="w-20 h-20 object-cover rounded-lg cursor-pointer"
                                        />
                                    ))}
                                </div>
                            )}

                            {/* Owner Response */}
                            {review.owner_response && (
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                                    <p className="font-semibold text-sm text-blue-900 mb-1">
                                        Respuesta del negocio
                                    </p>
                                    <p className="text-sm text-blue-800">{review.owner_response}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4 mt-4 pt-4 border-t">
                                <button
                                    onClick={() => markAsHelpful(review.id)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm"
                                >
                                    <ThumbsUp className="w-4 h-4" />
                                    Útil ({review.helpful_count})
                                </button>
                                <button className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-sm">
                                    <Flag className="w-4 h-4" />
                                    Reportar
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Escribir Reseña */}
            {showWriteReview && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-4">Escribe tu Reseña</h3>

                        {/* Rating principal */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Calificación General</label>
                            <StarRating
                                rating={newReview.rating}
                                size="lg"
                                onChange={(rating) => setNewReview({ ...newReview, rating })}
                            />
                        </div>

                        {/* Título */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Título (opcional)</label>
                            <input
                                type="text"
                                value={newReview.title}
                                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                                placeholder="Resumen de tu experiencia"
                                className="w-full p-3 border rounded-lg"
                                maxLength={100}
                            />
                        </div>

                        {/* Reseña */}
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Tu Reseña *</label>
                            <textarea
                                value={newReview.review_text}
                                onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                                placeholder="Cuéntanos sobre tu experiencia..."
                                className="w-full p-3 border rounded-lg"
                                rows={5}
                                maxLength={1000}
                            />
                            <p className="text-sm text-gray-500 mt-1">
                                {newReview.review_text.length}/1000 caracteres
                            </p>
                        </div>

                        {/* Criterios específicos */}
                        <div className="grid grid-cols-3 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">Servicio</label>
                                <StarRating
                                    rating={newReview.service_rating}
                                    onChange={(rating) => setNewReview({ ...newReview, service_rating: rating })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Calidad</label>
                                <StarRating
                                    rating={newReview.quality_rating}
                                    onChange={(rating) => setNewReview({ ...newReview, quality_rating: rating })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2">Precio</label>
                                <StarRating
                                    rating={newReview.price_rating}
                                    onChange={(rating) => setNewReview({ ...newReview, price_rating: rating })}
                                />
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowWriteReview(false)}
                                className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={submitReview}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Publicar Reseña
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;
