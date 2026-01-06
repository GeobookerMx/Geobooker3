// src/pages/admin/AdInventory.jsx
/**
 * Enterprise Ad Inventory Dashboard
 * Shows: Slot availability, Calendar view, Campaign metrics, Revenue tracking
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Globe, MapPin, Calendar, TrendingUp, DollarSign,
    BarChart3, Eye, MousePointer, Percent, Download,
    ChevronDown, ChevronRight, AlertCircle, CheckCircle,
    Filter, RefreshCw, Check, X, ExternalLink, Edit, Trash2
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdInventory() {
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [expandedLevels, setExpandedLevels] = useState(['global', 'region']);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load inventory status
            const { data: invData, error: invError } = await supabase.rpc('get_ad_inventory_status');
            if (invError) throw invError;
            setInventory(invData || []);

            // Load active/recent campaigns
            const { data: campData, error: campError } = await supabase
                .from('ad_campaigns')
                .select('*')
                .in('status', ['active', 'pending_review', 'draft', 'approved'])
                .order('created_at', { ascending: false })
                .limit(50);
            if (!campError) setCampaigns(campData || []);

            // Calculate aggregate metrics
            calculateMetrics(campData || []);

        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error al cargar inventario');
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (camps) => {
        const active = camps.filter(c => c.status === 'active');
        const pending = camps.filter(c => c.status === 'pending_review');
        const totalRevenue = camps.reduce((sum, c) => sum + (parseFloat(c.total_budget) || 0), 0);

        setMetrics({
            totalCampaigns: camps.length,
            activeCampaigns: active.length,
            pendingReview: pending.length,
            totalRevenue,
            avgCampaignValue: camps.length > 0 ? totalRevenue / camps.length : 0
        });
    };

    // ==========================================
    // FUNCIONES DE GESTIÓN DE CAMPAÑAS
    // ==========================================

    const handleApproveCampaign = async (campaignId) => {
        const loadingToast = toast.loading('Aprobando campaña...');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({
                    status: 'active',
                    approved_at: new Date().toISOString()
                })
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('✅ Campaña aprobada y activa', { id: loadingToast });
            loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Error approving campaign:', error);
            toast.error('Error al aprobar campaña', { id: loadingToast });
        }
    };

    const handleRejectCampaign = async (campaignId) => {
        const reason = prompt('Razón del rechazo (opcional):');
        const loadingToast = toast.loading('Rechazando campaña...');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({
                    status: 'rejected',
                    rejection_reason: reason || 'No especificada'
                })
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('Campaña rechazada', { id: loadingToast });
            loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Error rejecting campaign:', error);
            toast.error('Error al rechazar campaña', { id: loadingToast });
        }
    };

    const handlePauseCampaign = async (campaignId) => {
        const loadingToast = toast.loading('Pausando campaña...');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .update({ status: 'paused' })
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('Campaña pausada', { id: loadingToast });
            loadData();
        } catch (error) {
            console.error('Error pausing campaign:', error);
            toast.error('Error al pausar campaña', { id: loadingToast });
        }
    };

    const handleDeleteCampaign = async (campaignId) => {
        if (!confirm('¿Estás seguro de eliminar esta campaña? Esta acción no se puede deshacer.')) return;

        const loadingToast = toast.loading('Eliminando campaña...');
        try {
            const { error } = await supabase
                .from('ad_campaigns')
                .delete()
                .eq('id', campaignId);

            if (error) throw error;

            toast.success('Campaña eliminada', { id: loadingToast });
            loadData();
            setShowModal(false);
        } catch (error) {
            console.error('Error deleting campaign:', error);
            toast.error('Error al eliminar campaña', { id: loadingToast });
        }
    };

    const openCampaignModal = (campaign) => {
        setSelectedCampaign(campaign);
        setShowModal(true);
    };

    const getSlotStatus = (available, max) => {
        const ratio = available / max;
        if (ratio === 0) return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'LLENO' };
        if (ratio <= 0.3) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'BAJO' };
        return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'OK' };
    };

    const getStatusLabel = (status) => {
        const labels = {
            active: 'Activa',
            pending_review: 'Pendiente',
            draft: 'Borrador',
            approved: 'Aprobada',
            rejected: 'Rechazada',
            paused: 'Pausada',
            completed: 'Completada'
        };
        return labels[status] || status;
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-500/20 text-green-400',
            pending_review: 'bg-yellow-500/20 text-yellow-400',
            draft: 'bg-gray-500/20 text-gray-400',
            approved: 'bg-blue-500/20 text-blue-400',
            rejected: 'bg-red-500/20 text-red-400',
            paused: 'bg-orange-500/20 text-orange-400',
            completed: 'bg-purple-500/20 text-purple-400'
        };
        return colors[status] || 'bg-gray-500/20 text-gray-400';
    };

    const groupedInventory = inventory.reduce((acc, item) => {
        if (!acc[item.level]) acc[item.level] = [];
        acc[item.level].push(item);
        return acc;
    }, {});

    const toggleLevel = (level) => {
        setExpandedLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const levelIcons = {
        global: <Globe className="w-5 h-5" />,
        region: <MapPin className="w-5 h-5" />,
        country: <MapPin className="w-5 h-5" />,
        city: <MapPin className="w-5 h-5" />
    };

    const levelNames = {
        global: 'Global',
        region: 'Región',
        country: 'País',
        city: 'Ciudad'
    };

    const levelColors = {
        global: 'from-purple-500 to-blue-500',
        region: 'from-blue-500 to-cyan-500',
        country: 'from-cyan-500 to-green-500',
        city: 'from-green-500 to-emerald-500'
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Inventario de Publicidad Enterprise
                        </h1>
                        <p className="text-gray-400 mt-1">Gestiona espacios, disponibilidad y rendimiento de campañas globales</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                </div>

                {/* Quick Stats */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <Calendar className="w-4 h-4" />
                                Total Campañas
                            </div>
                            <div className="text-2xl font-bold text-white">{metrics.totalCampaigns}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                Activas
                            </div>
                            <div className="text-2xl font-bold text-green-400">{metrics.activeCampaigns}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 cursor-pointer hover:border-yellow-500/50 transition"
                            onClick={() => document.getElementById('pending-campaigns')?.scrollIntoView({ behavior: 'smooth' })}>
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                Pendientes de Revisión
                            </div>
                            <div className="text-2xl font-bold text-yellow-400">{metrics.pendingReview}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                Ingresos Totales
                            </div>
                            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.totalRevenue)}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                Promedio por Campaña
                            </div>
                            <div className="text-2xl font-bold text-blue-400">{formatCurrency(metrics.avgCampaignValue)}</div>
                        </div>
                    </div>
                )}

                {/* Inventory Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Slot Availability */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            Disponibilidad de Espacios
                        </h2>

                        <div className="space-y-4">
                            {['global', 'region', 'country', 'city'].map(level => (
                                <div key={level} className="border border-gray-700 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleLevel(level)}
                                        className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${levelColors[level]} bg-opacity-20`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {levelIcons[level]}
                                            <span className="font-semibold text-white">{levelNames[level]}</span>
                                            <span className="text-sm text-gray-300">
                                                ({groupedInventory[level]?.length || 0} ubicaciones)
                                            </span>
                                        </div>
                                        {expandedLevels.includes(level)
                                            ? <ChevronDown className="w-5 h-5 text-white" />
                                            : <ChevronRight className="w-5 h-5 text-white" />
                                        }
                                    </button>

                                    {expandedLevels.includes(level) && (
                                        <div className="p-4 space-y-2 bg-gray-900/50">
                                            {(groupedInventory[level] || []).map(slot => {
                                                const status = getSlotStatus(Number(slot.available_slots), slot.max_slots);
                                                return (
                                                    <div key={slot.location_code || 'global'} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                                        <div>
                                                            <div className="text-white font-medium">{slot.location_name}</div>
                                                            <div className="text-gray-400 text-sm">{formatCurrency(slot.price_usd)}/mes</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <div className={`font-bold ${status.color}`}>
                                                                    {Number(slot.available_slots)}/{slot.max_slots}
                                                                </div>
                                                                <div className="text-xs text-gray-500">disponibles</div>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${status.bg} ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Campaigns with Actions */}
                    <div id="pending-campaigns" className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-400" />
                            Campañas Recientes
                        </h2>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {campaigns.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    No hay campañas aún
                                </div>
                            ) : (
                                campaigns.map(campaign => (
                                    <div key={campaign.id} className="p-4 bg-gray-900 rounded-lg hover:bg-gray-900/80 transition">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-medium text-white">{campaign.advertiser_name || 'Sin nombre'}</span>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                                        {getStatusLabel(campaign.status)}
                                                    </span>
                                                </div>
                                                <div className="text-sm text-gray-400 mt-1 line-clamp-1">
                                                    {campaign.target_cities?.slice(0, 5).join(', ') || campaign.target_countries?.join(', ') || 'Sin especificar'}
                                                    {campaign.target_cities?.length > 5 && ` +${campaign.target_cities.length - 5} más`}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    📅 {campaign.start_date} → {campaign.end_date || 'Sin fin'}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <div className="text-lg font-bold text-emerald-400">
                                                    {formatCurrency(campaign.total_budget || 0)}
                                                </div>
                                                <div className="text-xs text-gray-500">{campaign.currency || 'USD'}</div>
                                            </div>
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                                            <button
                                                onClick={() => openCampaignModal(campaign)}
                                                className="flex-1 flex items-center justify-center gap-1 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 rounded transition"
                                            >
                                                <Eye className="w-4 h-4" /> Ver
                                            </button>

                                            {campaign.status === 'pending_review' && (
                                                <>
                                                    <button
                                                        onClick={() => handleApproveCampaign(campaign.id)}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded transition"
                                                    >
                                                        <Check className="w-4 h-4" /> Aprobar
                                                    </button>
                                                    <button
                                                        onClick={() => handleRejectCampaign(campaign.id)}
                                                        className="flex-1 flex items-center justify-center gap-1 bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded transition"
                                                    >
                                                        <X className="w-4 h-4" /> Rechazar
                                                    </button>
                                                </>
                                            )}

                                            {campaign.status === 'active' && (
                                                <button
                                                    onClick={() => handlePauseCampaign(campaign.id)}
                                                    className="flex-1 flex items-center justify-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-sm py-2 rounded transition"
                                                >
                                                    ⏸️ Pausar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Calendar View (Simple) */}
                <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Calendario de Campañas
                    </h2>

                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Timeline Header */}
                            <div className="flex border-b border-gray-700 pb-2 mb-4">
                                <div className="w-48 text-gray-400 text-sm">Campaña</div>
                                <div className="flex-1 flex">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <div key={i} className="flex-1 text-center text-gray-500 text-xs">
                                            {new Date(2026, i, 1).toLocaleDateString('es-MX', { month: 'short' })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Campaign Bars */}
                            {campaigns.filter(c => c.start_date).slice(0, 10).map(campaign => {
                                const start = new Date(campaign.start_date);
                                const end = campaign.end_date ? new Date(campaign.end_date) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                                const startMonth = start.getMonth();
                                const duration = Math.ceil((end - start) / (30 * 24 * 60 * 60 * 1000));

                                return (
                                    <div key={campaign.id} className="flex items-center py-2">
                                        <div className="w-48 text-white text-sm truncate pr-4">
                                            {campaign.advertiser_name}
                                        </div>
                                        <div className="flex-1 flex relative h-6">
                                            <div
                                                className={`absolute h-full rounded cursor-pointer hover:opacity-80 ${campaign.status === 'active' ? 'bg-green-500' :
                                                        campaign.status === 'pending_review' ? 'bg-yellow-500' :
                                                            'bg-blue-500'
                                                    }`}
                                                style={{
                                                    left: `${(startMonth / 12) * 100}%`,
                                                    width: `${Math.min(duration, 12 - startMonth) / 12 * 100}%`
                                                }}
                                                title={`${campaign.advertiser_name}: ${campaign.start_date} - ${campaign.end_date || 'Sin fin'}`}
                                                onClick={() => openCampaignModal(campaign)}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Export Section */}
                <div className="mt-6 flex justify-end gap-4">
                    <button className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        <Download className="w-4 h-4" />
                        Exportar Inventario CSV
                    </button>
                </div>
            </div>

            {/* Campaign Detail Modal */}
            {showModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedCampaign.advertiser_name}</h2>
                                    <p className="text-purple-200 mt-1">ID: {selectedCampaign.id.substring(0, 8)}...</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white hover:bg-white/20 p-2 rounded-full transition"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mt-4">
                                <span className={`px-3 py-1 rounded-full text-sm font-bold ${getStatusColor(selectedCampaign.status)}`}>
                                    {getStatusLabel(selectedCampaign.status)}
                                </span>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Budget & Dates */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    <div className="text-gray-400 text-sm">Presupuesto Total</div>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        {formatCurrency(selectedCampaign.total_budget || 0)}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    <div className="text-gray-400 text-sm">Duración</div>
                                    <div className="text-white font-medium">
                                        {selectedCampaign.start_date} → {selectedCampaign.end_date || 'Sin fin'}
                                    </div>
                                </div>
                            </div>

                            {/* Target Locations */}
                            <div>
                                <h3 className="text-white font-bold mb-2">Ubicaciones Objetivo</h3>
                                <div className="bg-gray-900 p-4 rounded-lg">
                                    {selectedCampaign.target_countries?.length > 0 && (
                                        <div className="mb-2">
                                            <span className="text-gray-400 text-sm">Países: </span>
                                            <span className="text-white">{selectedCampaign.target_countries.join(', ')}</span>
                                        </div>
                                    )}
                                    {selectedCampaign.target_cities?.length > 0 && (
                                        <div>
                                            <span className="text-gray-400 text-sm">Ciudades: </span>
                                            <span className="text-white text-sm">{selectedCampaign.target_cities.join(', ')}</span>
                                        </div>
                                    )}
                                    {!selectedCampaign.target_countries?.length && !selectedCampaign.target_cities?.length && (
                                        <span className="text-gray-500">Sin ubicaciones especificadas</span>
                                    )}
                                </div>
                            </div>

                            {/* Contact Info */}
                            {selectedCampaign.contact_email && (
                                <div>
                                    <h3 className="text-white font-bold mb-2">Contacto</h3>
                                    <div className="bg-gray-900 p-4 rounded-lg">
                                        <p className="text-white">{selectedCampaign.contact_email}</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-gray-700">
                                {selectedCampaign.status === 'pending_review' && (
                                    <>
                                        <button
                                            onClick={() => handleApproveCampaign(selectedCampaign.id)}
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                        >
                                            <Check className="w-5 h-5" /> Aprobar Campaña
                                        </button>
                                        <button
                                            onClick={() => handleRejectCampaign(selectedCampaign.id)}
                                            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                        >
                                            <X className="w-5 h-5" /> Rechazar
                                        </button>
                                    </>
                                )}

                                {selectedCampaign.status === 'active' && (
                                    <button
                                        onClick={() => handlePauseCampaign(selectedCampaign.id)}
                                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                    >
                                        ⏸️ Pausar Campaña
                                    </button>
                                )}

                                <button
                                    onClick={() => handleDeleteCampaign(selectedCampaign.id)}
                                    className="bg-gray-700 hover:bg-red-600 text-white px-4 py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition"
                                    title="Eliminar campaña"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

