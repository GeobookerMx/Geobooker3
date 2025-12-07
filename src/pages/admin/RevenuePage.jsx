// src/pages/admin/RevenuePage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    DollarSign,
    TrendingUp,
    Calendar,
    Download,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function RevenuePage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingPayments: 0,
        completedTransactions: 0,
        loading: true
    });

    const [revenueByMonth, setRevenueByMonth] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [revenueBySpace, setRevenueBySpace] = useState([]);

    useEffect(() => {
        loadRevenueData();
    }, []);

    const loadRevenueData = async () => {
        try {
            // Obtener todas las campañas pagadas/activas
            const { data: campaigns } = await supabase
                .from('ad_campaigns')
                .select('*, ad_spaces(display_name)')
                .in('status', ['active', 'completed']);

            // Total de ingresos
            const totalRevenue = campaigns?.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0) || 0;

            // Ingresos del mes actual
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyRevenue = campaigns
                ?.filter(c => {
                    const date = new Date(c.created_at);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, c) => sum + parseFloat(c.budget || 0), 0) || 0;

            // Campañas pendientes de pago
            const { count: pendingCount } = await supabase
                .from('ad_campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending_payment');

            // Ingresos por mes (últimos 6 meses)
            const monthlyData = generateMonthlyData(campaigns || []);

            // Ingresos por espacio
            const spaceRevenue = Object.values(
                (campaigns || []).reduce((acc, campaign) => {
                    const spaceName = campaign.ad_spaces?.display_name || 'Otro';
                    if (!acc[spaceName]) {
                        acc[spaceName] = { name: spaceName, revenue: 0 };
                    }
                    acc[spaceName].revenue += parseFloat(campaign.budget || 0);
                    return acc;
                }, {})
            ).sort((a, b) => b.revenue - a.revenue);

            setStats({
                totalRevenue,
                monthlyRevenue,
                pendingPayments: pendingCount || 0,
                completedTransactions: campaigns?.length || 0,
                loading: false
            });

            setRevenueByMonth(monthlyData);
            setRecentTransactions(campaigns?.slice(0, 10) || []);
            setRevenueBySpace(spaceRevenue);
        } catch (error) {
            console.error('Error loading revenue data:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
    };

    const generateMonthlyData = (campaigns) => {
        const last6Months = [];
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const month = date.toLocaleDateString('es-MX', { month: 'short' });
            const monthNum = date.getMonth();
            const yearNum = date.getFullYear();

            const revenue = campaigns
                .filter(c => {
                    const cDate = new Date(c.created_at);
                    return cDate.getMonth() === monthNum && cDate.getFullYear() === yearNum;
                })
                .reduce((sum, c) => sum + parseFloat(c.budget || 0), 0);

            last6Months.push({ month, revenue });
        }
        return last6Months;
    };

    if (stats.loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Ingresos</h1>
                    <p className="text-gray-600 mt-1">Seguimiento de ingresos y transacciones</p>
                </div>
                <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                    <Download className="w-4 h-4" />
                    Exportar Reporte
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RevenueCard
                    title="Ingresos Totales"
                    value={`$${stats.totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    trend="+12.5%"
                    trendUp={true}
                />
                <RevenueCard
                    title="Este Mes"
                    value={`$${stats.monthlyRevenue.toLocaleString()}`}
                    icon={Calendar}
                    trend="+8.2%"
                    trendUp={true}
                />
                <RevenueCard
                    title="Transacciones"
                    value={stats.completedTransactions}
                    icon={CreditCard}
                    trend="+15"
                    trendUp={true}
                />
                <RevenueCard
                    title="Pendientes"
                    value={stats.pendingPayments}
                    icon={TrendingUp}
                    trend={stats.pendingPayments > 0 ? 'Revisar' : 'Todo al día'}
                    trendUp={false}
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue Over Time */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Ingresos Últimos 6 Meses</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={revenueByMonth}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Revenue by Space */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Ingresos por Espacio</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <BarChart data={revenueBySpace}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
                            <Bar dataKey="revenue" fill="#10B981" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Transacciones Recientes</h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Anunciante</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Espacio</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {recentTransactions.map((transaction) => (
                                <tr key={transaction.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {new Date(transaction.created_at).toLocaleDateString('es-MX')}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                        {transaction.advertiser_name}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-700">
                                        {transaction.ad_spaces?.display_name}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${transaction.status === 'active' ? 'bg-green-100 text-green-700' :
                                                transaction.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {transaction.status === 'active' ? 'Activa' :
                                                transaction.status === 'completed' ? 'Completada' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                        ${parseFloat(transaction.budget || 0).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function RevenueCard({ title, value, icon: Icon, trend, trendUp }) {
    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">{title}</p>
                <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="w-5 h-5 text-blue-600" />
                </div>
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
            <div className="flex items-center gap-1">
                {trendUp ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                    <ArrowDownRight className="w-4 h-4 text-gray-600" />
                )}
                <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-gray-600'}`}>
                    {trend}
                </span>
            </div>
        </div>
    );
}
