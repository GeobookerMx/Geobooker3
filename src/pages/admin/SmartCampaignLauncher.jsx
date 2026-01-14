// src/pages/admin/SmartCampaignLauncher.jsx
/**
 * Smart Campaign Launcher - Distribución inteligente de emails por tipo de empresa
 * - Visualiza estadísticas por tipo de empresa y tier
 * - Genera cola de emails distribuida equitativamente
 * - Lanza campañas con warm-up gradual
 */
import React, { useState, useEffect } from 'react';
import {
    BarChart3, Send, Mail, MessageCircle, Users, Building2,
    RefreshCw, Loader2, Play, Pause, Settings, TrendingUp,
    AlertCircle, CheckCircle, Clock, Filter, Download
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const SmartCampaignLauncher = () => {
    // Stats state
    const [companyTypeStats, setCompanyTypeStats] = useState([]);
    const [tierStats, setTierStats] = useState([]);
    const [dailySummary, setDailySummary] = useState(null);
    const [loading, setLoading] = useState(true);

    // Campaign settings
    const [dailyLimit, setDailyLimit] = useState(100);
    const [minPerType, setMinPerType] = useState(10);
    const [emailQueue, setEmailQueue] = useState([]);
    const [whatsappQueue, setWhatsappQueue] = useState([]);

    // Sending state
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            // Load company type stats
            const { data: typeStats, error: typeError } = await supabase
                .from('crm_company_type_stats')
                .select('*')
                .limit(20);

            if (typeError) throw typeError;
            setCompanyTypeStats(typeStats || []);

            // Load tier stats
            const { data: tStats, error: tError } = await supabase
                .from('crm_tier_stats')
                .select('*');

            if (tError) throw tError;
            setTierStats(tStats || []);

            // Load daily summary  
            const { data: summary, error: sError } = await supabase
                .from('crm_daily_summary')
                .select('*')
                .single();

            if (!sError) setDailySummary(summary);

        } catch (err) {
            console.error('Error loading stats:', err);
            toast.error('Error cargando estadísticas');
        } finally {
            setLoading(false);
        }
    };

    const generateEmailQueue = async () => {
        try {
            const { data, error } = await supabase
                .rpc('generate_email_queue', {
                    daily_limit: dailyLimit,
                    min_per_type: minPerType
                });

            if (error) throw error;
            setEmailQueue(data || []);
            toast.success(`📧 Cola generada: ${data?.length || 0} emails`);
        } catch (err) {
            console.error('Error generating queue:', err);
            toast.error('Error generando cola: ' + err.message);
        }
    };

    const generateWhatsAppQueue = async (tier = null) => {
        try {
            const { data, error } = await supabase
                .rpc('generate_whatsapp_queue', {
                    daily_limit: 50,
                    target_tier: tier
                });

            if (error) throw error;
            setWhatsappQueue(data || []);
            toast.success(`📱 Cola WhatsApp: ${data?.length || 0} contactos`);
        } catch (err) {
            console.error('Error generating WA queue:', err);
            toast.error('Error generando cola WhatsApp');
        }
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'AAA': return 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white';
            case 'AA': return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white';
            case 'A': return 'bg-gradient-to-r from-blue-500 to-cyan-600 text-white';
            default: return 'bg-gray-200 text-gray-700';
        }
    };

    const totalEmails = companyTypeStats.reduce((sum, t) => sum + (t.with_email || 0), 0);
    const totalPending = companyTypeStats.reduce((sum, t) => sum + (t.with_email || 0) - (t.emails_sent || 0), 0);
    const totalTypes = companyTypeStats.length;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
                        <BarChart3 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">🎯 Smart Campaign Launcher</h1>
                        <p className="text-gray-500">Distribución inteligente por tipo de empresa</p>
                    </div>
                </div>
                <button
                    onClick={loadStats}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Actualizar
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <div className="flex items-center gap-3 mb-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        <span className="text-sm text-gray-500">Total Contactos</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                        {companyTypeStats.reduce((sum, t) => sum + (t.total_contacts || 0), 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-500">Con Email</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalEmails.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-orange-500" />
                        <span className="text-sm text-gray-500">Pendientes</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalPending.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border">
                    <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-purple-500" />
                        <span className="text-sm text-gray-500">Tipos de Empresa</span>
                    </div>
                    <p className="text-3xl font-bold text-gray-900">{totalTypes}</p>
                </div>
            </div>

            {/* Campaign Settings */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Configuración de Campaña
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📧 Límite diario de emails
                        </label>
                        <select
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                            className="w-full p-3 border rounded-xl"
                        >
                            <option value={20}>20 emails (warm-up inicial)</option>
                            <option value={50}>50 emails (warm-up)</option>
                            <option value={100}>100 emails (conservador)</option>
                            <option value={200}>200 emails (moderado)</option>
                            <option value={500}>500 emails (alto volumen)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            📊 Mínimo por tipo de empresa
                        </label>
                        <select
                            value={minPerType}
                            onChange={(e) => setMinPerType(parseInt(e.target.value))}
                            className="w-full p-3 border rounded-xl"
                        >
                            <option value={2}>2 por tipo</option>
                            <option value={5}>5 por tipo</option>
                            <option value={10}>10 por tipo</option>
                            <option value={20}>20 por tipo</option>
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={generateEmailQueue}
                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700"
                        >
                            <Play className="w-5 h-5" />
                            Generar Cola ({dailyLimit / totalTypes || 0}/tipo)
                        </button>
                    </div>
                </div>

                {/* Distribution preview */}
                {totalTypes > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-blue-800">
                            <strong>Distribución:</strong> {dailyLimit} emails ÷ {totalTypes} tipos = {' '}
                            <strong>{Math.max(minPerType, Math.ceil(dailyLimit / totalTypes))} emails por tipo</strong>
                        </p>
                    </div>
                )}
            </div>

            {/* Tier Stats */}
            <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Estadísticas por Tier
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {tierStats.map((tier) => (
                        <div key={tier.tier} className={`p-4 rounded-xl ${getTierColor(tier.tier)}`}>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl font-bold">{tier.tier}</span>
                                <span className="text-sm opacity-80">{tier.total_contacts} contactos</span>
                            </div>
                            <div className="space-y-1 text-sm opacity-90">
                                <p>📧 Con email: {tier.with_email}</p>
                                <p>📱 Con teléfono: {tier.with_phone}</p>
                                <p>⏳ Pendientes email: {tier.pending_email}</p>
                            </div>
                            <button
                                onClick={() => generateWhatsAppQueue(tier.tier)}
                                className="mt-3 w-full py-2 bg-white/20 rounded-lg text-sm font-medium hover:bg-white/30"
                            >
                                <MessageCircle className="w-4 h-4 inline mr-1" />
                                Cola WhatsApp {tier.tier}
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Company Type Stats */}
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8">
                <div className="p-6 border-b">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Estadísticas por Tipo de Empresa
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Tipo</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Total</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Con Email</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Con Teléfono</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Emails Enviados</th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Cobertura</th>
                                <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Tiers</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {companyTypeStats.map((type, i) => (
                                <tr key={i} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium text-gray-900">
                                        {type.company_type || 'Sin Tipo'}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-700">
                                        {type.total_contacts?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-green-600 font-medium">
                                        {type.with_email?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-blue-600">
                                        {type.with_phone?.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-500">
                                        {type.emails_sent?.toLocaleString() || 0}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${(type.email_coverage_pct || 0) > 50
                                                ? 'bg-green-100 text-green-700'
                                                : (type.email_coverage_pct || 0) > 20
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-600'
                                            }`}>
                                            {type.email_coverage_pct || 0}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex justify-center gap-1">
                                            {type.tier_aaa > 0 && (
                                                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                                                    {type.tier_aaa} AAA
                                                </span>
                                            )}
                                            {type.tier_aa > 0 && (
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                    {type.tier_aa} AA
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Generated Queue Preview */}
            {emailQueue.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden mb-8">
                    <div className="p-6 border-b flex items-center justify-between">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <Mail className="w-5 h-5" />
                            Cola de Emails Generada ({emailQueue.length})
                        </h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const ids = emailQueue.map(e => e.contact_id);
                                    navigator.clipboard.writeText(JSON.stringify(ids));
                                    toast.success('IDs copiados al portapapeles');
                                }}
                                className="px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm"
                            >
                                Copiar IDs
                            </button>
                            <button
                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                            >
                                <Send className="w-4 h-4 inline mr-1" />
                                Enviar Cola
                            </button>
                        </div>
                    </div>
                    <div className="overflow-x-auto max-h-96">
                        <table className="w-full">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">#</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nombre</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Email</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Empresa</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Tipo</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Tier</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {emailQueue.slice(0, 50).map((contact, i) => (
                                    <tr key={contact.contact_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-500">{contact.scheduled_order}</td>
                                        <td className="px-4 py-2 font-medium">{contact.contact_name || '-'}</td>
                                        <td className="px-4 py-2 text-blue-600">{contact.contact_email}</td>
                                        <td className="px-4 py-2">{contact.company_name || '-'}</td>
                                        <td className="px-4 py-2 text-gray-500">{contact.company_type_name}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${contact.contact_tier === 'AAA' ? 'bg-yellow-100 text-yellow-700' :
                                                    contact.contact_tier === 'AA' ? 'bg-purple-100 text-purple-700' :
                                                        contact.contact_tier === 'A' ? 'bg-blue-100 text-blue-700' :
                                                            'bg-gray-100 text-gray-600'
                                                }`}>
                                                {contact.contact_tier}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {emailQueue.length > 50 && (
                            <p className="p-4 text-center text-gray-500 text-sm">
                                Mostrando 50 de {emailQueue.length} contactos...
                            </p>
                        )}
                    </div>
                </div>
            )}

            {/* WhatsApp Queue Preview */}
            {whatsappQueue.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="p-6 border-b">
                        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-500" />
                            Cola de WhatsApp ({whatsappQueue.length})
                        </h2>
                    </div>
                    <div className="overflow-x-auto max-h-64">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Nombre</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Teléfono</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Empresa</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Tier</th>
                                    <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Template Sugerido</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {whatsappQueue.slice(0, 20).map((contact) => (
                                    <tr key={contact.contact_id} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 font-medium">{contact.contact_name || '-'}</td>
                                        <td className="px-4 py-2 text-green-600">{contact.contact_phone}</td>
                                        <td className="px-4 py-2">{contact.company_name || '-'}</td>
                                        <td className="px-4 py-2">
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTierColor(contact.contact_tier)}`}>
                                                {contact.contact_tier}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-gray-500 text-xs">
                                            {contact.suggested_template}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SmartCampaignLauncher;
