// src/pages/admin/ScanInvitePage.jsx
/**
 * Scan & Invite - Herramienta de captura de leads
 * Solo para administradores
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Search, MapPin, Phone, Mail, Globe, ExternalLink,
    Play, Pause, CheckCircle, XCircle, MessageCircle,
    Filter, RefreshCw, Ban, Clock, Users, Building2
} from 'lucide-react';

const ScanInvitePage = () => {
    // Estados
    const [scanning, setScanning] = useState(false);
    const [scanStatus, setScanStatus] = useState('idle'); // idle, scanning, paused, done
    const [leads, setLeads] = useState([]);
    const [stats, setStats] = useState({ total: 0, new: 0, contacted: 0, today: 0 });
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [dailyLimit, setDailyLimit] = useState(20);
    const [dailyCount, setDailyCount] = useState(0);

    // Filtros
    const [filters, setFilters] = useState({
        contactType: 'all', // all, phone, email
        status: 'all', // all, new, contacted, etc.
        category: 'all'
    });

    // Mensaje de WhatsApp precargado
    const whatsappMessage = `Hola 👋 Soy del equipo de Geobooker. Estamos sumando negocios para que la gente los encuentre cerca de ellos en minutos (WhatsApp, llamadas y rutas).
¿Te puedo mandar info rápida? Si prefieres que no te contacte, dime NO y listo.`;

    // Cargar datos iniciales
    useEffect(() => {
        loadLeads();
        loadStats();
        getUserLocation();
    }, []);

    // Obtener ubicación del usuario
    const getUserLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (error) => {
                    console.error('Error obteniendo ubicación:', error);
                    toast.error('No se pudo obtener tu ubicación');
                }
            );
        }
    };

    // Cargar leads de la base de datos
    const loadLeads = async () => {
        try {
            const { data, error } = await supabase
                .from('scan_leads')
                .select(`
          *,
          scan_lead_contacts (*),
          scan_outreach (*)
        `)
                .order('captured_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLeads(data || []);
        } catch (error) {
            console.error('Error cargando leads:', error);
        } finally {
            setLoading(false);
        }
    };

    // Cargar estadísticas
    const loadStats = async () => {
        try {
            // Total leads
            const { count: total } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true });

            // Nuevos (sin contactar)
            const { count: newCount } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'new');

            // Contactados
            const { count: contacted } = await supabase
                .from('scan_leads')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'contacted');

            // Invitaciones hoy
            const today = new Date().toISOString().split('T')[0];
            const { count: todayCount } = await supabase
                .from('scan_outreach')
                .select('*', { count: 'exact', head: true })
                .gte('attempted_at', today);

            setStats({
                total: total || 0,
                new: newCount || 0,
                contacted: contacted || 0,
                today: todayCount || 0
            });
            setDailyCount(todayCount || 0);
        } catch (error) {
            console.error('Error cargando stats:', error);
        }
    };

    // Iniciar escaneo (simulado por ahora - requiere API de Google Places)
    const startScan = async () => {
        if (!userLocation) {
            toast.error('Primero necesito tu ubicación');
            getUserLocation();
            return;
        }

        setScanning(true);
        setScanStatus('scanning');
        toast.success('Escaneo iniciado en 3km de radio');

        // Crear registro de scan
        try {
            const { data: scanRun, error } = await supabase
                .from('scan_runs')
                .insert({
                    user_id: (await supabase.auth.getUser()).data.user.id,
                    latitude: userLocation.lat,
                    longitude: userLocation.lng,
                    radius_km: 3,
                    status: 'running'
                })
                .select()
                .single();

            if (error) throw error;

            // Aquí iría la lógica de Google Places API
            // Por ahora simulamos con un timeout
            setTimeout(() => {
                setScanStatus('done');
                setScanning(false);
                toast.success('Escaneo completado');
                loadLeads();
                loadStats();
            }, 3000);

        } catch (error) {
            console.error('Error en scan:', error);
            toast.error('Error al iniciar escaneo');
            setScanning(false);
            setScanStatus('idle');
        }
    };

    // Pausar escaneo
    const pauseScan = () => {
        setScanning(false);
        setScanStatus('paused');
        toast('Escaneo pausado', { icon: '⏸️' });
    };

    // Enviar invitación por WhatsApp
    const sendWhatsAppInvite = async (lead, contact) => {
        if (dailyCount >= dailyLimit) {
            toast.error(`Límite diario alcanzado (${dailyLimit} invitaciones)`);
            return;
        }

        const phone = contact.normalized_value || contact.value;
        const cleanPhone = phone.replace(/\D/g, '');
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`;

        // Registrar intento
        try {
            await supabase.from('scan_outreach').insert({
                lead_id: lead.id,
                contact_id: contact.id,
                user_id: (await supabase.auth.getUser()).data.user.id,
                channel: 'whatsapp',
                message_template: whatsappMessage,
                status: 'sent'
            });

            // Actualizar estado del lead
            await supabase
                .from('scan_leads')
                .update({ status: 'contacted', updated_at: new Date().toISOString() })
                .eq('id', lead.id);

            // Abrir WhatsApp
            window.open(whatsappUrl, '_blank');

            toast.success('WhatsApp abierto - ¡Envía el mensaje!');
            loadStats();
            loadLeads();
        } catch (error) {
            console.error('Error registrando outreach:', error);
        }
    };

    // Agregar a blacklist
    const addToBlacklist = async (lead) => {
        try {
            const phoneContact = lead.scan_lead_contacts?.find(c => c.type === 'phone');

            await supabase.from('scan_blacklist').insert({
                place_id: lead.place_id,
                phone: phoneContact?.value,
                reason: 'No contactar - marcado manualmente',
                added_by: (await supabase.auth.getUser()).data.user.id
            });

            await supabase
                .from('scan_leads')
                .update({ status: 'blacklisted' })
                .eq('id', lead.id);

            toast.success('Agregado a lista de no contactar');
            loadLeads();
        } catch (error) {
            console.error('Error en blacklist:', error);
            toast.error('Error al agregar a blacklist');
        }
    };

    // Filtrar leads
    const filteredLeads = leads.filter(lead => {
        if (filters.status !== 'all' && lead.status !== filters.status) return false;
        if (filters.contactType === 'phone') {
            return lead.scan_lead_contacts?.some(c => c.type === 'phone');
        }
        if (filters.contactType === 'email') {
            return lead.scan_lead_contacts?.some(c => c.type === 'email');
        }
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <Search className="w-8 h-8 text-blue-600" />
                        Scan & Invite
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Captura leads de negocios cercanos y envía invitaciones por WhatsApp
                    </p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg">
                                <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.total}</p>
                                <p className="text-sm text-gray-500">Total Leads</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg">
                                <Users className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.new}</p>
                                <p className="text-sm text-gray-500">Nuevos</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg">
                                <MessageCircle className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.contacted}</p>
                                <p className="text-sm text-gray-500">Contactados</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-100 rounded-lg">
                                <Clock className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{dailyCount}/{dailyLimit}</p>
                                <p className="text-sm text-gray-500">Hoy</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Control Panel */}
                <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                        {/* Location */}
                        <div className="flex items-center gap-3">
                            <MapPin className="w-5 h-5 text-red-500" />
                            <span className="text-gray-700">
                                {userLocation
                                    ? `📍 ${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`
                                    : 'Obteniendo ubicación...'
                                }
                            </span>
                            <button
                                onClick={getUserLocation}
                                className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Scan Button */}
                        <button
                            onClick={scanning ? pauseScan : startScan}
                            disabled={!userLocation}
                            className={`
                flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all
                ${scanning
                                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white'
                                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
                        >
                            {scanning ? (
                                <>
                                    <Pause className="w-6 h-6" />
                                    Pausar Escaneo
                                </>
                            ) : (
                                <>
                                    <Play className="w-6 h-6" />
                                    SCAN NOW (3 km)
                                </>
                            )}
                        </button>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                            <span className={`
                px-3 py-1 rounded-full text-sm font-medium
                ${scanStatus === 'idle' ? 'bg-gray-100 text-gray-600' : ''}
                ${scanStatus === 'scanning' ? 'bg-blue-100 text-blue-600 animate-pulse' : ''}
                ${scanStatus === 'paused' ? 'bg-orange-100 text-orange-600' : ''}
                ${scanStatus === 'done' ? 'bg-green-100 text-green-600' : ''}
              `}>
                                {scanStatus === 'idle' && '⚪ Listo'}
                                {scanStatus === 'scanning' && '🔵 Escaneando...'}
                                {scanStatus === 'paused' && '🟠 Pausado'}
                                {scanStatus === 'done' && '🟢 Completado'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Filtros:</span>
                        </div>

                        <select
                            value={filters.contactType}
                            onChange={(e) => setFilters({ ...filters, contactType: e.target.value })}
                            className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                            <option value="all">Todos los contactos</option>
                            <option value="phone">Solo teléfonos</option>
                            <option value="email">Solo emails</option>
                        </select>

                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="px-3 py-1.5 border rounded-lg text-sm"
                        >
                            <option value="all">Todos los estados</option>
                            <option value="new">🆕 Nuevos</option>
                            <option value="contacted">📞 Contactados</option>
                            <option value="replied">✅ Respondieron</option>
                            <option value="not_interested">❌ No interesados</option>
                            <option value="converted">🎉 Convertidos</option>
                        </select>

                        <button
                            onClick={() => { loadLeads(); loadStats(); }}
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Actualizar
                        </button>
                    </div>
                </div>

                {/* Leads Table */}
                <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Negocio</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Categoría</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Contacto</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Distancia</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Estado</th>
                                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            Cargando leads...
                                        </td>
                                    </tr>
                                ) : filteredLeads.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-4 py-8 text-center text-gray-500">
                                            No hay leads aún. ¡Inicia un escaneo!
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLeads.map((lead) => {
                                        const phoneContact = lead.scan_lead_contacts?.find(c => c.type === 'phone');
                                        const emailContact = lead.scan_lead_contacts?.find(c => c.type === 'email');

                                        return (
                                            <tr key={lead.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-gray-900">{lead.name}</p>
                                                        <p className="text-sm text-gray-500 truncate max-w-xs">{lead.address}</p>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">{lead.category || '-'}</span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col gap-1">
                                                        {phoneContact && (
                                                            <span className="flex items-center gap-1 text-sm">
                                                                <Phone className="w-3 h-3" /> {phoneContact.value}
                                                            </span>
                                                        )}
                                                        {emailContact && (
                                                            <span className="flex items-center gap-1 text-sm text-gray-500">
                                                                <Mail className="w-3 h-3" /> {emailContact.value}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-gray-600">
                                                        {lead.distance_km ? `${lead.distance_km} km` : '-'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`
                            px-2 py-1 rounded-full text-xs font-medium
                            ${lead.status === 'new' ? 'bg-blue-100 text-blue-700' : ''}
                            ${lead.status === 'contacted' ? 'bg-yellow-100 text-yellow-700' : ''}
                            ${lead.status === 'replied' ? 'bg-green-100 text-green-700' : ''}
                            ${lead.status === 'converted' ? 'bg-purple-100 text-purple-700' : ''}
                            ${lead.status === 'blacklisted' ? 'bg-red-100 text-red-700' : ''}
                          `}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {phoneContact && lead.status !== 'blacklisted' && (
                                                            <button
                                                                onClick={() => sendWhatsAppInvite(lead, phoneContact)}
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition"
                                                                title="Invitar por WhatsApp"
                                                            >
                                                                <MessageCircle className="w-4 h-4" />
                                                                WhatsApp
                                                            </button>
                                                        )}
                                                        {lead.google_maps_url && (
                                                            <a
                                                                href={lead.google_maps_url}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-1.5 text-gray-500 hover:text-blue-600 transition"
                                                                title="Ver en Google Maps"
                                                            >
                                                                <ExternalLink className="w-4 h-4" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => addToBlacklist(lead)}
                                                            className="p-1.5 text-gray-400 hover:text-red-600 transition"
                                                            title="No contactar"
                                                        >
                                                            <Ban className="w-4 h-4" />
                                                        </button>
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

                {/* Info Box */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">📋 Notas importantes:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• El escaneo usa Google Places API (requiere API Key configurada)</li>
                        <li>• Límite diario: {dailyLimit} invitaciones por WhatsApp</li>
                        <li>• Los mensajes se envían manualmente - tú presionas "Enviar" en WhatsApp</li>
                        <li>• Usa "No contactar" para agregar a la lista negra</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ScanInvitePage;
