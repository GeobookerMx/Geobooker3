// src/pages/admin/LeadsHistory.jsx
import React, { useState, useEffect } from 'react';
import {
    Database, Search, Download, Trash2, ExternalLink,
    Filter, Calendar, MapPin, Building2, Loader2,
    MessageCircle, ChevronLeft, ChevronRight, Phone,
    Mail, Check, Users, Star, BarChart3
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { Link } from 'react-router-dom';

const LeadsHistory = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLocation, setSelectedLocation] = useState('');
    const [selectedTier, setSelectedTier] = useState('');
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [stats, setStats] = useState({ total: 0, withPhone: 0, withEmail: 0, contacted: 0 });
    const [exportingAll, setExportingAll] = useState(false);
    const pageSize = 50;

    // WhatsApp config
    const [whatsappMessage, setWhatsappMessage] = useState(
        '¡Hola! Vi tu perfil en Geobooker y me gustaría platicar sobre cómo podemos ayudarte a crecer. ¿Tienes unos minutos?'
    );

    useEffect(() => {
        fetchLeads();
        fetchStats();
    }, [page, selectedLocation, selectedTier]);

    const fetchStats = async () => {
        try {
            const { data, error, count } = await supabase
                .from('scraping_history')
                .select('phone, email, contacted_via', { count: 'exact' });

            if (error) throw error;

            const withPhone = data.filter(d => d.phone).length;
            const withEmail = data.filter(d => d.email).length;
            const contacted = data.filter(d => d.contacted_via).length;

            setStats({
                total: count || 0,
                withPhone,
                withEmail,
                contacted
            });
        } catch (err) {
            console.error('Error fetching stats:', err);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('scraping_history')
                .select('*', { count: 'exact' });

            if (selectedLocation) {
                query = query.ilike('search_location', `%${selectedLocation}%`);
            }

            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
            }

            if (selectedTier) {
                query = query.eq('tier', selectedTier);
            }

            const { data, error, count } = await query
                .order('scraped_at', { ascending: false })
                .range((page - 1) * pageSize, page * pageSize - 1);

            if (error) throw error;
            setLeads(data || []);
            setTotalCount(count || 0);
        } catch (err) {
            console.error('Error fetching leads history:', err);
            toast.error('Error al cargar el historial');
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1);
        fetchLeads();
    };

    // Exportar TODOS los leads (no solo la página visible)
    const exportAllToExcel = async () => {
        setExportingAll(true);
        try {
            // Fetch ALL data without pagination
            let query = supabase
                .from('scraping_history')
                .select('*');

            if (selectedLocation) {
                query = query.ilike('search_location', `%${selectedLocation}%`);
            }
            if (searchTerm) {
                query = query.or(`name.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`);
            }
            if (selectedTier) {
                query = query.eq('tier', selectedTier);
            }

            const { data, error } = await query.order('scraped_at', { ascending: false });

            if (error) throw error;
            if (!data || data.length === 0) {
                toast.error('No hay datos para exportar');
                return;
            }

            const excelData = data.map(lead => ({
                'Nombre': lead.name || '',
                'Teléfono': lead.phone || '',
                'Email': lead.email || '',
                'Website': lead.website || '',
                'Dirección': lead.address || '',
                'Ciudad': lead.city || '',
                'Categoría': lead.category || '',
                'Tier': lead.tier || 'B',
                'Rating': lead.rating || '',
                'Reviews': lead.review_count || '',
                'Contactado': lead.contacted_via || 'No',
                'Búsqueda': lead.search_query || '',
                'Ubicación Búsqueda': lead.search_location || '',
                'Fecha Scrape': new Date(lead.scraped_at).toLocaleDateString(),
                'Google Maps': lead.google_maps_url || ''
            }));

            const worksheet = XLSX.utils.json_to_sheet(excelData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Todos los Leads');

            const fileName = `Leads_x_Scrapping_COMPLETO_${new Date().toISOString().split('T')[0]}.xlsx`;
            XLSX.writeFile(workbook, fileName);
            toast.success(`📥 ${data.length} leads exportados a Excel`);
        } catch (err) {
            console.error('Error exporting all:', err);
            toast.error('Error al exportar');
        } finally {
            setExportingAll(false);
        }
    };

    // Abrir WhatsApp con el lead
    const openWhatsApp = async (lead) => {
        if (!lead.phone) {
            toast.error('Este lead no tiene teléfono');
            return;
        }

        const phone = lead.phone.replace(/\D/g, '');
        const message = encodeURIComponent(whatsappMessage);
        window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

        // Marcar como contactado
        await markAsContacted(lead.id, 'whatsapp');
        toast.success('WhatsApp abierto y lead marcado como contactado');
    };

    // Marcar lead como contactado
    const markAsContacted = async (id, via = 'manual') => {
        try {
            const { error } = await supabase
                .from('scraping_history')
                .update({ contacted_via: via })
                .eq('id', id);

            if (error) throw error;

            setLeads(leads.map(l =>
                l.id === id ? { ...l, contacted_via: via } : l
            ));
            fetchStats(); // Actualizar estadísticas
        } catch (err) {
            console.error('Error marking as contacted:', err);
        }
    };

    const deleteLead = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este lead del historial?')) return;

        try {
            const { error } = await supabase
                .from('scraping_history')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setLeads(leads.filter(l => l.id !== id));
            toast.success('Lead eliminado');
            fetchStats();
        } catch (err) {
            toast.error('Error al eliminar');
        }
    };

    const tierColors = {
        'AAA': 'bg-yellow-100 text-yellow-800 border-yellow-300',
        'AA': 'bg-purple-100 text-purple-800 border-purple-300',
        'A': 'bg-blue-100 text-blue-800 border-blue-300',
        'B': 'bg-gray-100 text-gray-600 border-gray-300'
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-xl shadow-lg">
                        <Database className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">📂 Leads x Scrapping</h1>
                        <p className="text-gray-500">Historial completo de negocios recolectados</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/admin/scraper"
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition"
                    >
                        Nueva Búsqueda
                    </Link>
                    <button
                        onClick={exportAllToExcel}
                        disabled={exportingAll}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm transition disabled:opacity-50"
                    >
                        {exportingAll ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Exportar TODO ({stats.total})
                    </button>
                </div>
            </div>

            {/* Stats Panel */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <Users className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.total.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Total Leads</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Phone className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.withPhone.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Con Teléfono</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Mail className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.withEmail.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Con Email</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Check className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900">{stats.contacted.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">Contactados</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl border shadow-sm mb-6">
                <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o categoría..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Filtrar por ubicación..."
                            value={selectedLocation}
                            onChange={(e) => setSelectedLocation(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <Star className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <select
                            value={selectedTier}
                            onChange={(e) => { setSelectedTier(e.target.value); setPage(1); }}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                        >
                            <option value="">Todos los Tiers</option>
                            <option value="AAA">⭐ AAA - Premium (+500 reviews)</option>
                            <option value="AA">🔥 AA - Alto (+100 reviews)</option>
                            <option value="A">✅ A - Medio (+20 reviews)</option>
                            <option value="B">📋 B - Básico</option>
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                        Aplicar Filtros
                    </button>
                </form>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Negocio</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Tier</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Contacto</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="5" className="px-4 py-4 bg-gray-50/50"></td>
                                    </tr>
                                ))
                            ) : leads.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-4 py-12 text-center text-gray-500 italic">
                                        No se encontraron leads en el historial.
                                    </td>
                                </tr>
                            ) : leads.map((lead) => (
                                <tr key={lead.id} className={`hover:bg-gray-50 transition-colors ${lead.contacted_via ? 'bg-green-50/30' : ''}`}>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                                                <Building2 className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{lead.name}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-[180px]">{lead.address || lead.search_location}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-bold rounded border ${tierColors[lead.tier] || tierColors['B']}`}>
                                            {lead.tier || 'B'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                        {lead.phone && <p className="text-gray-700">{lead.phone}</p>}
                                        {lead.email && <p className="text-blue-600 text-xs truncate max-w-[150px]">{lead.email}</p>}
                                        {!lead.phone && !lead.email && <span className="text-gray-400 italic text-xs">Sin datos</span>}
                                    </td>
                                    <td className="px-4 py-3">
                                        {lead.contacted_via ? (
                                            <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                                                <Check className="w-3 h-3" />
                                                {lead.contacted_via === 'whatsapp' ? 'WhatsApp' : 'Contactado'}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400">Pendiente</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {lead.phone && (
                                                <button
                                                    onClick={() => openWhatsApp(lead)}
                                                    className="p-1.5 text-green-500 hover:bg-green-50 rounded transition"
                                                    title="Enviar WhatsApp"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                            {lead.google_maps_url && (
                                                <a
                                                    href={lead.google_maps_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 text-gray-400 hover:text-red-500 transition"
                                                    title="Ver en Maps"
                                                >
                                                    <MapPin className="w-4 h-4" />
                                                </a>
                                            )}
                                            {!lead.contacted_via && (
                                                <button
                                                    onClick={() => markAsContacted(lead.id, 'manual')}
                                                    className="p-1.5 text-gray-400 hover:text-green-600 transition"
                                                    title="Marcar como contactado"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteLead(lead.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 transition"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                        Mostrando <span className="font-medium">{(page - 1) * pageSize + 1}</span> a <span className="font-medium">{Math.min(page * pageSize, totalCount)}</span> de <span className="font-medium">{totalCount}</span>
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="p-2 border rounded hover:bg-white disabled:opacity-50 transition"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-sm text-gray-600">Página {page}</span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page * pageSize >= totalCount || loading}
                            className="p-2 border rounded hover:bg-white disabled:opacity-50 transition"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadsHistory;
