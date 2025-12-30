// src/pages/admin/ReportsModeration.jsx
/**
 * P1.2b: Panel de Moderación de Reportes
 * Permite a admins revisar y resolver reportes de información incorrecta
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    AlertTriangle, CheckCircle, XCircle, Clock, Search,
    Filter, RefreshCw, Eye, MapPin, Phone, Calendar,
    MessageSquare, ChevronDown, ExternalLink
} from 'lucide-react';

// Razones de reporte traducidas
const REASON_LABELS = {
    closed: '🚪 Cerrado permanentemente',
    wrong_phone: '📞 Teléfono incorrecto',
    wrong_address: '📍 Dirección incorrecta',
    wrong_hours: '🕒 Horarios incorrectos',
    wrong_name: '🏷️ Nombre incorrecto',
    spam: '⚠️ Spam / Fraude',
    other: '❓ Otro problema'
};

// Estados de reportes
const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'yellow', icon: Clock },
    reviewed: { label: 'En revisión', color: 'blue', icon: Eye },
    fixed: { label: 'Resuelto', color: 'green', icon: CheckCircle },
    rejected: { label: 'Rechazado', color: 'red', icon: XCircle }
};

export default function ReportsModeration() {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedReport, setSelectedReport] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        fetchReports();
    }, [filter]);

    const fetchReports = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('business_reports')
                .select(`
          *,
          businesses (id, name, category, address, phone)
        `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            const { data, error } = await query;
            if (error) throw error;
            setReports(data || []);
        } catch (error) {
            console.error('Error fetching reports:', error);
            toast.error('Error cargando reportes');
        } finally {
            setLoading(false);
        }
    };

    const updateReportStatus = async (reportId, newStatus) => {
        setProcessing(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            const updates = {
                status: newStatus,
                resolved_by: user?.id,
                resolved_at: new Date().toISOString(),
                resolution_notes: resolutionNotes || null
            };

            const { error } = await supabase
                .from('business_reports')
                .update(updates)
                .eq('id', reportId);

            if (error) throw error;

            toast.success(`Reporte marcado como ${STATUS_CONFIG[newStatus].label}`);
            setSelectedReport(null);
            setResolutionNotes('');
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                        Moderación de Reportes
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Revisa y resuelve reportes de información incorrecta
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
            <div className="grid grid-cols-4 gap-4">
                {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const count = reports.filter(r => filter === 'all' ? r.status === status : true).length;
                    const Icon = config.icon;
                    return (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`p-4 rounded-xl border-2 transition-all ${filter === status
                                    ? `border-${config.color}-500 bg-${config.color}-50`
                                    : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className={`w-5 h-5 text-${config.color}-600`} />
                                <span className="font-medium">{config.label}</span>
                            </div>
                            <div className="text-2xl font-bold mt-2">
                                {filter === status ? reports.length : '--'}
                            </div>
                        </button>
                    );
                })}
            </div>

            {/* Reports List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-bold text-lg text-gray-800 dark:text-white">
                        {filter === 'all' ? 'Todos los reportes' : `Reportes ${STATUS_CONFIG[filter]?.label}`} ({reports.length})
                    </h2>
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
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {reports.map((report) => {
                            const StatusIcon = STATUS_CONFIG[report.status]?.icon || Clock;
                            return (
                                <div
                                    key={report.id}
                                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer"
                                    onClick={() => setSelectedReport(report)}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <StatusIcon className={`w-4 h-4 text-${STATUS_CONFIG[report.status]?.color}-600`} />
                                                <span className="font-semibold text-gray-800 dark:text-white">
                                                    {report.businesses?.name || 'Negocio eliminado'}
                                                </span>
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium bg-${STATUS_CONFIG[report.status]?.color}-100 text-${STATUS_CONFIG[report.status]?.color}-700`}>
                                                    {STATUS_CONFIG[report.status]?.label}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {REASON_LABELS[report.reason] || report.reason}
                                            </div>
                                            {report.details && (
                                                <div className="text-sm text-gray-500 mt-1 truncate">
                                                    "{report.details}"
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 whitespace-nowrap">
                                            {getTimeAgo(report.created_at)}
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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                                Detalle del Reporte
                            </h3>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Business Info */}
                        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                            <h4 className="font-semibold text-gray-800 dark:text-white mb-2">
                                📍 Negocio Reportado
                            </h4>
                            <p className="font-medium">{selectedReport.businesses?.name}</p>
                            <p className="text-sm text-gray-600">{selectedReport.businesses?.category}</p>
                            <p className="text-sm text-gray-600">{selectedReport.businesses?.address}</p>
                            {selectedReport.businesses?.phone && (
                                <p className="text-sm text-gray-600">📞 {selectedReport.businesses?.phone}</p>
                            )}
                        </div>

                        {/* Report Details */}
                        <div className="space-y-3 mb-6">
                            <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Motivo:</span>
                                <span className="ml-2">{REASON_LABELS[selectedReport.reason]}</span>
                            </div>
                            {selectedReport.details && (
                                <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">Detalles:</span>
                                    <p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-700">
                                        {selectedReport.details}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">Reportado:</span>
                                <span className="ml-2">{new Date(selectedReport.created_at).toLocaleString('es-MX')}</span>
                            </div>
                        </div>

                        {/* Resolution Notes */}
                        <div className="mb-6">
                            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Notas de resolución:
                            </label>
                            <textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder="Describe qué acción tomaste..."
                                rows={3}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => updateReportStatus(selectedReport.id, 'fixed')}
                                disabled={processing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                                <CheckCircle className="w-4 h-4" />
                                Marcar Resuelto
                            </button>
                            <button
                                onClick={() => updateReportStatus(selectedReport.id, 'rejected')}
                                disabled={processing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                Rechazar
                            </button>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
