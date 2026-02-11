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
import { useTranslation } from 'react-i18next';

export default function ReportsModeration() {
    const { t } = useTranslation();
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending');
    const [selectedReport, setSelectedReport] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [processing, setProcessing] = useState(false);

    // Razones de reporte traducidas
    const REASON_LABELS = {
        closed: '🚪 ' + t('report.reasons.closed', { defaultValue: 'Cerrado permanentemente' }),
        wrong_phone: '📞 ' + t('report.reasons.wrong_phone', { defaultValue: 'Teléfono incorrecto' }),
        wrong_address: '📍 ' + t('report.reasons.wrong_address', { defaultValue: 'Dirección incorrecta' }),
        wrong_hours: '🕒 ' + t('report.reasons.wrong_hours', { defaultValue: 'Horarios incorrectos' }),
        wrong_name: '🏷️ ' + t('report.reasons.wrong_name', { defaultValue: 'Nombre incorrecto' }),
        spam: '⚠️ ' + t('report.reasons.spam'),
        other: '❓ ' + t('report.reasons.other')
    };

    // Estados de reportes
    const STATUS_CONFIG = {
        pending: { label: t('admin.reports.stats.pending'), color: 'yellow', icon: Clock },
        reviewed: { label: t('admin.reports.stats.reviewed'), color: 'blue', icon: Eye },
        fixed: { label: t('admin.reports.stats.resolved'), color: 'green', icon: CheckCircle },
        rejected: { label: t('admin.reports.stats.rejected'), color: 'red', icon: XCircle }
    };

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
            toast.error(t('report.error'));
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

            toast.success(`${t('report.success')} (${STATUS_CONFIG[newStatus].label})`);
            setSelectedReport(null);
            setResolutionNotes('');
            fetchReports();
        } catch (error) {
            console.error('Error updating report:', error);
            toast.error(t('report.error'));
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

        if (diffHours < 1) return t('common.now');
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays === 1) return t('common.yesterday', { defaultValue: 'Ayer' });
        return `${diffDays}d`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle className="w-8 h-8 text-orange-500" />
                        {t('admin.reports.title')}
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {t('admin.reports.description')}
                    </p>
                </div>
                <button
                    onClick={fetchReports}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {t('admin.reports.actions.update')}
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
                        {filter === 'all' ? t('admin.reports.stats.all') : `${t('admin.reports.title')} ${STATUS_CONFIG[filter]?.label}`} ({reports.length})
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2" />
                        {t('common.loading')}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
                        <p className="font-medium">{t('common.noReviews', { defaultValue: 'No hay reportes pendientes' })}</p>
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
                                                    {report.businesses?.name || t('common.deleted', { defaultValue: 'Eliminado' })}
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
                                {t('admin.reports.detail')}
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
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{t('report.reason')}:</span>
                                <span className="ml-2">{REASON_LABELS[selectedReport.reason]}</span>
                            </div>
                            {selectedReport.details && (
                                <div>
                                    <span className="font-semibold text-gray-700 dark:text-gray-300">{t('report.details')}:</span>
                                    <p className="mt-1 p-3 bg-gray-50 rounded-lg text-gray-700">
                                        {selectedReport.details}
                                    </p>
                                </div>
                            )}
                            <div>
                                <span className="font-semibold text-gray-700 dark:text-gray-300">{t('common.date', { defaultValue: 'Fecha' })}:</span>
                                <span className="ml-2">{new Date(selectedReport.created_at).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Resolution Notes */}
                        <div className="mb-6">
                            <label className="block font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                {t('admin.reports.notes')}:
                            </label>
                            <textarea
                                value={resolutionNotes}
                                onChange={(e) => setResolutionNotes(e.target.value)}
                                placeholder={t('admin.reports.notesPlaceholder')}
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
                                {t('admin.reports.actions.resolve')}
                            </button>
                            <button
                                onClick={() => updateReportStatus(selectedReport.id, 'rejected')}
                                disabled={processing}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                            >
                                <XCircle className="w-4 h-4" />
                                {t('admin.reports.actions.reject')}
                            </button>
                            <button
                                onClick={() => setSelectedReport(null)}
                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                {t('common.cancel')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
