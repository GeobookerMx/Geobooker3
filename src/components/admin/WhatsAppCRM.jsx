// src/components/admin/WhatsAppCRM.jsx
/**
 * Panel dedicado para campañas de WhatsApp
 * - 20 contactos/día (10 Nacional Google Places + 10 Internacional Apify)
 * - KPIs separados por fuente
 * - Cola visual con botón "Abrir WhatsApp"
 */
import React, { useState, useEffect } from 'react';
import {
    MessageCircle, Play, Loader2, ExternalLink, RefreshCw,
    Users, Target, TrendingUp, Settings, CheckCircle, Phone, Globe
} from 'lucide-react';
import WhatsAppService from '../../services/whatsappService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const WhatsAppCRM = () => {
    // Estado
    const [queue, setQueue] = useState([]);
    const [stats, setStats] = useState({
        google_places: { sent: 0, limit: 10 },
        apify: { sent: 0, limit: 10 }
    });
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [config, setConfig] = useState({ gp_limit: 10, apify_limit: 10 });
    const [showConfig, setShowConfig] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadQueue(),
                loadStats(),
                loadConfig()
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const loadQueue = async () => {
        const { data, error } = await supabase
            .from('whatsapp_queue')
            .select(`
                *,
                marketing_contacts!inner (
                    company_name,
                    contact_name,
                    phone,
                    tier,
                    city,
                    source
                )
            `)
            .eq('status', 'pending')
            .order('priority', { ascending: false })
            .order('created_at', { ascending: true });

        if (!error) setQueue(data || []);
    };

    const loadStats = async () => {
        const { data } = await supabase.rpc('get_daily_campaign_stats');

        if (data) {
            const waStats = data.filter(s => s.channel === 'whatsapp');
            const newStats = {
                google_places: waStats.find(s => s.source === 'google_places') || { sent_today: 0, daily_limit: 10, remaining: 10 },
                apify: waStats.find(s => s.source === 'apify') || { sent_today: 0, daily_limit: 10, remaining: 10 }
            };
            setStats(newStats);
        }
    };

    const loadConfig = async () => {
        const { data } = await supabase
            .from('campaign_config')
            .select('*')
            .eq('channel', 'whatsapp');

        if (data) {
            const gpConfig = data.find(c => c.source === 'google_places');
            const apifyConfig = data.find(c => c.source === 'apify');
            setConfig({
                gp_limit: gpConfig?.daily_limit || 10,
                apify_limit: apifyConfig?.daily_limit || 10
            });
        }
    };

    const generateQueue = async () => {
        setIsGenerating(true);
        try {
            const { data, error } = await supabase.rpc('generate_whatsapp_queue_v2');

            if (error) throw error;

            if (data && data[0]) {
                const result = data[0];
                toast.success(`✅ Cola generada: ${result.csv_added} CSV + ${result.apify_added} Apify = ${result.total_added} total`);
            } else {
                toast.error('No se encontraron contactos disponibles');
            }

            await loadData();
        } catch (error) {
            console.error('Error:', error);
            toast.error('Error generando cola: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const openWhatsApp = async (item) => {
        const contact = item.marketing_contacts;
        const phone = contact.phone.replace(/\D/g, '');
        const tier = contact.tier;
        const source = item.source || contact.source;
        const isInternational = source === 'apify';

        const salutation = isInternational
            ? (contact.contact_name || 'there')
            : (contact.contact_name || 'Estimado/a');

        const companyName = isInternational
            ? (contact.company_name || 'your business')
            : (contact.company_name || 'su empresa');

        let message = '';

        if (isInternational) {
            // English Template for Apify/International leads
            message = tier === 'AAA' || tier === 'AA'
                ? `🌍 *GEOBOOKER* - Putting your business on the map

Hi ${salutation},

I'm Juan Pablo from *Geobooker*.

We've identified *${companyName}* as a leader in your industry.

I'd love to present how Geobooker can maximize your digital visibility and attract more customers worldwide.

🔗 *Learn more:* https://geobooker.com.mx

Would you have 10 minutes this week for a discovery call?

Best regards,
Juan Pablo
📍 Geobooker - Global Geolocation Directory`
                : `🌍 *GEOBOOKER* - Putting your business on the map

Hi ${salutation},

I'm Juan Pablo from *Geobooker*, the fastest-growing business geolocation platform.

*${companyName}* can benefit from our technology to significantly increase its reach.

🔗 *Visit:* https://geobooker.com.mx
📱 Or download our app

Are you interested in learning more?

Best regards,
Juan Pablo
📍 Geobooker - Global Geolocation Directory`;
        } else {
            // Spanish Template for National/CSV leads
            message = tier === 'AAA' || tier === 'AA'
                ? `🌍 *GEOBOOKER* - Ponemos tu negocio en el mapa

Hola ${salutation},

Soy Juan Pablo de *Geobooker*.

Hemos identificado a *${companyName}* como líder en su sector.

Me gustaría presentarle cómo Geobooker puede maximizar su visibilidad digital y atraer más clientes.

🔗 *Conoce más:* https://geobooker.com.mx

¿Tendría 10 minutos esta semana para una llamada?

Saludos,
Juan Pablo
📍 Geobooker - Directorio de Geolocalizaciones`
                : `🌍 *GEOBOOKER* - Ponemos tu negocio en el mapa

Hola ${salutation},

Soy Juan Pablo de *Geobooker*, plataforma de geolocalización de negocios.

*${companyName}* puede beneficiarse de nuestra tecnología para aumentar su visibilidad.

🔗 *Visita:* https://geobooker.com.mx
📱 O descarga nuestra app

¿Le interesa conocer más?

Saludos,
Juan Pablo
📍 Geobooker - Directorio de Geolocalizaciones`;
        }

        // Abrir WhatsApp
        WhatsAppService.openWhatsApp(phone, message);

        // Marcar como enviado
        try {
            await supabase.rpc('register_campaign_send', {
                p_channel: 'whatsapp',
                p_source: item.source || contact.source || 'csv',
                p_contact_id: item.contact_id
            });

            await supabase
                .from('whatsapp_queue')
                .update({ status: 'sent', sent_at: new Date().toISOString() })
                .eq('id', item.id);

            toast.success(`✓ Enviado a ${companyName}`);
            await loadData();
        } catch (error) {
            console.error('Error registrando envío:', error);
        }
    };

    const saveConfig = async () => {
        try {
            await supabase
                .from('campaign_config')
                .update({ daily_limit: config.gp_limit })
                .eq('channel', 'whatsapp')
                .eq('source', 'google_places');

            await supabase
                .from('campaign_config')
                .update({ daily_limit: config.apify_limit })
                .eq('channel', 'whatsapp')
                .eq('source', 'apify');

            toast.success('Configuración guardada');
            setShowConfig(false);
            loadStats();
        } catch (error) {
            toast.error('Error guardando');
        }
    };

    // Saltar contacto (remover de cola sin enviar) + regenerar
    const skipFromQueue = async (item) => {
        try {
            await supabase
                .from('whatsapp_queue')
                .update({ status: 'skipped' })
                .eq('id', item.id);

            toast('Contacto saltado, agregando reemplazo...', { icon: '⏭️' });
            // Regenerar para llenar el espacio
            await generateQueue();
        } catch (error) {
            toast.error('Error al saltar');
        }
    };

    // Blacklist contacto (bloquear permanentemente) + regenerar
    const blacklistContact = async (item) => {
        if (!confirm(`¿Bloquear permanentemente a "${item.marketing_contacts?.company_name}"?`)) return;

        try {
            // Remover de cola
            await supabase
                .from('whatsapp_queue')
                .update({ status: 'blacklisted' })
                .eq('id', item.id);

            // Marcar contacto como blacklisted
            await supabase
                .from('marketing_contacts')
                .update({ whatsapp_status: 'blacklisted' })
                .eq('id', item.contact_id);

            toast.success('Contacto bloqueado, agregando reemplazo...');
            // Regenerar para llenar el espacio
            await generateQueue();
        } catch (error) {
            toast.error('Error al bloquear');
        }
    };

    // Limpiar contactos ya enviados + regenerar cola completa
    const clearSentContacts = async () => {
        const sentCount = queue.filter(q => q.status === 'sent').length;
        if (sentCount === 0) {
            toast('No hay contactos enviados para limpiar', { icon: 'ℹ️' });
            return;
        }
        if (!confirm(`¿Limpiar ${sentCount} contactos ya enviados y generar nuevos?`)) return;

        try {
            await supabase
                .from('whatsapp_queue')
                .delete()
                .eq('status', 'sent');

            toast.success(`${sentCount} eliminados, generando nuevos...`);
            // Regenerar cola completa
            await generateQueue();
        } catch (error) {
            toast.error('Error al limpiar');
        }
    };

    const getTierBadge = (tier) => {
        const colors = {
            'AAA': 'bg-yellow-100 text-yellow-800 border-yellow-300',
            'AA': 'bg-purple-100 text-purple-800 border-purple-300',
            'A': 'bg-blue-100 text-blue-800 border-blue-300',
            'B': 'bg-gray-100 text-gray-800 border-gray-300'
        };
        return colors[tier] || colors['B'];
    };

    const totalSent = (stats.google_places?.sent_today || 0) + (stats.apify?.sent_today || 0);
    // HARD LIMIT: Maximum 20 WhatsApp per day to avoid spam
    const MAX_WHATSAPP_DAILY = 20;
    const totalLimit = Math.min(config.gp_limit + config.apify_limit, MAX_WHATSAPP_DAILY);
    const progress = Math.round((totalSent / totalLimit) * 100);
    const isOverLimit = (config.gp_limit + config.apify_limit) > MAX_WHATSAPP_DAILY;

    return (
        <div className="space-y-6">
            {/* Header con KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total del día */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <MessageCircle className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Hoy</span>
                    </div>
                    <p className="text-3xl font-bold">{totalSent}/{totalLimit}</p>
                    <div className="mt-2 bg-white/20 rounded-full h-2">
                        <div
                            className="bg-white rounded-full h-2 transition-all"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Nacional (Google Places) Stats */}
                <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">🇲🇽 Nacional</span>
                    </div>
                    <p className="text-2xl font-bold text-green-600">
                        {stats.google_places?.sent_today || 0}/{config.gp_limit}
                    </p>
                    <p className="text-sm text-gray-500">
                        Quedan: {stats.google_places?.remaining ?? config.gp_limit}
                    </p>
                </div>

                {/* Internacional (Apify) Stats */}
                <div className="bg-white rounded-xl p-5 border-2 border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <span className="font-medium text-gray-700">🌍 Internacional</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-600">
                        {stats.apify?.sent_today || 0}/{config.apify_limit}
                    </p>
                    <p className="text-sm text-gray-500">
                        Quedan: {stats.apify?.remaining ?? config.apify_limit}
                    </p>
                </div>

                {/* Cola Pendiente */}
                <div className="bg-white rounded-xl p-5 border-2 border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <Target className="w-5 h-5 text-gray-500" />
                        <span className="font-medium text-gray-700">En Cola</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">{queue.length}</p>
                    <p className="text-sm text-gray-500">Pendientes de enviar</p>
                </div>
            </div>

            {/* Acciones */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">📱 Generar Cola WhatsApp</h3>
                        <p className="text-sm text-gray-600">
                            Se seleccionarán {config.gp_limit} nacional + {config.apify_limit} internacional
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowConfig(!showConfig)}
                            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Settings className="w-4 h-4" />
                            Config
                        </button>
                        <button
                            onClick={generateQueue}
                            disabled={isGenerating || queue.length >= totalLimit}
                            className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isGenerating ? (
                                <><Loader2 className="w-5 h-5 animate-spin" /> Generando...</>
                            ) : (
                                <><Play className="w-5 h-5" /> Generar Cola</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Config Panel */}
                {showConfig && (
                    <div className="mt-4 pt-4 border-t border-green-200">
                        {isOverLimit && (
                            <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                                ⚠️ <strong>Límite excedido:</strong> El total no puede superar 20/día para evitar spam.
                                El sistema usará máximo 20.
                            </div>
                        )}
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">🇲🇽 Nacional/día (máx 20)</label>
                                <input
                                    type="number"
                                    value={config.gp_limit}
                                    onChange={(e) => setConfig(c => ({ ...c, gp_limit: Math.min(parseInt(e.target.value) || 0, 20) }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="0"
                                    max="20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">🌍 Internacional/día (máx 20)</label>
                                <input
                                    type="number"
                                    value={config.apify_limit}
                                    onChange={(e) => setConfig(c => ({ ...c, apify_limit: Math.min(parseInt(e.target.value) || 0, 20) }))}
                                    className="w-full px-3 py-2 border rounded-lg"
                                    min="0"
                                    max="20"
                                />
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={saveConfig}
                                    className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Total actual: {config.gp_limit + config.apify_limit} → Se usará: {totalLimit}
                        </p>
                    </div>
                )}
            </div>

            {/* Cola de WhatsApp */}
            <div className="bg-white rounded-xl border shadow-sm">
                <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
                    <h3 className="font-bold text-gray-900">
                        📋 Cola de Envío ({queue.length})
                    </h3>
                    <div className="flex gap-2">
                        <button
                            onClick={clearSentContacts}
                            className="text-sm text-red-600 hover:text-red-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
                        >
                            🗑️ Limpiar Enviados
                        </button>
                        <button
                            onClick={loadData}
                            disabled={isLoading}
                            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            Actualizar
                        </button>
                    </div>
                </div>

                <div className="divide-y max-h-[400px] overflow-y-auto">
                    {queue.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="font-medium">No hay contactos en cola</p>
                            <p className="text-sm">Click en "Generar Cola" para comenzar</p>
                        </div>
                    ) : (
                        queue.map((item) => {
                            const contact = item.marketing_contacts;
                            const isInvalidPhone = contact?.phone?.includes('800') || contact?.phone?.startsWith('+521800');
                            return (
                                <div key={item.id} className={`p-4 hover:bg-gray-50 transition-colors ${isInvalidPhone ? 'bg-red-50' : ''}`}>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <h4 className="font-semibold text-gray-900">
                                                    {contact.company_name}
                                                </h4>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getTierBadge(contact.tier)}`}>
                                                    {contact.tier}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded ${item.source === 'apify' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {item.source === 'apify' ? '🌍 Internacional' : '🇲🇽 Nacional'}
                                                </span>
                                                {isInvalidPhone && (
                                                    <span className="text-xs px-2 py-0.5 rounded bg-red-200 text-red-800">
                                                        ⚠️ Número inválido
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {contact.contact_name || 'Sin nombre'}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-2">
                                                <Phone className="w-3 h-3" />
                                                {contact.phone}
                                                {contact.city && ` • 📍 ${contact.city}`}
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => skipFromQueue(item)}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                                                title="Saltar (remover de cola)"
                                            >
                                                ⏭️
                                            </button>
                                            <button
                                                onClick={() => blacklistContact(item)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Bloquear permanentemente"
                                            >
                                                🚫
                                            </button>
                                            <button
                                                onClick={() => openWhatsApp(item)}
                                                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2 whitespace-nowrap"
                                            >
                                                <ExternalLink className="w-4 h-4" />
                                                Abrir WA
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 text-sm">
                <p className="font-medium text-blue-900 mb-2">💡 Flujo de trabajo:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-800">
                    <li><b>Generar Cola</b> → 10 🇲🇽 Nacional (Scan Local) + 10 🌍 Internacional (Apify)</li>
                    <li><b>Abrir WA</b> → Abre WhatsApp Web con mensaje pre-llenado</li>
                    <li><b>Enviar manualmente</b> → Tú decides si envías (puedes editar)</li>
                    <li>El sistema registra el envío y actualiza las estadísticas</li>
                </ol>
            </div>
        </div>
    );
};

export default WhatsAppCRM;
