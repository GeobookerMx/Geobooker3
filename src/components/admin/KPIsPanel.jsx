// KPIs Panel Component with real data
// src/components/admin/KPIsPanel.jsx

import React, { useState, useEffect } from 'react';
import { MessageCircle, Mail, RefreshCw, Loader2, TrendingUp, Users, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

// Helper para obtener fecha en zona horaria de México (UTC-6)
const getTodayMexico = () => {
    const now = new Date();
    const mexicoOffset = -6 * 60;
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mexicoTime = new Date(utcTime + (mexicoOffset * 60000));
    return mexicoTime.toISOString().split('T')[0];
};

const KPIsPanel = () => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        whatsapp: { today: 0, total: 0, national: 0, global: 0 },
        email: { today: 0, total: 0, pending: 0 }
    });

    useEffect(() => {
        loadKPIs();
    }, []);

    const loadKPIs = async () => {
        setLoading(true);
        const today = getTodayMexico();

        try {
            // WhatsApp Stats - from unified_whatsapp_outreach
            const { count: whatsappToday } = await supabase
                .from('unified_whatsapp_outreach')
                .select('*', { count: 'exact', head: true })
                .gte('sent_at', today);

            const { count: whatsappTotal } = await supabase
                .from('unified_whatsapp_outreach')
                .select('*', { count: 'exact', head: true });

            const { count: whatsappNational } = await supabase
                .from('unified_whatsapp_outreach')
                .select('*', { count: 'exact', head: true })
                .eq('source', 'scan_invite')
                .gte('sent_at', today);

            const { count: whatsappGlobal } = await supabase
                .from('unified_whatsapp_outreach')
                .select('*', { count: 'exact', head: true })
                .eq('source', 'apify')
                .gte('sent_at', today);

            // Email Stats - from campaign_history
            const { count: emailToday } = await supabase
                .from('campaign_history')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_type', 'email')
                .gte('sent_at', `${today}T00:00:00`);

            const { count: emailTotal } = await supabase
                .from('campaign_history')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_type', 'email');

            // Pending emails (contacts with email but not sent)
            const { count: emailPending } = await supabase
                .from('marketing_contacts')
                .select('*', { count: 'exact', head: true })
                .not('email', 'is', null)
                .neq('email', '')
                .or('email_status.is.null,email_status.neq.sent');

            setStats({
                whatsapp: {
                    today: whatsappToday || 0,
                    total: whatsappTotal || 0,
                    national: whatsappNational || 0,
                    global: whatsappGlobal || 0
                },
                email: {
                    today: emailToday || 0,
                    total: emailTotal || 0,
                    pending: emailPending || 0
                }
            });
        } catch (err) {
            console.error('Error loading KPIs:', err);
            toast.error('Error al cargar estadísticas');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with Refresh */}
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="w-6 h-6 text-blue-600" />
                    Estadísticas de Campaña
                </h2>
                <button
                    onClick={loadKPIs}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                    {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <RefreshCw className="w-4 h-4" />
                    )}
                    Actualizar
                </button>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* WhatsApp Stats */}
                <div className="bg-white rounded-xl p-6 border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-green-600" />
                        WhatsApp - Hoy ({getTodayMexico()})
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-3xl font-bold text-green-600">
                                {loading ? '...' : stats.whatsapp.today}
                            </p>
                            <p className="text-sm text-gray-600">Enviados Hoy</p>
                        </div>
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-600">
                                {loading ? '...' : stats.whatsapp.total}
                            </p>
                            <p className="text-sm text-gray-600">Total Histórico</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-xl font-bold text-emerald-600">
                                {loading ? '...' : `${stats.whatsapp.national}/10`}
                            </p>
                            <p className="text-xs text-gray-600">🇲🇽 Nacional</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-xl font-bold text-purple-600">
                                {loading ? '...' : `${stats.whatsapp.global}/10`}
                            </p>
                            <p className="text-xs text-gray-600">🌍 Global</p>
                        </div>
                    </div>
                </div>

                {/* Email Stats */}
                <div className="bg-white rounded-xl p-6 border shadow-sm">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-600" />
                        Email - Hoy ({getTodayMexico()})
                    </h3>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <p className="text-3xl font-bold text-blue-600">
                                {loading ? '...' : stats.email.today}
                            </p>
                            <p className="text-sm text-gray-600">Enviados</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                            <p className="text-3xl font-bold text-green-600">
                                {loading ? '...' : stats.email.total}
                            </p>
                            <p className="text-sm text-gray-600">Total</p>
                        </div>
                        <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <p className="text-3xl font-bold text-yellow-600">
                                {loading ? '...' : stats.email.pending.toLocaleString()}
                            </p>
                            <p className="text-sm text-gray-600">Pendientes</p>
                        </div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-sm text-blue-700">
                            <strong>Límite diario:</strong> 100 emails/día
                            <span className="ml-2">•</span>
                            <span className="ml-2">
                                <strong>Restantes:</strong> {Math.max(0, 100 - (stats.email.today || 0))}
                            </span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-80">WA Nacional</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.whatsapp.national}/10</p>
                </div>
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-80">WA Global</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.whatsapp.global}/10</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Mail className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-80">Emails Hoy</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.email.today}/100</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-5 h-5 opacity-80" />
                        <span className="text-xs opacity-80">Por Enviar</span>
                    </div>
                    <p className="text-2xl font-bold">{stats.email.pending.toLocaleString()}</p>
                </div>
            </div>

            {/* Info */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-800">
                    <strong>💡 Nota:</strong> Los contadores se reinician a medianoche hora México (UTC-6).
                    Las estadísticas se actualizan en tiempo real desde Supabase.
                </p>
            </div>
        </div>
    );
};

export default KPIsPanel;
