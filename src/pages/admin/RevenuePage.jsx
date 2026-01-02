// src/pages/admin/RevenuePage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    DollarSign,
    TrendingUp,
    Calendar,
    Download,
    CreditCard,
    ArrowUpRight,
    ArrowDownRight,
    FileText,
    Send,
    CheckCircle,
    AlertCircle,
    ExternalLink,
    Receipt,
    RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// Estados de factura con colores
const INVOICE_STATUS = {
    pending: { label: '⏳ Falta factura', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
    generated: { label: '📄 Generada', color: 'bg-blue-100 text-blue-800', icon: FileText },
    sent: { label: '✅ Enviada', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    not_required: { label: '🌍 Sin IVA', color: 'bg-gray-100 text-gray-600', icon: Receipt }
};

export default function RevenuePage() {
    const [stats, setStats] = useState({
        totalRevenue: 0,
        monthlyRevenue: 0,
        pendingInvoices: 0,
        completedTransactions: 0,
        totalIva: 0,
        loading: true
    });

    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'invoices'
    const [revenueByMonth, setRevenueByMonth] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [revenueBySpace, setRevenueBySpace] = useState([]);
    const [invoiceFilter, setInvoiceFilter] = useState('all');
    const [selectedCampaign, setSelectedCampaign] = useState(null);

    useEffect(() => {
        loadRevenueData();
    }, []);

    const loadRevenueData = async () => {
        try {
            // Obtener todas las campañas pagadas/activas
            const { data: campaigns } = await supabase
                .from('ad_campaigns')
                .select('*, ad_spaces(display_name)')
                .in('status', ['active', 'completed', 'pending_review'])
                .order('created_at', { ascending: false });

            // Total de ingresos
            const totalRevenue = campaigns?.reduce((sum, c) => sum + parseFloat(c.budget || c.total_budget || 0), 0) || 0;

            // Total IVA
            const totalIva = campaigns?.reduce((sum, c) => sum + parseFloat(c.iva_amount || 0), 0) || 0;

            // Ingresos del mes actual
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const monthlyRevenue = campaigns
                ?.filter(c => {
                    const date = new Date(c.created_at);
                    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
                })
                .reduce((sum, c) => sum + parseFloat(c.budget || c.total_budget || 0), 0) || 0;

            // Facturas pendientes (campañas de México sin factura enviada)
            const pendingInvoices = campaigns?.filter(c =>
                (c.tax_status === 'domestic_mx' || c.billing_country === 'MX' || !c.billing_country) &&
                c.invoice_status !== 'sent' &&
                c.invoice_status !== 'not_required'
            ).length || 0;

            // Ingresos por mes (últimos 6 meses)
            const monthlyData = generateMonthlyData(campaigns || []);

            // Ingresos por espacio
            const spaceRevenue = Object.values(
                (campaigns || []).reduce((acc, campaign) => {
                    const spaceName = campaign.ad_spaces?.display_name || 'Otro';
                    if (!acc[spaceName]) {
                        acc[spaceName] = { name: spaceName, revenue: 0 };
                    }
                    acc[spaceName].revenue += parseFloat(campaign.budget || campaign.total_budget || 0);
                    return acc;
                }, {})
            ).sort((a, b) => b.revenue - a.revenue);

            setStats({
                totalRevenue,
                monthlyRevenue,
                pendingInvoices,
                completedTransactions: campaigns?.length || 0,
                totalIva,
                loading: false
            });

            setRevenueByMonth(monthlyData);
            setRecentTransactions(campaigns || []);
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
                .reduce((sum, c) => sum + parseFloat(c.budget || c.total_budget || 0), 0);

            last6Months.push({ month, revenue });
        }
        return last6Months;
    };

    const updateInvoiceStatus = async (campaignId, newStatus, notes = '') => {
        try {
            const updates = {
                invoice_status: newStatus,
                invoice_notes: notes
            };

            if (newStatus === 'sent') {
                updates.invoice_sent_at = new Date().toISOString();
            }
            if (newStatus === 'generated') {
                updates.invoice_date = new Date().toISOString();
            }

            const { error } = await supabase
                .from('ad_campaigns')
                .update(updates)
                .eq('id', campaignId);

            if (error) throw error;

            toast.success(`Estado de factura actualizado: ${INVOICE_STATUS[newStatus].label}`);
            loadRevenueData();
            setSelectedCampaign(null);
        } catch (error) {
            console.error('Error updating invoice status:', error);
            toast.error('Error actualizando estado de factura');
        }
    };

    // Filtrar transacciones según el filtro de facturas
    const filteredTransactions = invoiceFilter === 'all'
        ? recentTransactions
        : recentTransactions.filter(t => t.invoice_status === invoiceFilter);

    // Determinar si requiere factura (México)
    const requiresInvoice = (campaign) => {
        return campaign.tax_status === 'domestic_mx' ||
            campaign.billing_country === 'MX' ||
            (!campaign.billing_country && !campaign.tax_status);
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
                    <h1 className="text-3xl font-bold text-gray-900">💰 Ingresos y Facturación</h1>
                    <p className="text-gray-600 mt-1">Control fiscal, IVA y estado de facturas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={loadRevenueData}
                        className="flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Actualizar
                    </button>
                    <button className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                        <Download className="w-4 h-4" />
                        Exportar CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex space-x-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'overview'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        📊 Resumen de Ingresos
                    </button>
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'invoices'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        🧾 Control de Facturación
                        {stats.pendingInvoices > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                                {stats.pendingInvoices}
                            </span>
                        )}
                    </button>
                </nav>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    title="IVA Recaudado"
                    value={`$${stats.totalIva.toLocaleString()}`}
                    icon={Receipt}
                    trend="16%"
                    trendUp={true}
                />
                <RevenueCard
                    title="Transacciones"
                    value={stats.completedTransactions}
                    icon={CreditCard}
                    trend={`${stats.completedTransactions} total`}
                    trendUp={true}
                />
                <RevenueCard
                    title="Facturas Pendientes"
                    value={stats.pendingInvoices}
                    icon={AlertCircle}
                    trend={stats.pendingInvoices > 0 ? '¡Revisar!' : 'Todo al día'}
                    trendUp={stats.pendingInvoices === 0}
                    highlight={stats.pendingInvoices > 0}
                />
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <>
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
                </>
            )}

            {activeTab === 'invoices' && (
                <>
                    {/* Invoice Filter */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-600 font-medium">Filtrar:</span>
                        {[
                            { value: 'all', label: 'Todas' },
                            { value: 'pending', label: '⏳ Pendientes' },
                            { value: 'generated', label: '📄 Generadas' },
                            { value: 'sent', label: '✅ Enviadas' },
                            { value: 'not_required', label: '🌍 Sin IVA' }
                        ].map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setInvoiceFilter(filter.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${invoiceFilter === filter.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                </>
            )}

            {/* Transactions Table */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                    {activeTab === 'invoices' ? '🧾 Control de Facturas' : '📋 Transacciones Recientes'}
                </h3>
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Anunciante</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Espacio</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Ubicación</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">IVA</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Factura</th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                                        No hay transacciones con este filtro
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map((transaction) => {
                                    const status = INVOICE_STATUS[transaction.invoice_status] || INVOICE_STATUS.pending;
                                    const needsInvoice = requiresInvoice(transaction);
                                    const subtotal = parseFloat(transaction.subtotal || transaction.budget || transaction.total_budget || 0);
                                    const iva = parseFloat(transaction.iva_amount || 0);
                                    const total = parseFloat(transaction.total_with_iva || subtotal);

                                    return (
                                        <tr key={transaction.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {new Date(transaction.created_at).toLocaleDateString('es-MX')}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-sm font-medium text-gray-900">
                                                    {transaction.advertiser_name}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    {transaction.advertiser_email}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-700">
                                                {transaction.ad_spaces?.display_name || 'N/A'}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {transaction.billing_country === 'MX' || transaction.tax_status === 'domestic_mx' ? (
                                                    <span className="text-green-700">🇲🇽 México</span>
                                                ) : transaction.billing_country ? (
                                                    <span className="text-blue-700">🌍 {transaction.billing_country}</span>
                                                ) : (
                                                    <span className="text-gray-400">Sin definir</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-900 text-right">
                                                ${subtotal.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right">
                                                {needsInvoice ? (
                                                    <span className="text-orange-600 font-medium">
                                                        ${iva.toLocaleString()} <span className="text-xs">(16%)</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">$0 (0%)</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                                                ${total.toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    {needsInvoice && transaction.invoice_status !== 'sent' && (
                                                        <button
                                                            onClick={() => setSelectedCampaign(transaction)}
                                                            className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs font-medium hover:bg-yellow-200"
                                                        >
                                                            Gestionar
                                                        </button>
                                                    )}
                                                    {transaction.stripe_invoice_url && (
                                                        <a
                                                            href={transaction.stripe_invoice_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800"
                                                            title="Ver en Stripe"
                                                        >
                                                            <ExternalLink className="w-4 h-4" />
                                                        </a>
                                                    )}
                                                    {transaction.invoice_status === 'sent' && (
                                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Management Modal */}
            {selectedCampaign && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">
                            🧾 Gestionar Factura
                        </h3>

                        {/* Campaign Info */}
                        <div className="bg-gray-50 rounded-lg p-4 mb-4">
                            <p className="font-semibold">{selectedCampaign.advertiser_name}</p>
                            <p className="text-sm text-gray-600">{selectedCampaign.advertiser_email}</p>
                            <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                                <div>
                                    <span className="text-gray-500">Subtotal:</span>
                                    <span className="ml-2 font-medium">${parseFloat(selectedCampaign.subtotal || selectedCampaign.budget || 0).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">IVA (16%):</span>
                                    <span className="ml-2 font-medium text-orange-600">${parseFloat(selectedCampaign.iva_amount || 0).toLocaleString()}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-gray-500">Total con IVA:</span>
                                    <span className="ml-2 font-bold text-lg">${parseFloat(selectedCampaign.total_with_iva || selectedCampaign.budget || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* RFC Info if available */}
                        {selectedCampaign.client_rfc && (
                            <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                                <p><strong>RFC:</strong> {selectedCampaign.client_rfc}</p>
                                {selectedCampaign.client_razon_social && (
                                    <p><strong>Razón Social:</strong> {selectedCampaign.client_razon_social}</p>
                                )}
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-2">
                            <button
                                onClick={() => updateInvoiceStatus(selectedCampaign.id, 'generated')}
                                className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 font-medium"
                            >
                                <FileText className="w-4 h-4" />
                                Marcar como "Factura Generada"
                            </button>
                            <button
                                onClick={() => updateInvoiceStatus(selectedCampaign.id, 'sent')}
                                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 rounded-lg hover:bg-green-700 font-medium"
                            >
                                <Send className="w-4 h-4" />
                                Marcar como "Factura Enviada"
                            </button>
                            <button
                                onClick={() => updateInvoiceStatus(selectedCampaign.id, 'not_required')}
                                className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 font-medium"
                            >
                                <Receipt className="w-4 h-4" />
                                No requiere factura (Exportación)
                            </button>
                        </div>

                        {/* Info Box */}
                        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                            <strong>💡 Tip:</strong> Usa tu sistema de facturación (Facturapi, Contpaq, etc.)
                            para generar el CFDI y luego marca aquí como "Enviada" para llevar control.
                        </div>

                        {/* Close */}
                        <button
                            onClick={() => setSelectedCampaign(null)}
                            className="w-full mt-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function RevenueCard({ title, value, icon: Icon, trend, trendUp, highlight }) {
    return (
        <div className={`bg-white rounded-xl shadow-md border p-5 ${highlight ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-3">
                <p className="text-sm text-gray-600">{title}</p>
                <div className={`p-2 rounded-lg ${highlight ? 'bg-red-100' : 'bg-blue-50'}`}>
                    <Icon className={`w-5 h-5 ${highlight ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
            <div className="flex items-center gap-1">
                {trendUp ? (
                    <ArrowUpRight className="w-4 h-4 text-green-600" />
                ) : (
                    <ArrowDownRight className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                    {trend}
                </span>
            </div>
        </div>
    );
}
