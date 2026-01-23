// src/pages/admin/FiscalManagement.jsx
import React, { useState, useEffect } from 'react';
import {
    Receipt, Users, FileText, Search, Plus, Download,
    Edit2, Trash2, Eye, Send, CheckCircle, AlertCircle,
    Building2, Mail, Phone, MapPin, Calendar, DollarSign,
    Filter, RefreshCw, ChevronLeft, ChevronRight, X,
    Upload, ExternalLink, Loader2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const FiscalManagement = () => {
    // State
    const [activeTab, setActiveTab] = useState('invoices'); // invoices | clients
    const [invoices, setInvoices] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    // Modals
    const [showClientModal, setShowClientModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedInvoice, setSelectedInvoice] = useState(null);

    // Stats
    const [stats, setStats] = useState({
        totalInvoices: 0,
        pendingInvoices: 0,
        totalRevenue: 0,
        totalIva: 0
    });

    const pageSize = 20;

    useEffect(() => {
        loadData();
    }, [activeTab, page, statusFilter]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'invoices') {
                await loadInvoices();
            } else {
                await loadClients();
            }
            await loadStats();
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        const { data: inv } = await supabase
            .from('invoices')
            .select('status, subtotal, iva_amount, total');

        if (inv) {
            setStats({
                totalInvoices: inv.length,
                pendingInvoices: inv.filter(i => i.status === 'pending').length,
                totalRevenue: inv.reduce((sum, i) => sum + parseFloat(i.total || 0), 0),
                totalIva: inv.reduce((sum, i) => sum + parseFloat(i.iva_amount || 0), 0)
            });
        }
    };

    const loadInvoices = async () => {
        let query = supabase
            .from('invoices')
            .select(`
                *,
                fiscal_clients (rfc, razon_social, email)
            `, { count: 'exact' });

        if (statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        if (searchTerm) {
            query = query.or(`invoice_number.ilike.%${searchTerm}%,cfdi_uuid.ilike.%${searchTerm}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;
        setInvoices(data || []);
        setTotalCount(count || 0);
    };

    const loadClients = async () => {
        let query = supabase
            .from('fiscal_clients')
            .select('*', { count: 'exact' });

        if (searchTerm) {
            query = query.or(`rfc.ilike.%${searchTerm}%,razon_social.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
        }

        const { data, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * pageSize, page * pageSize - 1);

        if (error) throw error;
        setClients(data || []);
        setTotalCount(count || 0);
    };

    // Generate invoice number
    const generateInvoiceNumber = async () => {
        const { data } = await supabase.rpc('generate_invoice_number');
        return data || `GEO-${new Date().getFullYear()}-${Date.now()}`;
    };

    // Create/Update invoice
    const saveInvoice = async (invoiceData) => {
        try {
            if (!invoiceData.invoice_number) {
                invoiceData.invoice_number = await generateInvoiceNumber();
            }

            if (selectedInvoice?.id) {
                const { error } = await supabase
                    .from('invoices')
                    .update(invoiceData)
                    .eq('id', selectedInvoice.id);
                if (error) throw error;
                toast.success('Factura actualizada');
            } else {
                const { error } = await supabase
                    .from('invoices')
                    .insert(invoiceData);
                if (error) throw error;
                toast.success('Factura creada');
            }

            setShowInvoiceModal(false);
            setSelectedInvoice(null);
            loadData();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    // Create/Update client
    const saveClient = async (clientData) => {
        try {
            if (selectedClient?.id) {
                const { error } = await supabase
                    .from('fiscal_clients')
                    .update(clientData)
                    .eq('id', selectedClient.id);
                if (error) throw error;
                toast.success('Cliente actualizado');
            } else {
                const { error } = await supabase
                    .from('fiscal_clients')
                    .insert(clientData);
                if (error) throw error;
                toast.success('Cliente fiscal creado');
            }

            setShowClientModal(false);
            setSelectedClient(null);
            loadData();
        } catch (err) {
            toast.error('Error: ' + err.message);
        }
    };

    // Update invoice status
    const updateInvoiceStatus = async (id, status) => {
        const updates = { status };
        if (status === 'sent') updates.sent_at = new Date().toISOString();
        if (status === 'cancelled') updates.cancelled_at = new Date().toISOString();

        const { error } = await supabase
            .from('invoices')
            .update(updates)
            .eq('id', id);

        if (error) {
            toast.error('Error actualizando');
        } else {
            toast.success('Estado actualizado');
            loadData();
        }
    };

    // Export to Excel
    const exportToExcel = () => {
        const data = activeTab === 'invoices'
            ? invoices.map(i => ({
                'Folio': i.invoice_number,
                'UUID CFDI': i.cfdi_uuid || '',
                'Cliente': i.fiscal_clients?.razon_social || '',
                'RFC': i.fiscal_clients?.rfc || '',
                'Subtotal': i.subtotal,
                'IVA': i.iva_amount,
                'Total': i.total,
                'Moneda': i.currency,
                'Estado': i.status,
                'Fecha': i.invoice_date ? new Date(i.invoice_date).toLocaleDateString() : ''
            }))
            : clients.map(c => ({
                'RFC': c.rfc || '',
                'Razón Social': c.razon_social || '',
                'Email': c.email,
                'Teléfono': c.contact_phone || '',
                'País': c.billing_country,
                'Código Postal': c.codigo_postal || '',
                'Régimen Fiscal': c.regimen_fiscal || ''
            }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeTab === 'invoices' ? 'Facturas' : 'Clientes');
        XLSX.writeFile(wb, `Fiscal_${activeTab}_${new Date().toISOString().split('T')[0]}.xlsx`);
        toast.success('Exportado a Excel');
    };

    const statusColors = {
        pending: 'bg-yellow-100 text-yellow-800',
        generated: 'bg-blue-100 text-blue-800',
        sent: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        refunded: 'bg-gray-100 text-gray-800'
    };

    const statusLabels = {
        pending: '⏳ Pendiente',
        generated: '📄 Generada',
        sent: '✅ Enviada',
        cancelled: '❌ Cancelada',
        refunded: '↩️ Reembolsada'
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                        <Receipt className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">🧾 Control Fiscal</h1>
                        <p className="text-gray-500">Facturas, CFDIs y datos fiscales</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { setSelectedInvoice(null); setShowInvoiceModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Factura
                    </button>
                    <button
                        onClick={() => { setSelectedClient(null); setShowClientModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Cliente Fiscal
                    </button>
                    <button
                        onClick={exportToExcel}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Exportar
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FileText className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.totalInvoices}</p>
                            <p className="text-xs text-gray-500">Total Facturas</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{stats.pendingInvoices}</p>
                            <p className="text-xs text-gray-500">Pendientes</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">${stats.totalRevenue.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Facturado</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Receipt className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">${stats.totalIva.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">IVA Trasladado</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b">
                <button
                    onClick={() => { setActiveTab('invoices'); setPage(1); }}
                    className={`pb-3 px-1 font-medium border-b-2 transition ${activeTab === 'invoices'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    📄 Facturas
                </button>
                <button
                    onClick={() => { setActiveTab('clients'); setPage(1); }}
                    className={`pb-3 px-1 font-medium border-b-2 transition ${activeTab === 'clients'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                >
                    👥 Clientes Fiscales
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder={activeTab === 'invoices' ? 'Buscar por folio o UUID...' : 'Buscar por RFC o razón social...'}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && loadData()}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    {activeTab === 'invoices' && (
                        <select
                            value={statusFilter}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="pending">⏳ Pendiente</option>
                            <option value="generated">📄 Generada</option>
                            <option value="sent">✅ Enviada</option>
                            <option value="cancelled">❌ Cancelada</option>
                        </select>
                    )}
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Buscar
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    </div>
                ) : activeTab === 'invoices' ? (
                    // INVOICES TABLE
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Folio</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">RFC</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {invoices.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                                            No hay facturas registradas
                                        </td>
                                    </tr>
                                ) : invoices.map(inv => (
                                    <tr key={inv.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm font-medium text-blue-600">{inv.invoice_number}</span>
                                            {inv.cfdi_uuid && (
                                                <p className="text-xs text-gray-400 truncate max-w-[150px]">{inv.cfdi_uuid}</p>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900 text-sm">{inv.fiscal_clients?.razon_social || 'N/A'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{inv.fiscal_clients?.rfc || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <p className="font-bold text-gray-900">${parseFloat(inv.total || 0).toLocaleString()}</p>
                                            <p className="text-xs text-gray-400">{inv.currency}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[inv.status]}`}>
                                                {statusLabels[inv.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {inv.status === 'pending' && (
                                                    <button
                                                        onClick={() => updateInvoiceStatus(inv.id, 'sent')}
                                                        className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                                                        title="Marcar como enviada"
                                                    >
                                                        <Send className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {inv.cfdi_pdf_url && (
                                                    <a
                                                        href={inv.cfdi_pdf_url}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                                                        title="Descargar PDF"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => { setSelectedInvoice(inv); setShowInvoiceModal(true); }}
                                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    // CLIENTS TABLE
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">RFC</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Razón Social</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">País</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Régimen</th>
                                    <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                                            No hay clientes fiscales registrados
                                        </td>
                                    </tr>
                                ) : clients.map(client => (
                                    <tr key={client.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <span className="font-mono text-sm font-medium">{client.rfc || '-'}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{client.razon_social || client.company_name || '-'}</p>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-blue-600">{client.email}</td>
                                        <td className="px-4 py-3 text-sm">
                                            {client.billing_country === 'MX' ? '🇲🇽 México' : `🌍 ${client.billing_country || 'N/A'}`}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{client.regimen_fiscal || '-'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => { setSelectedClient(client); setShowClientModal(true); }}
                                                className="p-1.5 text-gray-600 hover:bg-gray-100 rounded"
                                                title="Editar cliente"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-2 border rounded hover:bg-white disabled:opacity-50"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm">Página {page}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * pageSize >= totalCount}
                            className="p-2 border rounded hover:bg-white disabled:opacity-50"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* CLIENT MODAL */}
            {showClientModal && (
                <ClientModal
                    client={selectedClient}
                    onSave={saveClient}
                    onClose={() => { setShowClientModal(false); setSelectedClient(null); }}
                />
            )}

            {/* INVOICE MODAL */}
            {showInvoiceModal && (
                <InvoiceModal
                    invoice={selectedInvoice}
                    clients={clients}
                    onSave={saveInvoice}
                    onClose={() => { setShowInvoiceModal(false); setSelectedInvoice(null); }}
                />
            )}
        </div>
    );
};

// CLIENT FORM MODAL
const ClientModal = ({ client, onSave, onClose }) => {
    const [form, setForm] = useState({
        email: client?.email || '',
        rfc: client?.rfc || '',
        razon_social: client?.razon_social || '',
        regimen_fiscal: client?.regimen_fiscal || '',
        uso_cfdi: client?.uso_cfdi || 'G03',
        codigo_postal: client?.codigo_postal || '',
        billing_country: client?.billing_country || 'MX',
        billing_address: client?.billing_address || '',
        contact_name: client?.contact_name || '',
        contact_phone: client?.contact_phone || '',
        notes: client?.notes || ''
    });

    const regimenes = [
        { code: '601', name: 'General de Ley Personas Morales' },
        { code: '603', name: 'Personas Morales con Fines no Lucrativos' },
        { code: '605', name: 'Sueldos y Salarios' },
        { code: '606', name: 'Arrendamiento' },
        { code: '607', name: 'Régimen de Enajenación' },
        { code: '608', name: 'Demás ingresos' },
        { code: '610', name: 'Residentes en el Extranjero' },
        { code: '612', name: 'Personas Físicas con Actividades Empresariales' },
        { code: '614', name: 'Ingresos por Intereses' },
        { code: '616', name: 'Sin obligaciones fiscales' },
        { code: '620', name: 'Sociedades Cooperativas de Producción' },
        { code: '621', name: 'Incorporación Fiscal' },
        { code: '622', name: 'Actividades Agrícolas' },
        { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-xl font-bold">{client ? 'Editar Cliente Fiscal' : 'Nuevo Cliente Fiscal'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                                type="email"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                            <input
                                type="text"
                                value={form.rfc}
                                onChange={(e) => setForm({ ...form, rfc: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                                maxLength={13}
                                placeholder="XAXX010101000"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                        <input
                            type="text"
                            value={form.razon_social}
                            onChange={(e) => setForm({ ...form, razon_social: e.target.value.toUpperCase() })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Régimen Fiscal</label>
                            <select
                                value={form.regimen_fiscal}
                                onChange={(e) => setForm({ ...form, regimen_fiscal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {regimenes.map(r => (
                                    <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                            <input
                                type="text"
                                value={form.codigo_postal}
                                onChange={(e) => setForm({ ...form, codigo_postal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                maxLength={5}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">País</label>
                            <select
                                value={form.billing_country}
                                onChange={(e) => setForm({ ...form, billing_country: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="MX">🇲🇽 México</option>
                                <option value="US">🇺🇸 Estados Unidos</option>
                                <option value="ES">🇪🇸 España</option>
                                <option value="OTHER">🌍 Otro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                                type="tel"
                                value={form.contact_phone}
                                onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Dirección Fiscal</label>
                        <textarea
                            value={form.billing_address}
                            onChange={(e) => setForm({ ...form, billing_address: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={2}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notas internas</label>
                        <textarea
                            value={form.notes}
                            onChange={(e) => setForm({ ...form, notes: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            rows={2}
                        />
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!form.email}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

// INVOICE FORM MODAL
const InvoiceModal = ({ invoice, clients, onSave, onClose }) => {
    const [form, setForm] = useState({
        fiscal_client_id: invoice?.fiscal_client_id || '',
        invoice_number: invoice?.invoice_number || '',
        cfdi_uuid: invoice?.cfdi_uuid || '',
        subtotal: invoice?.subtotal || '',
        iva_rate: invoice?.iva_rate || 16,
        iva_amount: invoice?.iva_amount || '',
        total: invoice?.total || '',
        currency: invoice?.currency || 'MXN',
        status: invoice?.status || 'pending',
        invoice_date: invoice?.invoice_date ? invoice.invoice_date.split('T')[0] : new Date().toISOString().split('T')[0],
        cfdi_pdf_url: invoice?.cfdi_pdf_url || '',
        cfdi_xml_url: invoice?.cfdi_xml_url || '',
        concept: invoice?.concept || 'Servicios de publicidad digital',
        notes: invoice?.notes || ''
    });

    // Auto-calculate IVA and total
    useEffect(() => {
        const subtotal = parseFloat(form.subtotal) || 0;
        const ivaRate = parseFloat(form.iva_rate) || 0;
        const ivaAmount = subtotal * (ivaRate / 100);
        const total = subtotal + ivaAmount;
        setForm(prev => ({
            ...prev,
            iva_amount: ivaAmount.toFixed(2),
            total: total.toFixed(2)
        }));
    }, [form.subtotal, form.iva_rate]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-xl font-bold">{invoice ? 'Editar Factura' : 'Nueva Factura'}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente Fiscal</label>
                            <select
                                value={form.fiscal_client_id}
                                onChange={(e) => setForm({ ...form, fiscal_client_id: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar cliente...</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>
                                        {c.rfc ? `${c.rfc} - ` : ''}{c.razon_social || c.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                            <input
                                type="date"
                                value={form.invoice_date}
                                onChange={(e) => setForm({ ...form, invoice_date: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Folio</label>
                            <input
                                type="text"
                                value={form.invoice_number}
                                onChange={(e) => setForm({ ...form, invoice_number: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                                placeholder="Auto-generado"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UUID CFDI</label>
                            <input
                                type="text"
                                value={form.cfdi_uuid}
                                onChange={(e) => setForm({ ...form, cfdi_uuid: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal *</label>
                            <input
                                type="number"
                                value={form.subtotal}
                                onChange={(e) => setForm({ ...form, subtotal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                step="0.01"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IVA %</label>
                            <select
                                value={form.iva_rate}
                                onChange={(e) => setForm({ ...form, iva_rate: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="16">16%</option>
                                <option value="0">0% (Exportación)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IVA</label>
                            <input
                                type="text"
                                value={`$${form.iva_amount}`}
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                            <input
                                type="text"
                                value={`$${form.total}`}
                                readOnly
                                className="w-full px-3 py-2 border rounded-lg bg-gray-50 font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto</label>
                        <input
                            type="text"
                            value={form.concept}
                            onChange={(e) => setForm({ ...form, concept: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL PDF CFDI</label>
                            <input
                                type="url"
                                value={form.cfdi_pdf_url}
                                onChange={(e) => setForm({ ...form, cfdi_pdf_url: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="https://..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">URL XML CFDI</label>
                            <input
                                type="url"
                                value={form.cfdi_xml_url}
                                onChange={(e) => setForm({ ...form, cfdi_xml_url: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                        <select
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="pending">⏳ Pendiente</option>
                            <option value="generated">📄 Generada</option>
                            <option value="sent">✅ Enviada</option>
                            <option value="cancelled">❌ Cancelada</option>
                        </select>
                    </div>
                </div>
                <div className="p-6 border-t flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onSave(form)}
                        disabled={!form.subtotal}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FiscalManagement;
