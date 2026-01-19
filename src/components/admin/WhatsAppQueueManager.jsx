// Component para gestionar envíos semi-automáticos de WhatsApp
// src/components/admin/WhatsAppQueueManager.jsx

import React, { useState, useEffect } from 'react';
import { MessageCircle, Play, Loader2, CheckCircle, ExternalLink, Clock, Users } from 'lucide-react';
import WhatsAppService from '../../services/whatsappService';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const WhatsAppQueueManager = () => {
    const [queue, setQueue] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [dailyLimit, setDailyLimit] = useState(20);
    const [tierFilter, setTierFilter] = useState('all');
    const [sentToday, setSentToday] = useState(0);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        loadQueue();
        loadStats();
    }, []);

    const loadQueue = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('whatsapp_queue')
                .select(`
                    *,
                    marketing_contacts!inner (
                        company_name,
                        contact_name,
                        phone,
                        tier,
                        city
                    )
                `)
                .eq('status', 'pending')
                .order('priority', { ascending: false })
                .order('created_at', { ascending: true })
                .limit(50);

            if (error) throw error;
            setQueue(data || []);
        } catch (error) {
            console.error('Error loading queue:', error);
            toast.error('Error al cargar cola');
        } finally {
            setIsLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            // Función para obtener fecha en zona horaria de México (UTC-6)
            const getTodayMexico = () => {
                const now = new Date();
                const mexicoOffset = -6 * 60;
                const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
                const mexicoTime = new Date(utcTime + (mexicoOffset * 60000));
                return mexicoTime.toISOString().split('T')[0];
            };
            const today = getTodayMexico();
            const { count } = await supabase
                .from('campaign_history')
                .select('*', { count: 'exact', head: true })
                .eq('campaign_type', 'whatsapp')
                .gte('sent_at', `${today}T00:00:00`);

            setSentToday(count || 0);

            // Stats de contactos disponibles
            const { data: statsData } = await supabase
                .from('marketing_contacts')
                .select('tier, whatsapp_status')
                .not('phone', 'is', null);

            if (statsData) {
                const distribution = statsData.reduce((acc, contact) => {
                    const tier = contact.tier || 'B';
                    const status = contact.whatsapp_status || 'pending';
                    if (!acc[tier]) acc[tier] = { total: 0, pending: 0, sent: 0 };
                    acc[tier].total++;
                    if (status === 'pending' || !status) acc[tier].pending++;
                    if (status === 'sent') acc[tier].sent++;
                    return acc;
                }, {});

                setStats(distribution);
            }
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const generateQueue = async () => {
        setIsGenerating(true);
        try {
            const { data, error } = await supabase
                .rpc('generate_daily_whatsapp_queue', {
                    p_limit: dailyLimit,
                    p_tier_filter: tierFilter === 'all' ? null : tierFilter
                });

            if (error) throw error;

            toast.success(`Cola generada: ${data[0].contacts_added} contactos`);
            loadQueue();
            loadStats();
        } catch (error) {
            console.error('Error generating queue:', error);
            toast.error('Error al generar cola');
        } finally {
            setIsGenerating(false);
        }
    };

    const openWhatsApp = async (queueItem) => {
        const contact = queueItem.marketing_contacts;
        const message = generateMessage(contact);

        // Usar servicio centralizado (Maneja Texas/EUA y Móvil)
        WhatsAppService.openWhatsApp(contact.phone, message);

        // Marcar como enviado
        try {
            await supabase.rpc('mark_whatsapp_sent', {
                p_contact_id: queueItem.contact_id,
                p_queue_id: queueItem.id
            });

            toast.success(`Mensaje abierto para ${contact.company_name}`);
            loadQueue();
            loadStats();
        } catch (error) {
            console.error('Error marking as sent:', error);
            toast.error('Error al registrar envío');
        }
    };

    const generateMessage = (contact) => {
        const name = contact.contact_name || 'Estimado/a';
        const company = contact.company_name || 'su empresa';
        const tier = contact.tier;
        const isPremium = ['AAA', 'AA'].includes(tier);

        if (isPremium) {
            return `Hola ${name},

Soy Juan Pablo de *Geobooker*. 

Hemos identificado a *${company}* como una empresa líder en ${contact.city || 'su sector'}.

Me gustaría presentarle nuestras soluciones premium de geolocalización y publicidad digital que pueden maximizar su visibilidad.

¿Tendría 15 minutos esta semana para una llamada rápida?

📱 *Descarga nuestra app aquí:*
https://geobooker.com.mx#descargar-app

Saludos,
Juan Pablo
Geobooker
📍 geobooker.com.mx`;
        } else {
            return `Hola ${name},

Soy Juan Pablo de *Geobooker*, plataforma de geolocalización de negocios.

*${company}* puede beneficiarse de nuestra tecnología para aumentar su visibilidad y atraer más clientes en ${contact.city || 'su zona'}.

¿Le interesaría conocer más?

Puede ver nuestra plataforma en:
📍 geobooker.com.mx

📱 *O descarga nuestra app:*
https://geobooker.com.mx#descargar-app

Saludos,
Juan Pablo`;
        }
    };

    const getTierColor = (tier) => {
        switch (tier) {
            case 'AAA': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'AA': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'A': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <MessageCircle className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Hoy</span>
                    </div>
                    <p className="text-3xl font-bold">{sentToday}</p>
                    <p className="text-sm opacity-80 mt-1">
                        de {dailyLimit} ({Math.round((sentToday / dailyLimit) * 100)}%)
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Clock className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Cola</span>
                    </div>
                    <p className="text-3xl font-bold">{queue.length}</p>
                    <p className="text-sm opacity-80 mt-1">Pendientes de enviar</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="w-8 h-8 opacity-80" />
                        <span className="text-xs bg-white/20 px-2 py-1 rounded">Total</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats ? Object.values(stats).reduce((sum, s) => sum + s.pending, 0).toLocaleString() : '0'}
                    </p>
                    <p className="text-sm opacity-80 mt-1">Contactos disponibles</p>
                </div>
            </div>

            {/* Queue Generator */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🤖 Generar Cola de WhatsApp</h3>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Límite Diario
                        </label>
                        <input
                            type="number"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                            min="1"
                            max="100"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Recomendado: 20-30/día
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por Tier
                        </label>
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                        >
                            <option value="all">Todos los Tiers</option>
                            <option value="AAA">Solo AAA</option>
                            <option value="AA">Solo AA</option>
                            <option value="A">Solo A</option>
                            <option value="B">Solo B</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={generateQueue}
                    disabled={isGenerating}
                    className="w-full bg-green-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Generando Cola...
                        </>
                    ) : (
                        <>
                            <Play className="w-5 h-5" />
                            Generar Cola
                        </>
                    )}
                </button>
            </div>

            {/* Queue List */}
            <div className="bg-white rounded-xl shadow-sm border">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">📱 Cola de WhatsApp ({queue.length})</h3>
                    <button
                        onClick={loadQueue}
                        disabled={isLoading}
                        className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg"
                    >
                        {isLoading ? 'Cargando...' : '🔄 Actualizar'}
                    </button>
                </div>

                <div className="divide-y max-h-96 overflow-y-auto">
                    {queue.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No hay contactos en cola</p>
                            <p className="text-sm mt-1">Genera una cola para comenzar a enviar</p>
                        </div>
                    ) : (
                        queue.map((item) => {
                            const contact = item.marketing_contacts;
                            return (
                                <div key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900">
                                                    {contact.company_name}
                                                </h4>
                                                <span className={`text-xs px-2 py-0.5 rounded border ${getTierColor(contact.tier)}`}>
                                                    {contact.tier}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-600">
                                                {contact.contact_name || 'Sin nombre'}
                                            </p>
                                            <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                                📍 {contact.city || 'Sin ciudad'} •
                                                📱 {contact.phone}
                                            </p>
                                        </div>

                                        <button
                                            onClick={() => openWhatsApp(item)}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Abrir WhatsApp
                                        </button>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Tips */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-sm text-blue-800">
                <p className="font-medium mb-2">💡 Cómo funciona:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li><strong>Generar Cola</strong>: Selecciona contactos pendientes automáticamente</li>
                    <li><strong>Abrir WhatsApp</strong>: Abre WhatsApp Web con mensaje pre-llenado</li>
                    <li><strong>Enviar</strong>: Tú decides si envías el mensaje (puedes editarlo)</li>
                    <li>El sistema marca automáticamente como enviado</li>
                </ol>
            </div>
        </div>
    );
};

export default WhatsAppQueueManager;
