// Servicio Global de WhatsApp
// Single Source of Truth para TODOS los envíos de WhatsApp
// src/services/whatsappService.js

import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

/**
 * Obtiene la fecha de hoy en zona horaria de México (UTC-6)
 * Esto asegura que los contadores se reinicien a medianoche hora México
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
const getTodayMexico = () => {
    const now = new Date();
    // UTC-6 para México (Central Time)
    const mexicoOffset = -6 * 60; // en minutos
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    const mexicoTime = new Date(utcTime + (mexicoOffset * 60000));
    return mexicoTime.toISOString().split('T')[0];
};

export class WhatsAppService {
    static SOURCE_ALIASES = {
        google_places: 'scan_invite',
        scan_invite: 'scan_invite',
        apify: 'apify',
        csv: 'crm_queue',
        crm_queue: 'crm_queue',
        manual: 'manual'
    };

    // Configuración (cargada de Supabase)
    static config = {
        phone: '525526702368',
        displayNumber: '+52 55 2670 2368',
        dailyLimit: 20,
        // Límites separados por fuente
        limits: {
            scan_invite: 10,  // Nacional
            apify: 10         // Global/Internacional
        }
    };

    static normalizeSource(source = 'manual') {
        return this.SOURCE_ALIASES[source] || source || 'manual';
    }

    /**
     * Inicializar configuración desde Supabase
     */
    static async loadConfig() {
        try {
            const [{ data, error }, { data: campaignConfig, error: campaignError }] = await Promise.all([
                supabase
                    .from('crm_settings')
                    .select('setting_value')
                    .eq('setting_key', 'whatsapp_business')
                    .single(),
                supabase
                    .from('campaign_config')
                    .select('source, daily_limit')
                    .eq('channel', 'whatsapp')
                    .eq('is_active', true)
            ]);

            if (!error && data) {
                this.config = {
                    phone: data.setting_value.phone || this.config.phone,
                    displayNumber: data.setting_value.display_number || this.config.displayNumber,
                    dailyLimit: data.setting_value.daily_limit || this.config.dailyLimit,
                    limits: {
                        scan_invite: data.setting_value.limit_scan_invite || this.config.limits.scan_invite,
                        apify: data.setting_value.limit_apify || this.config.limits.apify
                    }
                };
            }

            if (!campaignError && Array.isArray(campaignConfig)) {
                const national = campaignConfig.find(c => c.source === 'google_places');
                const global = campaignConfig.find(c => c.source === 'apify');
                const total = (national?.daily_limit || 0) + (global?.daily_limit || 0);

                this.config = {
                    ...this.config,
                    dailyLimit: total > 0 ? total : this.config.dailyLimit,
                    limits: {
                        ...this.config.limits,
                        scan_invite: national?.daily_limit ?? this.config.limits.scan_invite,
                        apify: global?.daily_limit ?? this.config.limits.apify
                    }
                };
            }
        } catch (err) {
            console.error('Error loading WhatsApp config:', err);
        }
    }

    /**
     * Verificar si se puede enviar hoy (límite por fuente)
     * @param {string} source - 'scan_invite', 'apify', 'manual', etc.
     */
    static async canSendToday(source = null) {
        try {
            const normalizedSource = source ? this.normalizeSource(source) : null;

            const buildResponse = (countBySource) => {
                if (normalizedSource && this.config.limits[normalizedSource] !== undefined) {
                    const sent = countBySource[normalizedSource] || 0;
                    const limit = this.config.limits[normalizedSource];
                    return {
                        canSend: sent < limit,
                        sent,
                        remaining: Math.max(0, limit - sent),
                        dailyLimit: limit,
                        source: normalizedSource,
                        bySource: countBySource
                    };
                }

                const totalSent = countBySource.total;
                const remaining = this.config.dailyLimit - totalSent;

                return {
                    canSend: remaining > 0,
                    sent: totalSent,
                    remaining,
                    dailyLimit: this.config.dailyLimit,
                    bySource: countBySource
                };
            };

            let countBySource = null;

            // Obtener conteo por fuente
            const today = getTodayMexico();
            const { data, error } = await supabase
                .from('unified_whatsapp_outreach')
                .select('source')
                .gte('sent_at', today)
                .neq('status', 'failed');

            if (!error) {
                countBySource = {
                    scan_invite: 0,
                    apify: 0,
                    manual: 0,
                    crm_queue: 0,
                    total: data?.length || 0
                };

                (data || []).forEach(item => {
                    if (countBySource.hasOwnProperty(item.source)) {
                        countBySource[item.source]++;
                    }
                });
            } else {
                // Fallback para entornos con RLS/403: usar RPC resumido
                const { data: statsData, error: statsError } = await supabase.rpc('get_daily_campaign_stats');

                if (statsError) {
                    return {
                        canSend: false,
                        sent: 0,
                        remaining: 0,
                        dailyLimit: 0,
                        source: normalizedSource,
                        bySource: {},
                        error: `No se pudo consultar WhatsApp hoy: ${error.message}. Fallback RPC falló: ${statsError.message}`
                    };
                }

                const waStats = (statsData || []).filter(s => s.channel === 'whatsapp');
                countBySource = {
                    scan_invite: waStats.find(s => s.source === 'google_places')?.sent_today || 0,
                    apify: waStats.find(s => s.source === 'apify')?.sent_today || 0,
                    manual: waStats.find(s => s.source === 'manual')?.sent_today || 0,
                    crm_queue: waStats.find(s => s.source === 'csv')?.sent_today || 0,
                    total: 0
                };
                countBySource.total =
                    countBySource.scan_invite +
                    countBySource.apify +
                    countBySource.manual +
                    countBySource.crm_queue;
            }

            return buildResponse(countBySource);
        } catch (error) {
            console.error('Error checking daily limit:', error);
            return {
                canSend: false,
                sent: 0,
                remaining: 0,
                dailyLimit: 0,
                bySource: {},
                error: error.message || 'Error checking daily limit'
            };
        }
    }

    /**
     * Verificar si un teléfono ya fue contactado
     */
    static async isAlreadyContacted(phone) {
        try {
            const { data, error } = await supabase
                .rpc('is_phone_already_contacted', { p_phone: phone });

            return data === true;
        } catch (error) {
            console.error('Error checking if contacted:', error);
            return false;
        }
    }

    /**
     * Normalizar número de teléfono (Smart Detection for Mexico/USA/UK/Canada)
     * Mejorado para detectar números de habla inglesa automáticamente
     */
    static normalizePhone(phone) {
        if (!phone) return '';

        // Remover todo excepto números
        const clean = phone.replace(/\D/g, '');

        // Códigos de área de USA y Canadá (lista expandida)
        // Incluye: Texas, California, Florida, New York, y Canadá
        const usaCanadaAreaCodes = [
            // Texas
            '214', '469', '972', '713', '281', '832', '346', '512', '737', '210', '726',
            '956', '361', '806', '817', '915', '940', '254',
            // California
            '213', '310', '323', '408', '415', '510', '619', '626', '650', '707', '714',
            '818', '831', '858', '909', '916', '925', '949', '951',
            // Florida
            '305', '321', '352', '386', '407', '561', '727', '754', '772', '786', '813',
            '850', '863', '904', '941', '954',
            // New York
            '212', '315', '347', '516', '518', '585', '607', '631', '646', '716', '718',
            '845', '914', '917', '929',
            // Otros estados importantes
            '202', '206', '215', '216', '267', '312', '330', '404', '412', '414', '425',
            '480', '502', '503', '520', '602', '614', '617', '630', '702', '703', '704',
            '720', '770', '773', '801', '847', '919', '971',
            // Canadá
            '416', '437', '647', '905', '289', '604', '778', '250', '403', '587', '780',
            '306', '204', '514', '438', '450', '613', '343', '902', '709',
        ];

        // 1. Caso: El número ya empieza con 1 (USA/Canada) y tiene 11 dígitos
        if (clean.length === 11 && clean.startsWith('1')) {
            return '+' + clean;
        }

        // 2. Caso: UK - números que empiezan con 44
        // UK numbers: 44 + 10 digits (excluding 0) or 44 + 11 digits (including 0?) 
        // Normalmente 44 7xxx xxxxxx (12 digits total)
        if (clean.startsWith('44') && clean.length >= 11) {
            return '+' + clean;
        }

        // 3. Caso: España (34), Francia (33), Alemania (49)
        if ((clean.startsWith('34') || clean.startsWith('33') || clean.startsWith('49')) && clean.length >= 11) {
            return '+' + clean;
        }

        // 4. Caso: El número tiene 10 dígitos (Sin código de país)
        if (clean.length === 10) {
            const areaCode = clean.substring(0, 3);

            // Si el código de área es de USA/Canadá, asumimos +1
            if (usaCanadaAreaCodes.includes(areaCode)) {
                return '+1' + clean;
            }

            // IMPORTANTE: Si NO es código USA conocido, asumimos México (+52)
            // Esto cubre la mayoría de casos locales
            return '+52' + clean;
        }

        // 5. Caso: Ya tiene código de país (52, 1, 44, 34, etc.)
        if (clean.length >= 11) {
            // México con formato completo
            if (clean.startsWith('52') && clean.length >= 12) return '+' + clean;

            // USA/Canadá
            if (clean.startsWith('1') && clean.length === 11) return '+' + clean;

            // México con el 1 extra (52 1 ...)
            if (clean.startsWith('521') && clean.length === 13) return '+' + clean;

            // UK (44)
            if (clean.startsWith('44')) return '+' + clean;

            // España (34)
            if (clean.startsWith('34')) return '+' + clean;

            // Otros Internacionales Genéricos (Longitud suficiente)
            // Si tiene más de 11 dígitos y no empieza con 52 ni 1, probablemente es intl
            if (!clean.startsWith('52') && !clean.startsWith('1')) {
                return '+' + clean;
            }

            return '+' + clean;
        }

        return '+' + clean;
    }

    /**
     * Detectar idioma del país (mejorado)
     * @param {string} phone - Número de teléfono
     * @param {string} forceLanguage - Forzar un idioma específico (opcional)
     * @returns {string} 'es' para español, 'en' para inglés
     */
    static detectLanguage(phone, forceLanguage = null) {
        // Si se fuerza un idioma, usarlo directamente
        if (forceLanguage && (forceLanguage === 'es' || forceLanguage === 'en')) {
            return forceLanguage;
        }

        const normalized = this.normalizePhone(phone);

        // Países de habla hispana
        if (normalized.startsWith('+52')) return 'es';  // México
        if (normalized.startsWith('+34')) return 'es';  // España
        if (normalized.startsWith('+54')) return 'es';  // Argentina
        if (normalized.startsWith('+56')) return 'es';  // Chile
        if (normalized.startsWith('+57')) return 'es';  // Colombia
        if (normalized.startsWith('+51')) return 'es';  // Perú
        if (normalized.startsWith('+58')) return 'es';  // Venezuela
        if (normalized.startsWith('+593')) return 'es'; // Ecuador
        if (normalized.startsWith('+502')) return 'es'; // Guatemala
        if (normalized.startsWith('+503')) return 'es'; // El Salvador
        if (normalized.startsWith('+504')) return 'es'; // Honduras
        if (normalized.startsWith('+505')) return 'es'; // Nicaragua
        if (normalized.startsWith('+506')) return 'es'; // Costa Rica
        if (normalized.startsWith('+507')) return 'es'; // Panamá

        // Países de habla inglesa
        if (normalized.startsWith('+1')) return 'en';   // USA/Canadá
        if (normalized.startsWith('+44')) return 'en';  // Reino Unido
        if (normalized.startsWith('+61')) return 'en';  // Australia
        if (normalized.startsWith('+64')) return 'en';  // Nueva Zelanda
        if (normalized.startsWith('+353')) return 'en'; // Irlanda
        if (normalized.startsWith('+27')) return 'en';  // Sudáfrica

        return 'es'; // Default español (para mercados latinoamericanos)
    }

    /**
     * Generar mensaje personalizado
     */
    static generateMessage(contact) {
        const language = contact.language || this.detectLanguage(contact.phone);
        const company = contact.company || contact.company_name || contact.name || 'tu negocio';

        const templates = {
            es: `Hola *${company}* 👋
Somos el equipo de ventas de *Geobooker*.

Geobooker es una plataforma para que las personas encuentren negocios y servicios #cercadeti en minutos, con información clara y contacto directo.

Esto te ayuda a:
• Aumentar visibilidad local (personas cerca de tu zona)
• Recibir clientes por WhatsApp / llamada / cómo llegar
• Mantener tu perfil actualizado (horarios, fotos, servicios, promociones)
• Atraer clientes de paso o personas con necesidad urgente

📍 Puedes verlo aquí: geobooker.com.mx

¿Te compartimos el link para subir tu negocio en pocos minutos?

_(Si no te interesa, responde NO y no te volvemos a contactar.)_`,

            en: `Hi *${company}* 👋
We're the sales team at *Geobooker*.

Geobooker is a platform that helps people find businesses and services #nearyou in minutes, with clear information and direct contact.

This helps you:
• Increase local visibility (people near your area)
• Receive clients via WhatsApp / call / directions
• Keep your profile updated (hours, photos, services, promotions)
• Attract walk-in customers or people with urgent needs

📍 Check it out: geobooker.com.mx

Would you like the link to register your business in just a few minutes?

_(If you're not interested, reply NO and we won't contact you again.)_`
        };

        return templates[language] || templates.es;
    }

    /**
     * Abrir WhatsApp (mobile-friendly)
     */
    static openWhatsApp(phone, message) {
        const clean = phone.replace(/\D/g, '');
        const encoded = encodeURIComponent(message);

        // Detectar si es móvil
        const isMobile = /iPhone|iPad|Android/i.test(navigator.userAgent);

        // URL según plataforma
        const url = isMobile
            ? `whatsapp://send?phone=${clean}&text=${encoded}`
            : `https://wa.me/${clean}?text=${encoded}`;

        // Abrir en nueva ventana/tab
        window.open(url, '_blank');
    }

    /**
     * Validar formato de teléfono
     */
    static isValidPhone(phone) {
        if (!phone) return false;

        const clean = phone.replace(/\D/g, '');

        // Mínimo 10 dígitos (número local mexicano)
        // Máximo 15 dígitos (estándar E.164)
        if (clean.length < 10 || clean.length > 15) {
            return false;
        }

        // No puede ser solo ceros o números repetidos
        if (/^0+$/.test(clean) || /^(\d)\1+$/.test(clean)) {
            return false;
        }

        return true;
    }

    /**
     * Enviar mensaje de WhatsApp (función principal)
     */
    static async sendMessage(contact, source = 'manual') {
        try {
            // 0. VALIDAR TELÉFONO PRIMERO (antes de contar)
            if (!this.isValidPhone(contact.phone)) {
                toast.error(`Número inválido: ${contact.phone}. No se contó como enviado.`);
                return { success: false, error: 'invalid_phone', notCounted: true };
            }

            // 1. Verificar límite diario POR FUENTE
            const normalizedSource = this.normalizeSource(source);
            const limit = await this.canSendToday(normalizedSource);
            if (limit.error) {
                toast.error(`WhatsApp no está listo: ${limit.error}`);
                return { success: false, error: 'limit_check_failed', details: limit.error };
            }
            if (!limit.canSend) {
                const sourceLabel = normalizedSource === 'scan_invite' ? 'Nacional' : normalizedSource === 'apify' ? 'Global' : normalizedSource;
                toast.error(`Límite ${sourceLabel} alcanzado (${limit.sent}/${limit.dailyLimit})`);
                return { success: false, error: 'daily_limit', limit };
            }

            // 2. Verificar si ya fue contactado
            const alreadyContacted = await this.isAlreadyContacted(contact.phone);
            if (alreadyContacted) {
                toast.error('Este contacto ya fue contactado previamente');
                return { success: false, error: 'already_contacted' };
            }

            // 3. Generar mensaje
            const message = this.generateMessage(contact);

            // 4. Registrar en base de datos (SOLO si el teléfono es válido)
            const { data, error } = await supabase.rpc('register_whatsapp_sent', {
                p_phone: contact.phone,
                p_contact_name: contact.name || contact.contact_name,
                p_company_name: contact.company || contact.company_name,
                p_source: normalizedSource,
                p_message: message,
                p_language: contact.language || this.detectLanguage(contact.phone)
            });

            if (error) throw error;

            const statsSource = normalizedSource === 'scan_invite'
                ? 'google_places'
                : normalizedSource === 'crm_queue'
                    ? 'csv'
                    : normalizedSource;

            const { error: statsError } = await supabase.rpc('register_campaign_send', {
                p_channel: 'whatsapp',
                p_source: statsSource,
                p_contact_id: null
            });

            if (statsError) {
                console.warn('WhatsApp stats sync warning:', statsError);
            }

            // 5. Abrir WhatsApp
            this.openWhatsApp(contact.phone, message);

            // 6. Success
            toast.success(`WhatsApp abierto para ${contact.company || contact.name}`);

            return {
                success: true,
                messageId: data,
                remaining: Math.max(0, limit.remaining - 1)
            };

        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            toast.error('Error al enviar WhatsApp: ' + error.message);
            return { success: false, error: error.message };
        }
    }

    /**
     * Obtener estadísticas del día
     */
    static async getTodayStats() {
        try {
            const { data, error } = await supabase
                .from('unified_whatsapp_outreach')
                .select('source, status')
                .gte('sent_at', getTodayMexico());

            if (error) throw error;

            const stats = {
                total: data.length,
                bySource: {},
                byStatus: {}
            };

            data.forEach(item => {
                // Por fuente
                stats.bySource[item.source] = (stats.bySource[item.source] || 0) + 1;

                // Por estado
                stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
            });

            const limit = await this.canSendToday();

            return {
                ...stats,
                sent: limit.sent,
                remaining: limit.remaining,
                limit: limit.dailyLimit
            };

        } catch (error) {
            console.error('Error getting stats:', error);
            return null;
        }
    }

    /**
     * Marcar como respondido
     */
    static async markAsReplied(phone, responseText = '') {
        try {
            const normalized = this.normalizePhone(phone);

            const { error } = await supabase
                .from('unified_whatsapp_outreach')
                .update({
                    status: 'replied',
                    replied_at: new Date().toISOString(),
                    response_text: responseText
                })
                .eq('normalized_phone', normalized);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error marking as replied:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Marcar como convertido
     */
    static async markAsConverted(phone, value = null) {
        try {
            const normalized = this.normalizePhone(phone);

            const { error } = await supabase
                .from('unified_whatsapp_outreach')
                .update({
                    converted: true,
                    conversion_value: value,
                    updated_at: new Date().toISOString()
                })
                .eq('normalized_phone', normalized);

            if (error) throw error;

            toast.success('¡Marcado como convertido! 🎉');
            return { success: true };
        } catch (error) {
            console.error('Error marking as converted:', error);
            return { success: false, error: error.message };
        }
    }
}

// Auto-cargar configuración al importar
WhatsAppService.loadConfig();

export default WhatsAppService;
