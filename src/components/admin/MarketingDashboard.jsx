// Dashboard de Métricas de Marketing
// Component para visualizar estadísticas de campañas

import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Mail, CheckCircle, Clock, Target, Zap } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';

const MarketingDashboard = () => {
    const [metrics, setMetrics] = useState({
        total: 0,
        byTier: {},
        byStatus: {},
        sentToday: 0,
        dailyLimit: 100,
        projections: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadMetrics();
    }, []);

    const loadMetrics = async () => {
        setLoading(true);
        try {
            // 1. Total contactos
            const { count: total } = await supabase
                .from('marketing_contacts')
                .select('*', { count: 'exact', head: true });

            // 2. Distribución por tier
            const { data: tierData } = await supabase
                .from('marketing_contacts')
                .select('tier')
                .then(({ data }) => {
                    const distribution = data?.reduce((acc, { tier }) => {
                        acc[tier] = (acc[tier] || 0) + 1;
                        return acc;
                    }, {});
                    return { data: distribution };
                });

            // 3. Por estado de email
            const { data: statusData } = await supabase
                .from('marketing_contacts')
                .select('email_status')
                .then(({ data }) => {
                    const distribution = data?.reduce((acc, { email_status }) => {
                        const status = email_status || 'pending';
                        acc[status] = (acc[status] || 0) + 1;
                        return acc;
                    }, {});
                    return { data: distribution };
                });

            // 4. Enviados hoy
            const today = new Date().toISOString().split('T')[0];
            const { count: sentToday } = await supabase
                .from('campaign_history')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_type', 'email')
                .gte('sent_at', `${today}T00:00:00`);

            // 5. Límite configurado
            const { data: config } = await supabase
                .from('automation_config')
                .select('daily_limit')
                .eq('campaign_type', 'email')
                .single();

            const dailyLimit = config?.daily_limit || 100;

            // 6. Proyecciones
            const pending = statusData?.pending || 0;
            const daysToComplete = Math.ceil(pending / dailyLimit);
            const completionDate = new Date();
            completionDate.setDate(completionDate.getDate() + daysToComplete);

            setMetrics({
                total: total || 0,
                byTier: tierData || {},
                byStatus: statusData || {},
                sentToday: sentToday || 0,
                dailyLimit,
                projections: {
                    pending,
                    daysToComplete,
                    completionDate: completionDate.toLocaleDateString('es-MX')
                }
            });

        } catch (error) {
            console.error('Error loading metrics:', error);
        } finally {
            setLoading(false);
        }
    };

    // Colores para gráficas
    const TIER_COLORS = {
        'AAA': '#EAB308',
        'AA': '#A855F7',
        'A': '#3B82F6',
        'B': '#6B7280'
    };

    const STATUS_COLORS = {
        'pending': '#F59E0B',
        'sent': '#10B981',
        'bounced': '#EF4444',
        'failed': '#DC2626'
    };

    // Preparar datos para gráficas
    const tierChartData = Object.entries(metrics.byTier).map(([tier, count]) => ({
        tier,
        count,
        percentage: ((count / metrics.total) * 100).toFixed(1)
    }));

    const statusChartData = Object.entries(metrics.byStatus).map(([status, count]) => ({
        status: status === 'pending' ? 'Pendientes' : status === 'sent' ? 'Enviados' : status === 'bounced' ? 'Rebotados' : 'Fallidos',
        count,
        percentage: ((count / metrics.total) * 100).toFixed(1)
    }));

    return (
        <div className="space-y-6">
            {/* KPIs Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Contactos */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Total</span>
                    </div>
                    <p className="text-3xl font-bold">{metrics.total.toLocaleString()}</p>
                    <p className="text-sm opacity-80 mt-1">Contactos en base</p>
                </div>

                {/* Enviados Hoy */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <CheckCircle className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Hoy</span>
                    </div>
                    <p className="text-3xl font-bold">{metrics.sentToday}</p>
                    <p className="text-sm opacity-80 mt-1">
                        de {metrics.dailyLimit} ({((metrics.sentToday / metrics.dailyLimit) * 100).toFixed(0)}%)
                    </p>
                </div>

                {/* Pendientes */}
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Pendientes</span>
                    </div>
                    <p className="text-3xl font-bold">{(metrics.projections.pending || 0).toLocaleString()}</p>
                    <p className="text-sm opacity-80 mt-1">Sin contactar</p>
                </div>

                {/* Proyección */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Target className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Proyección</span>
                    </div>
                    <p className="text-3xl font-bold">{metrics.projections.daysToComplete || 0}</p>
                    <p className="text-sm opacity-80 mt-1">días para completar</p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Distribución por Tier */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-blue-600" />
                        Distribución por Tier
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={tierChartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="tier" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="count" fill="#3B82F6">
                                {tierChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={TIER_COLORS[entry.tier]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-4 gap-2 mt-4">
                        {tierChartData.map(({ tier, count, percentage }) => (
                            <div key={tier} className="text-center p-2 bg-gray-50 rounded">
                                <p className="text-xs text-gray-600">{tier}</p>
                                <p className="font-bold" style={{ color: TIER_COLORS[tier] }}>
                                    {count.toLocaleString()}
                                </p>
                                <p className="text-xs text-gray-500">{percentage}%</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Estado de Envío */}
                <div className="bg-white rounded-xl p-6 shadow-sm border">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-green-600" />
                        Estado de Envío
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={statusChartData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ status, percentage }) => `${status}: ${percentage}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {statusChartData.map((entry, index) => {
                                    const status = entry.status === 'Pendientes' ? 'pending' :
                                        entry.status === 'Enviados' ? 'sent' :
                                            entry.status === 'Rebotados' ? 'bounced' : 'failed';
                                    return <Cell key={`cell-${index}`} fill={STATUS_COLORS[status]} />;
                                })}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-2 mt-4">
                        {statusChartData.map(({ status, count, percentage }) => {
                            const statusKey = status === 'Pendientes' ? 'pending' :
                                status === 'Enviados' ? 'sent' :
                                    status === 'Rebotados' ? 'bounced' : 'failed';
                            return (
                                <div key={status} className="p-2 bg-gray-50 rounded">
                                    <div className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: STATUS_COLORS[statusKey] }}
                                        />
                                        <p className="text-xs text-gray-600">{status}</p>
                                    </div>
                                    <p className="font-bold text-sm mt-1">{count.toLocaleString()} ({percentage}%)</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Projections & Insights */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Proyección de Campaña */}
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-purple-600" />
                        Proyección de Campaña
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-600">Contactos pendientes</span>
                            <span className="font-bold text-xl text-purple-600">
                                {(metrics.projections.pending || 0).toLocaleString()}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-600">Emails por día</span>
                            <span className="font-bold text-xl text-blue-600">
                                {metrics.dailyLimit}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-600">Días restantes</span>
                            <span className="font-bold text-xl text-orange-600">
                                ~{metrics.projections.daysToComplete || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                            <span className="text-gray-600">Fecha estimada</span>
                            <span className="font-bold text-sm text-green-600">
                                {metrics.projections.completionDate || 'N/A'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Quick Actions & Tips */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-green-600" />
                        Recomendaciones
                    </h3>
                    <div className="space-y-3">
                        {metrics.sentToday === 0 && (
                            <div className="p-3 bg-orange-100 border border-orange-300 rounded-lg">
                                <p className="text-sm font-medium text-orange-900">
                                    ⚠️ No has enviado emails hoy
                                </p>
                                <p className="text-xs text-orange-700 mt-1">
                                    Genera la cola y comienza a enviar para aprovechar tu límite diario
                                </p>
                            </div>
                        )}

                        {metrics.sentToday > 0 && metrics.sentToday < metrics.dailyLimit && (
                            <div className="p-3 bg-blue-100 border border-blue-300 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                    📊 Quedan {metrics.dailyLimit - metrics.sentToday} emails disponibles hoy
                                </p>
                                <p className="text-xs text-blue-700 mt-1">
                                    Puedes seguir enviando para optimizar tu alcance diario
                                </p>
                            </div>
                        )}

                        {metrics.sentToday >= metrics.dailyLimit && (
                            <div className="p-3 bg-green-100 border border-green-300 rounded-lg">
                                <p className="text-sm font-medium text-green-900">
                                    ✅ Límite diario alcanzado
                                </p>
                                <p className="text-xs text-green-700 mt-1">
                                    Vuelve mañana para continuar con la campaña
                                </p>
                            </div>
                        )}

                        <div className="p-3 bg-white rounded-lg border border-gray-200">
                            <p className="text-sm font-medium text-gray-900 mb-2">💡 Tips:</p>
                            <ul className="text-xs text-gray-600 space-y-1">
                                <li>• Prioriza tier AAA para máximo ROI</li>
                                <li>• Mantén 100 emails/día para evitar spam</li>
                                <li>• Revisa métricas de Resend regularmente</li>
                                <li>• Actualiza contactos bounced</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Refresh Button */}
            <div className="text-center">
                <button
                    onClick={loadMetrics}
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                    {loading ? 'Cargando...' : '🔄 Actualizar Métricas'}
                </button>
            </div>
        </div>
    );
};

export default MarketingDashboard;
