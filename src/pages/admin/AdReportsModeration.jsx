// src/pages/admin/AdReportsModeration.jsx
/**
 * Panel de Moderación de Reportes de Anuncios
 * Permite a admins revisar y actuar sobre reportes de anuncios inapropiados
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Flag, CheckCircle, XCircle, Clock, Search,
    RefreshCw, Eye, AlertTriangle, Pause, Ban,
    Mail, ExternalLink, ChevronRight
} from 'lucide-react';

// Razones de reporte traducidas
const REASON_LABELS = {
    inappropriate_content: '🚫 Contenido inapropiado',
    misleading: '⚠️ Publicidad engañosa',
    offensive: '😤 Contenido ofensivo',
    spam: '📧 Spam / Repetitivo',
    illegal_product: '🚨 Producto ilegal',
    wrong_targeting: '📍 Ubicación incorrecta',
    competitor_attack: '🎯 Ataque de competidor',
    other: '❓ Otro problema'
};

// Estados de reportes
const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'yellow', icon: Clock },
    reviewed: { label: 'En revisión', color: 'blue', icon: Eye },
    resolved: { label: 'Resuelto', color: 'green', icon: CheckCircle },
    rejected: { label: 'Rechazado', color: 'gray', icon: XCircle }
};

// Acciones disponibles
const ACTION_OPTIONS = [
    { value: 'no_action', label: 'Sin acción', desc: 'Reporte inválido o infundado', icon: XCircle },
    { value: 'warning_sent', label: 'Advertencia enviada', desc: 'Se notificó al anunciante', icon: Mail },
    { value: 'ad_paused', label: 'Anuncio pausado', desc: 'La campaña fue pausada temporalmente', icon: Pause },
    { value: 'ad_rejected', label: 'Anuncio rechazado', desc: 'La campaña fue cancelada', icon: Ban },
    { value: 'advertiser_banned', label: 'Anunciante baneado', desc: 'Se prohibió al anunciante', icon: Ban },
];

export default function AdReportsModeration() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedReport, setSelectedReport] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [actionTaken, setActionTaken] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('ad_reports')
                .select(`
                    *,
                    ad_campaigns (
                        id, 
                        advertiser_name, 
                        advertiser_email, 
                        headline,
                        description,
                        creative_url,
                        status,
                        ad_spaces (name, display_name)
                    )
                `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching ad reports:', error);
            toast.error('Error cargando reportes de anuncios');
        } finally {
            setLoading(false);
        }
    };

    const updateReportStatus = async (reportId, newStatus) => {
        if (newStatus === 'resolved' && !actionTaken) {
            toast.error('Selecciona qué acción tomaste');
            return;
        }

        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const updates = {
                status: newStatus,
                resolved_by: user?.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes || null,
                action_taken: newStatus === 'resolved' ? actionTaken : null
            };

            const { error } = await supabase
                .from('ad_reports')
                .update(updates)
                .eq('id', reportId);

            if (error) throw error;

            // Si la acción fue pausar o rechazar, actualizar la campaña
            if (actionTaken === 'ad_paused' || actionTaken === 'ad_rejected') {
                const campaign = selectedReport?.ad_campaigns;
                if (campaign) {
                    await supabase
                        .from('ad_campaigns')
                        .update({
                            status: actionTaken === 'ad_paused' ? 'paused' : 'rejected'
                        })
                        .eq('id', campaign.id);
                    toast.success(`Campaña ${actionTaken === 'ad_paused' ? 'pausada' : 'rechazada'}`);
                }
            }

            toast.success(`Reporte marcado como ${STATUS_CONFIG[newStatus].label}`);
            setSelectedReport(null);
            setResolutionNotes('');
            setActionTaken('');
            fetchReports();
        } catch (error) {
            console.error('Error updating report:', error);
            toast.error('Error actualizando reporte');
        } finally {
            setProcessing(false);
        }
    };

    const getTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) return 'Hace minutos';
        if (diffHours < 24) return `Hace ${diffHours}h`;
        if (diffDays === 1) return 'Ayer';
        return `Hace ${diffDays} días`;
    };

    const getPriorityBadge = (priority) => {
        const config = {
            low: 'bg-gray-100 text-gray-600',
            normal: 'bg-blue-100 text-blue-700',
            high: 'bg-orange-100 text-orange-700',
            urgent: 'bg-red-100 text-red-700 animate-pulse'
        };
        return config[priority] || config.normal;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Flag className="w-8 h-8 text-red-500" />
                        Reportes de Anuncios
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Revisa y modera reportes de anuncios inapropiados
                    </p>
                </div>
                <button
                    onClick={fetchReports}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = reports.filter(r => filter === 'all' ? r.status === status : true).length;
                    const Icon = config.icon;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`p-4 rounded-xl border-2 transition-all text-left ${filter === status
                                ? `border-${config.color}-500 bg-${config.color}-50`
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-2">
                                <Icon className={`w-5 h-5 text-${config.color}-600`} />
                                <span className="font-medium text-gray-700">{config.label}</span>
                            </div>
                            <div className="text-2xl font-bold text-gray-900">
                                {filter === status ? reports.length : '--'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Reports List */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <h2 className="font-bold text-lg text-gray-800">
                        {filter === 'all' ? 'Todos los reportes' : `Reportes ${STATUS_CONFIG[filter]?.label}`}
                        <span className="text-gray-400 ml-2">({reports.length})</span>
                    </h2>
                    <button
                        onClick={() => setFilter('all')}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        Ver todos
                    </button>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
                        Cargando reportes...
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <p className="font-medium">¡No hay reportes pendientes!</p>
                        <p className="text-sm mt-1">Los anuncios están en orden 👍</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {reports.map((report) => {
                            const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
                            const campaign = report.ad_campaigns;
                            return (
                                <div
                                    key={report.id}
                                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityBadge(report.priority)}`}>
                                                    {report.priority?.toUpperCase()}
                                                </span>
                                                <span className="font-semibold text-gray-800">
                                                    {campaign?.advertiser_name || 'Anunciante desconocido'}
                                                </span>
                                                <span className="text-gray-400">•</span>
                                                <span className="text-sm text-gray-500">
                                                    {campaign?.ad_spaces?.display_name || 'Espacio no especificado'}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 font-medium">
                                                {REASON_LABELS[report.reason] || report.reason}
                                            </div>
                                            {report.details && (
                                                <div className="text-sm text-gray-500 mt-1 truncate max-w-xl">
                                                    "{report.details}"
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-gray-500">
                                                {getTimeAgo(report.created_at)}
                                            </span>
                                            <ChevronRight className="w-4 h-4 text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedReport && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white p-6 rounded-t-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-xl font-bold">Detalle del Reporte</h3>
                                    <p className="text-red-100 text-sm mt-1">
                                        {REASON_LABELS[selectedReport.reason]}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="text-white/80 hover:text-white text-2xl"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Campaign Info */}
                            <div className="bg-blue-50 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                    📢 Anuncio Reportado
                                </h4>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="font-bold text-gray-900">
                                            {selectedReport.ad_campaigns?.advertiser_name}
                                        </p>
                                        <p className="text-sm text-gray-600">
                                            {selectedReport.ad_campaigns?.advertiser_email}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Espacio: {selectedReport.ad_campaigns?.ad_spaces?.display_name}
                                        </p>
                                    </div>
                                    {selectedReport.ad_campaigns?.creative_url && (
                                        <div>
                                            <img
                                                src={selectedReport.ad_campaigns.creative_url}
                                                alt="Creative"
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        </div>
                                    )}
                                </div>
                                {selectedReport.ad_campaigns?.headline && (
                                    <div className="mt-3 p-3 bg-white rounded-lg">
                                        <p className="font-medium">{selectedReport.ad_campaigns.headline}</p>
                                        <p className="text-sm text-gray-600">{selectedReport.ad_campaigns.description}</p>
                                    </div>
                                )}
                            </div>

                            {/* Report Details */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityBadge(selectedReport.priority)}`}>
                                        Prioridad: {selectedReport.priority?.toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        Reportado el {new Date(selectedReport.created_at).toLocaleString('es-MX')}
                                    </span>
                                </div>
                                {selectedReport.details && (
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <span className="font-semibold text-gray-700">Detalles del reporte:</span>
                                        <p className="mt-1 text-gray-700">{selectedReport.details}</p>
                                    </div>
                                )}
                                {selectedReport.reporter_email && (
                                    <div className="text-sm text-gray-500">
                                        Reporter: {selectedReport.reporter_email}
                                    </div>
                                )}
                            </div>

                            {/* Action Selection (only for pending) */}
                            {selectedReport.status === 'pending' && (
                                <>
                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-3">
                                            ¿Qué acción tomarás?
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                            {ACTION_OPTIONS.map((action) => (
                                                <button
                                                    key={action.value}
                                                    onClick={() => setActionTaken(action.value)}
                                                    className={`p-3 rounded-lg border-2 text-left transition-all ${actionTaken === action.value
                                                            ? 'border-red-500 bg-red-50'
                                                            : 'border-gray-200 hover:border-gray-300'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <action.icon className="w-4 h-4 text-gray-600" />
                                                        <span className="font-medium text-sm">{action.label}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-500 mt-1">{action.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block font-semibold text-gray-700 mb-2">
                                            Notas de resolución:
                                        </label>
                                        <textarea
                                            value={resolutionNotes}
                                            onChange={(e) => setResolutionNotes(e.target.value)}
                                            placeholder="Describe qué acción tomaste..."
                                            rows={3}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                        />
                                    </div>
                                </>
                            )}

                            {/* Previous Resolution */}
                            {selectedReport.status !== 'pending' && selectedReport.resolution_notes && (
                                <div className="bg-green-50 rounded-lg p-4">
                                    <span className="font-semibold text-green-800">Resolución:</span>
                                    <p className="mt-1 text-green-700">{selectedReport.resolution_notes}</p>
                                    {selectedReport.action_taken && (
                                        <p className="text-sm text-green-600 mt-2">
                                            Acción: {ACTION_OPTIONS.find(a => a.value === selectedReport.action_taken)?.label}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t">
                                {selectedReport.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => updateReportStatus(selectedReport.id, 'resolved')}
                                            disabled={processing || !actionTaken}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                                        >
                                            <CheckCircle className="w-5 h-5" />
                                            Resolver Reporte
                                        </button>
                                        <button
                                            onClick={() => updateReportStatus(selectedReport.id, 'rejected')}
                                            disabled={processing}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 font-semibold"
                                        >
                                            <XCircle className="w-5 h-5" />
                                            Rechazar (Inválido)
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => setSelectedReport(null)}
                                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                                >
                                    Cerrar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
