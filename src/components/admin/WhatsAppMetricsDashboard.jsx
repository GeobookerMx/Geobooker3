// Dashboard de Métricas de WhatsApp Unificado
// Muestra estadísticas consolidadas de TODOS los sistemas
// src/components/admin/WhatsAppMetricsDashboard.jsx

import React, { useState, useEffect } from 'react';
import {
    MessageCircle, TrendingUp, Clock, Users, CheckCircle,
    Eye, RefreshCw, Phone, Globe, BarChart3, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import WhatsAppService from '../../services/whatsappService';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const WhatsAppMetricsDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [todayStats, setTodayStats] = useState(null);
    const [sourceMetrics, setSourceMetrics] = useState([]);
    const [dailyMetrics, setDailyMetrics] = useState([]);
    const [hotLeads, setHotLeads] = useState([]);

    useEffect(() => {
        loadAllMetrics();
    }, []);

    const loadAllMetrics = async () => {
        setLoading(true);
        try {
            await Promise.all([
                loadTodayStats(),
                loadSourceMetrics(),
                loadDailyMetrics(),
                loadHotLeads()
            ]);
        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadTodayStats = async () => {
        const stats = await WhatsAppService.getTodayStats();
        setTodayStats(stats);
    };

    const loadSourceMetrics = async () => {
        const { data, error } = await supabase
            .from('whatsapp_source_metrics')
            .select('*');

        if (!error && data) {
            setSourceMetrics(data);
        }
    };

    const loadDailyMetrics = async () => {
        const { data, error } = await supabase
            .from('whatsapp_daily_metrics')
            .select('*')
            .limit(7)
            .order('date', { ascending: false });

        if (!error && data) {
            setDailyMetrics(data.reverse());
        }
    };

    const loadHotLeads = async () => {
        const { data, error } = await supabase
            .from('whatsapp_hot_leads')
            .select('*')
            .limit(10);

        if (!error && data) {
            setHotLeads(data);
        }
    };

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📱 WhatsApp Metrics</h2>
                    <p className="text-gray-600 mt-1">Sistema unificado de métricas</p>
                </div>
                <button
                    onClick={loadAllMetrics}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <RefreshCw className="w-4 h-4" />
                    Actualizar
                </button>
            </div>

            {/* KPIs Hoy */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <MessageCircle className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Hoy</span>
                    </div>
                    <p className="text-3xl font-bold">{todayStats?.sent || 0}</p>
                    <p className="text-sm opacity-80 mt-1">
                        de {todayStats?.limit || 20} ({Math.round((todayStats?.sent || 0) / (todayStats?.limit || 20) * 100)}%)
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Disponible</span>
                    </div>
                    <p className="text-3xl font-bold">{todayStats?.remaining || 20}</p>
                    <p className="text-sm opacity-80 mt-1">Mensajes restantes hoy</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Response</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {sourceMetrics.length > 0
                            ? Math.round(sourceMetrics.reduce((sum, s) => sum + parseFloat(s.response_rate || 0), 0) / sourceMetrics.length)
                            : 0}%
                    </p>
                    <p className="text-sm opacity-80 mt-1">Tasa de respuesta</p>
                </div>

                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Hot</span>
                    </div>
                    <p className="text-3xl font-bold">{hotLeads.length}</p>
                    <p className="text-sm opacity-80 mt-1">Leads calientes</p>
                </div>
            </div>

            {/* Gráficas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Por Fuente */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-bold text-gray-900 mb-4">📊 Mensajes por Fuente</h3>
                    {sourceMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={sourceMetrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="source" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="total_sent" fill="#10b981" name="Enviados" />
                                <Bar dataKey="total_replies" fill="#3b82f6" name="Respuestas" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500 py-12">No hay datos aún</p>
                    )}
                </div>

                {/* Últimos 7 días */}
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-bold text-gray-900 mb-4">📅 Últimos 7 Días</h3>
                    {dailyMetrics.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={dailyMetrics}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="date"
                                    tickFormatter={(date) => new Date(date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                                />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="total_sent" fill="#10b981" name="Enviados" />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-center text-gray-500 py-12">No hay datos aún</p>
                    )}
                </div>
            </div>

            {/* Estadísticas por Fuente */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">🔍 Detalle por Fuente</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Fuente</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Respuestas</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Conversiones</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Response Rate</th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tiempo Resp.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {sourceMetrics.map((metric, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                            {metric.source === 'scan_invite' && '🔍 Scan & Invite'}
                                            {metric.source === 'apify' && '🌍 Apify'}
                                            {metric.source === 'crm_queue' && '📋 CRM Queue'}
                                            {metric.source === 'manual' && '✋ Manual'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-medium">{metric.total_sent}</td>
                                    <td className="px-4 py-3 text-green-600 font-medium">{metric.total_replies}</td>
                                    <td className="px-4 py-3 text-purple-600 font-medium">{metric.total_conversions}</td>
                                    <td className="px-4 py-3">
                                        <span className={`font-medium ${parseFloat(metric.response_rate) > 15 ? 'text-green-600' :
                                                parseFloat(metric.response_rate) > 5 ? 'text-yellow-600' :
                                                    'text-gray-600'
                                            }`}>
                                            {metric.response_rate}%
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">
                                        {metric.avg_response_time_hours ? `${metric.avg_response_time_hours}h` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Hot Leads */}
            {hotLeads.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-bold text-gray-900">🔥 Hot Leads (Respondieron)</h3>
                        <span className="text-sm text-gray-500">{hotLeads.length} leads</span>
                    </div>
                    <div className="divide-y max-h-96 overflow-y-auto">
                        {hotLeads.map((lead) => (
                            <div key={lead.id} className="p-4 hover:bg-gray-50">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold text-gray-900">
                                            {lead.company_name || lead.contact_name || 'Sin nombre'}
                                        </p>
                                        <p className="text-sm text-gray-600">{lead.phone}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                                                {lead.status}
                                            </span>
                                            <span className="text-xs text-gray-500">
                                                {new Date(lead.replied_at || lead.read_at).toLocaleDateString('es-MX')}
                                            </span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => WhatsAppService.openWhatsApp(lead.phone, lead.message_sent)}
                                        className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
                                    >
                                        Abrir Chat
                                    </button>
                                </div>
                                {lead.response_text && (
                                    <p className="mt-2 text-sm text-gray-600 italic border-l-2 border-green-500 pl-3">
                                        "{lead.response_text}"
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Sistema Unificado</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Límite global: 20 mensajes/día (compartido entre todos los sistemas)</li>
                    <li>• Deduplicación automática: no se contacta al mismo número 2 veces</li>
                    <li>• Soporte multi-idioma: español e inglés</li>
                    <li>• Compatible móvil y desktop</li>
                </ul>
            </div>
        </div>
    );
};

export default WhatsAppMetricsDashboard;
