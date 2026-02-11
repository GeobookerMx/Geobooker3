// Sistema de Reviews y Calificaciones
// src/components/business/ReviewsSection.jsx

import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, Flag, Camera, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { reportService } from '../../services/reportService';
import toast from 'react-hot-toast';

const ReviewsSection = ({ businessId, ownerId }) => {
    const { t } = useTranslation();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showWriteReview, setShowWriteReview] = useState(false);
    const [currentUser, setCurrentUser] = useState(null);
    const [filterRating, setFilterRating] = useState('all');
    const [sortBy, setSortBy] = useState('recent');

    // UI states for reporting
    const [reportingItem, setReportingItem] = useState(null); // {id, type}
    const [reportReason, setReportReason] = useState('spam');
    const [reportDetails, setReportDetails] = useState('');
    const [isReporting, setIsReporting] = useState(false);

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
            toast.error(t('deleteAccount.mustLogin'));
            return;
        }

        if (!newReview.review_text.trim()) {
            toast.error(t('reviews.reviewPlaceholder'));
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

            toast.success(t('reviews.success'));
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
                toast.error(t('reviews.alreadyReviewed', { defaultValue: 'Ya dejaste una reseña para este negocio' }));
            } else {
                toast.error(t('reviews.error', { defaultValue: 'Error al publicar reseña' }));
            }
        }
    };

    const markAsHelpful = async (reviewId) => {
        if (!currentUser) {
            toast.error(t('deleteAccount.mustLogin'));
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

            toast.success(t('reviews.helpfulSuccess'));
            loadReviews();
        } catch (error) {
            if (error.code === '23505') {
                toast(t('reviews.alreadyHelpful'));
            }
        }
    };

    const handleReport = async () => {
        if (!currentUser) {
            toast.error(t('deleteAccount.mustLogin'));
            return;
        }

        setIsReporting(true);
        try {
            const { success, error } = await reportService.reportContent({
                content_type: reportingItem.type,
                content_id: reportingItem.id,
                reason: reportReason,
                details: reportDetails
            });

            if (success) {
                toast.success(t('report.success'));
                setReportingItem(null);
                setReportDetails('');
            } else {
                throw error;
            }
        } catch (error) {
            toast.error(t('report.error'));
        } finally {
            setIsReporting(false);
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
        return <div className="text-center py-8">{t('common.loadingReviews', { defaultValue: 'Cargando reseñas...' })}</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{t('reviews.title')}</h2>
                <button
                    onClick={() => setShowWriteReview(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    {t('reviews.writeReview')}
                </button>
            </div>

            {/* Filtros */}
            <div className="flex gap-4 items-center">
                <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="all">{t('common.allRatings', { defaultValue: 'Todas las calificaciones' })}</option>
                    <option value="5">5 {t('common.stars', { defaultValue: 'estrellas' })}</option>
                    <option value="4">4 {t('common.stars', { defaultValue: 'estrellas' })}</option>
                    <option value="3">3 {t('common.stars', { defaultValue: 'estrellas' })}</option>
                    <option value="2">2 {t('common.stars', { defaultValue: 'estrellas' })}</option>
                    <option value="1">1 {t('common.star', { defaultValue: 'estrella' })}</option>
                </select>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                >
                    <option value="recent">{t('common.mostRecent', { defaultValue: 'Más recientes' })}</option>
                    <option value="helpful">{t('common.mostHelpful', { defaultValue: 'Más útiles' })}</option>
                    <option value="rating_high">{t('common.bestRated', { defaultValue: 'Mejor calificadas' })}</option>
                </select>
            </div>

            {/* Lista de Reviews */}
            <div className="space-y-6">
                {reviews.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <p className="text-gray-500 font-medium">{t('reviews.noReviews')}</p>
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
                                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                        <CheckCircle className="w-4 h-4" />
                                        {t('common.verified', { defaultValue: 'Verificada' })}
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
                                            <p className="text-sm text-gray-600 font-medium">{t('reviews.service')}</p>
                                            <StarRating rating={review.service_rating} size="sm" />
                                        </div>
                                    )}
                                    {review.quality_rating && (
                                        <div>
                                            <p className="text-sm text-gray-600 font-medium">{t('reviews.quality')}</p>
                                            <StarRating rating={review.quality_rating} size="sm" />
                                        </div>
                                    )}
                                    {review.price_rating && (
                                        <div>
                                            <p className="text-sm text-gray-600 font-medium">{t('reviews.price')}</p>
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
                                <div className="mt-4 p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500 shadow-sm">
                                    <p className="font-semibold text-sm text-blue-900 mb-1">
                                        {t('reviews.ownerResponse')}
                                    </p>
                                    <p className="text-sm text-blue-800">{review.owner_response}</p>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-4 mt-4 pt-4 border-t">
                                <button
                                    onClick={() => markAsHelpful(review.id)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm transition-colors group"
                                >
                                    <ThumbsUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {t('reviews.helpful')} ({review.helpful_count})
                                </button>
                                <button
                                    onClick={() => setReportingItem({ id: review.id, type: 'review' })}
                                    className="flex items-center gap-2 text-gray-400 hover:text-red-600 text-sm transition-colors group"
                                >
                                    <Flag className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                    {t('reviews.report')}
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Modal Escribir Reseña */}
            {showWriteReview && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-2xl overflow-y-auto max-h-[95vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">{t('reviews.writeReview')}</h3>
                            <button onClick={() => setShowWriteReview(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Rating principal */}
                        <div className="mb-6 bg-gray-50 p-4 rounded-xl">
                            <label className="block text-sm font-semibold text-gray-700 mb-3">{t('reviews.rating')}</label>
                            <StarRating
                                rating={newReview.rating}
                                size="lg"
                                onChange={(rating) => setNewReview({ ...newReview, rating })}
                            />
                        </div>

                        {/* Título */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                {t('common.title', { defaultValue: 'Título' })} ({t('reviews.optional')})
                            </label>
                            <input
                                type="text"
                                value={newReview.title}
                                onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                                placeholder={t('common.titlePlaceholder', { defaultValue: 'Resumen de tu experiencia' })}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                maxLength={100}
                            />
                        </div>

                        {/* Reseña */}
                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">{t('reviews.reviewText')} *</label>
                            <textarea
                                value={newReview.review_text}
                                onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                                placeholder={t('reviews.reviewPlaceholder')}
                                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px]"
                                rows={4}
                                maxLength={1000}
                            />
                            <div className="flex justify-end mt-1">
                                <span className={`text-xs ${newReview.review_text.length > 900 ? 'text-red-500' : 'text-gray-400'}`}>
                                    {newReview.review_text.length}/1000
                                </span>
                            </div>
                        </div>

                        {/* Criterios específicos */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="bg-gray-50 p-3 rounded-xl text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('reviews.service')}</label>
                                <div className="flex justify-center">
                                    <StarRating
                                        rating={newReview.service_rating}
                                        onChange={(rating) => setNewReview({ ...newReview, service_rating: rating })}
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('reviews.quality')}</label>
                                <div className="flex justify-center">
                                    <StarRating
                                        rating={newReview.quality_rating}
                                        onChange={(rating) => setNewReview({ ...newReview, quality_rating: rating })}
                                    />
                                </div>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-xl text-center">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">{t('reviews.price')}</label>
                                <div className="flex justify-center">
                                    <StarRating
                                        rating={newReview.price_rating}
                                        onChange={(rating) => setNewReview({ ...newReview, price_rating: rating })}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => setShowWriteReview(false)}
                                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                {t('reviews.cancel')}
                            </button>
                            <button
                                onClick={submitReview}
                                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
                            >
                                {t('reviews.submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Reportar */}
            {reportingItem && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-md w-full p-8 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 border-l-4 border-red-500 pl-3">{t('report.title')}</h3>
                            <button onClick={() => setReportingItem(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('report.reason')}</label>
                                <select
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none"
                                    value={reportReason}
                                    onChange={(e) => setReportReason(e.target.value)}
                                >
                                    <option value="spam">{t('report.reasons.spam')}</option>
                                    <option value="offensive">{t('report.reasons.offensive')}</option>
                                    <option value="inappropriate">{t('report.reasons.inappropriate')}</option>
                                    <option value="misleading">{t('report.reasons.misleading')}</option>
                                    <option value="other">{t('report.reasons.other')}</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">{t('report.details')}</label>
                                <textarea
                                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
                                    placeholder={t('report.placeholder')}
                                    value={reportDetails}
                                    onChange={(e) => setReportDetails(e.target.value)}
                                    maxLength={500}
                                />
                            </div>

                            <div className="flex gap-4 pt-2">
                                <button
                                    onClick={() => setReportingItem(null)}
                                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50"
                                    disabled={isReporting}
                                >
                                    {t('report.cancel')}
                                </button>
                                <button
                                    onClick={handleReport}
                                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 disabled:opacity-50"
                                    disabled={isReporting || !reportDetails.trim()}
                                >
                                    {isReporting ? t('deleteAccount.processing') : t('report.submit')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReviewsSection;
