// src/pages/admin/RecommendationsManagement.jsx
// Panel de administración para aprobar/rechazar recomendaciones de usuarios

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    CheckCircle, XCircle, Clock, Star, MapPin,
    Image, User, Calendar, ThumbsUp, ThumbsDown,
    RefreshCw
} from 'lucide-react';

const RecommendationsManagement = () => {
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // pending, approved, rejected, all
    const [processing, setProcessing] = useState(null);

    // Cargar recomendaciones
    const loadRecommendations = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('user_recommendations')
                .select('*')
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setRecommendations(data || []);
        } catch (err) {
            console.error('Error loading recommendations:', err);
            toast.error('Error cargando recomendaciones');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRecommendations();
    }, [filter]);

    // Aprobar recomendación
    const handleApprove = async (id) => {
        setProcessing(id);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const { error } = await supabase
                .from('user_recommendations')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: user?.id
                })
                .eq('id', id);

            if (error) throw error;
            toast.success('✅ Recomendación aprobada');
            loadRecommendations();
        } catch (err) {
            console.error('Error approving recommendation:', err);
            toast.error('Error al aprobar');
        } finally {
            setProcessing(null);
        }
    };

    // Rechazar recomendación
    const handleReject = async (id, reason = '') => {
        setProcessing(id);
        try {
            const { error } = await supabase
                .from('user_recommendations')
                .update({
                    status: 'rejected',
                    rejection_reason: reason || 'No cumple con las políticas de contenido'
                })
                .eq('id', id);

            if (error) throw error;
            toast.success('❌ Recomendación rechazada');
            loadRecommendations();
        } catch (err) {
            console.error('Error rejecting recommendation:', err);
            toast.error('Error al rechazar');
        } finally {
            setProcessing(null);
        }
    };

    // Renderizar estrellas
    const renderStars = (rating) => {
        return Array(5).fill(0).map((_, i) => (
            <Star
                key={i}
                className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
        ));
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        📍 Gestión de Recomendaciones
                    </h1>
                    <p className="text-gray-600">
                        Revisa y aprueba las recomendaciones de negocios hechas por usuarios
                    </p>
                </div>

                {/* Filtros y Stats */}
                <div className="flex flex-wrap gap-4 mb-6">
                    {['pending', 'approved', 'rejected', 'all'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 rounded-lg font-medium transition ${filter === status
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                                }`}
                        >
                            {status === 'pending' && '⏳ Pendientes'}
                            {status === 'approved' && '✅ Aprobadas'}
                            {status === 'rejected' && '❌ Rechazadas'}
                            {status === 'all' && '📋 Todas'}
                        </button>
                    ))}

                    <button
                        onClick={loadRecommendations}
                        className="ml-auto flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Actualizar
                    </button>
                </div>

                {/* Lista de recomendaciones */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                    </div>
                ) : recommendations.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                        <div className="text-6xl mb-4">📭</div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">No hay recomendaciones</h3>
                        <p className="text-gray-600">
                            {filter === 'pending'
                                ? 'No hay recomendaciones pendientes de revisión'
                                : `No hay recomendaciones con estado "${filter}"`}
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {recommendations.map((rec) => (
                            <div
                                key={rec.id}
                                className={`bg-white rounded-xl border shadow-sm overflow-hidden ${rec.status === 'approved' ? 'border-green-200' :
                                    rec.status === 'rejected' ? 'border-red-200' :
                                        'border-gray-200'
                                    }`}
                            >
                                <div className="p-6">
                                    <div className="flex flex-wrap gap-4 justify-between items-start mb-4">
                                        {/* Info del negocio */}
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {rec.name}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">
                                                    {rec.category}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {rec.address || (rec.latitude && rec.longitude ? `${rec.latitude.toFixed(4)}, ${rec.longitude.toFixed(4)}` : 'Sin ubicación')}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Status badge */}
                                        <div className={`px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 ${rec.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            rec.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                            }`}>
                                            {rec.status === 'approved' && <CheckCircle className="w-4 h-4" />}
                                            {rec.status === 'rejected' && <XCircle className="w-4 h-4" />}
                                            {rec.status === 'pending' && <Clock className="w-4 h-4" />}
                                            {rec.status.toUpperCase()}
                                        </div>
                                    </div>

                                    {/* Rating */}
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="font-medium text-gray-700">Calificación:</span>
                                        <div className="flex">{renderStars(rec.rating)}</div>
                                        <span className="text-gray-500">({rec.rating}/5)</span>
                                    </div>

                                    {/* Pros y Cons */}
                                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                                        {rec.pros && (
                                            <div className="bg-green-50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-green-700 font-medium mb-2">
                                                    <ThumbsUp className="w-4 h-4" />
                                                    Lo que le gustó
                                                </div>
                                                <p className="text-gray-700">{rec.pros}</p>
                                            </div>
                                        )}
                                        {rec.cons && (
                                            <div className="bg-red-50 rounded-lg p-4">
                                                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                                    <ThumbsDown className="w-4 h-4" />
                                                    Lo que NO le gustó
                                                </div>
                                                <p className="text-gray-700">{rec.cons}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Foto si existe */}
                                    {rec.photo_url && (
                                        <div className="mb-4">
                                            <img
                                                src={rec.photo_url}
                                                alt={rec.name}
                                                className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200"
                                            />
                                        </div>
                                    )}

                                    {/* Info del usuario */}
                                    <div className="flex items-center gap-4 text-sm text-gray-500 mb-4 pt-4 border-t border-gray-100">
                                        <span className="flex items-center gap-1">
                                            <User className="w-4 h-4" />
                                            {rec.user_id?.slice(0, 8) || 'Anónimo'}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-4 h-4" />
                                            {new Date(rec.created_at).toLocaleDateString('es-MX', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    {/* Botones de acción (solo para pendientes) */}
                                    {rec.status === 'pending' && (
                                        <div className="flex gap-3 pt-4 border-t border-gray-100">
                                            <button
                                                onClick={() => handleApprove(rec.id)}
                                                disabled={processing === rec.id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                                            >
                                                <CheckCircle className="w-5 h-5" />
                                                {processing === rec.id ? 'Procesando...' : 'Aprobar'}
                                            </button>
                                            <button
                                                onClick={() => handleReject(rec.id)}
                                                disabled={processing === rec.id}
                                                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition disabled:opacity-50"
                                            >
                                                <XCircle className="w-5 h-5" />
                                                {processing === rec.id ? 'Procesando...' : 'Rechazar'}
                                            </button>
                                        </div>
                                    )}

                                    {/* Razón de rechazo */}
                                    {rec.status === 'rejected' && rec.rejection_reason && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
                                            <p className="text-red-700 text-sm">
                                                <strong>Razón del rechazo:</strong> {rec.rejection_reason}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecommendationsManagement;
