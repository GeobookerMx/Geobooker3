// Servicio Global de WhatsApp
// Single Source of Truth para TODOS los envíos de WhatsApp
// src/services/whatsappService.js

import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { APP_LINKS } from '../config/appLinks';
import pkg from 'google-libphonenumber';

const { PhoneNumberUtil, PhoneNumberFormat } = pkg;
const phoneUtil = PhoneNumberUtil.getInstance();

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
    static COUNTRY_DIAL_CODES = {
        MX: '52',
        US: '1',
        CA: '1',
        GB: '44',
        UK: '44',
        ES: '34',
        FR: '33',
        DE: '49',
        PT: '351',
        IE: '353',
        AU: '61',
        NZ: '64',
        AR: '54',
        CL: '56',
        CO: '57',
        PE: '51',
        EC: '593',
        GT: '502',
        SV: '503',
        HN: '504',
        NI: '505',
        CR: '506',
        PA: '507',
        VE: '58',
        BR: '55',
        IT: '39'
    };

    static inferCountryFromLocation(location = '') {
        if (!location) return '';

        const value = String(location)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .toLowerCase();
        const rules = [
            [['mexico', 'cdmx', 'guadalajara', 'monterrey', 'jalisco', 'nuevo leon', 'puebla', 'queretaro'], 'MX'],
            [['usa', 'united states', 'los angeles', 'california', 'texas', 'new york', 'florida', 'miami', 'houston', 'dallas', 'chicago'], 'US'],
            [['canada', 'toronto', 'vancouver', 'montreal', 'ottawa', 'calgary'], 'CA'],
            [['uk', 'united kingdom', 'london', 'manchester', 'birmingham', 'liverpool', 'glasgow', 'england', 'scotland'], 'GB'],
            [['spain', 'espana', 'madrid', 'barcelona', 'valencia', 'sevilla'], 'ES'],
            [['france', 'paris', 'lyon', 'marseille'], 'FR'],
            [['germany', 'deutschland', 'berlin', 'munich', 'hamburg', 'frankfurt'], 'DE'],
            [['portugal', 'lisbon', 'porto'], 'PT'],
            [['ireland', 'dublin'], 'IE'],
            [['australia', 'sydney', 'melbourne', 'brisbane', 'perth'], 'AU'],
            [['new zealand', 'auckland', 'wellington'], 'NZ'],
            [['argentina', 'buenos aires', 'cordoba'], 'AR'],
            [['chile', 'santiago'], 'CL'],
            [['colombia', 'bogota', 'medellin', 'cartagena'], 'CO'],
            [['peru', 'lima'], 'PE'],
            [['ecuador', 'quito'], 'EC'],
            [['brazil', 'brasil', 'sao paulo', 'rio de janeiro'], 'BR'],
            [['italy', 'italia', 'rome', 'roma', 'milan', 'milano'], 'IT']
        ];

        for (const [keywords, code] of rules) {
            if (keywords.some((keyword) => value.includes(keyword))) {
                return code;
            }
        }

        return '';
    }

    static inferCountryFromPhone(clean = '') {
        if (!clean) return '';

        if (clean.startsWith('1') && clean.length === 11) {
            return 'US';
        }

        const prefixes = [
            ['521', 'MX'],
            ['52', 'MX'],
            ['44', 'GB'],
            ['34', 'ES'],
            ['33', 'FR'],
            ['49', 'DE'],
            ['351', 'PT'],
            ['353', 'IE'],
            ['61', 'AU'],
            ['64', 'NZ'],
            ['54', 'AR'],
            ['56', 'CL'],
            ['57', 'CO'],
            ['51', 'PE'],
            ['593', 'EC'],
            ['55', 'BR']
        ];

        for (const [prefix, country] of prefixes) {
            if (clean.startsWith(prefix)) {
                return country;
            }
        }

        return '';
    }

    static normalizePhoneForCountry(clean, countryCode = '') {
        const code = (countryCode || '').toUpperCase();
        if (!clean) return '';

        if (code === 'MX') {
            if (clean.startsWith('521') && clean.length === 13) return '+' + clean;
            if (clean.startsWith('52') && clean.length === 12) return '+' + clean;
            if (clean.length === 10) return '+52' + clean;
            return '';
        }

        if (code === 'US' || code === 'CA') {
            if (clean.startsWith('1') && clean.length === 11) return '+' + clean;
            if (clean.length === 10) return '+1' + clean;
            return '';
        }

        if (code === 'GB' || code === 'UK') {
            if (clean.startsWith('44') && clean.length >= 12 && clean.length <= 13) return '+' + clean;
            if (clean.startsWith('0') && clean.length >= 10 && clean.length <= 11) return '+44' + clean.slice(1);
            if (!clean.startsWith('0') && clean.length >= 10 && clean.length <= 11) return '+44' + clean;
            return '';
        }

        const dialCode = this.COUNTRY_DIAL_CODES[code];
        if (!dialCode) return '';

        if (clean.startsWith(dialCode) && clean.length >= dialCode.length + 6 && clean.length <= 15) {
            return '+' + clean;
        }

        const local = clean.startsWith('0') ? clean.slice(1) : clean;
        if (local.length >= 7 && local.length <= 12) {
            return '+' + dialCode + local;
        }

        return '';
    }

    /**
     * Normalizar n?mero de tel?fono a formato E.164.
     * Evita asumir M?xico para leads internacionales cuando no hay evidencia suficiente.
     */
    static normalizePhone(phone, options = {}) {
        if (!phone) return '';

        const raw = String(phone).trim();
        try {
            const explicitCountry = (options.countryCode || '').toUpperCase();
            const locationCountry = this.inferCountryFromLocation(options.location || '');
            const phoneCountry = this.inferCountryFromPhone(raw.replace(/\D/g, ''));
            const resolvedCountry = explicitCountry || locationCountry || phoneCountry || 'MX';

            const parsed = phoneUtil.parseAndKeepRawInput(raw, resolvedCountry);
            if (phoneUtil.isValidNumber(parsed)) {
                return phoneUtil.format(parsed, PhoneNumberFormat.E164);
            }
        } catch (e) {
            // Ignorar y continuar con fallback
        }

        // Fallback robusto tradicional
        const clean = raw.replace(/\D/g, '');
        if (!clean) return '';

        if (raw.startsWith('+') && clean.length >= 10 && clean.length <= 15) {
            return '+' + clean;
        }

        const explicitCountry = (options.countryCode || '').toUpperCase();
        const locationCountry = this.inferCountryFromLocation(options.location || '');
        const phoneCountry = this.inferCountryFromPhone(clean);
        const resolvedCountry = explicitCountry || locationCountry || phoneCountry;

        if (resolvedCountry) {
            return this.normalizePhoneForCountry(clean, resolvedCountry);
        }

        if (clean.startsWith('521') && clean.length === 13) return '+' + clean;
        if (clean.startsWith('52') && clean.length >= 12) return '+' + clean;
        if (clean.startsWith('1') && clean.length === 11) return '+' + clean;
        if (clean.length >= 11 && clean.length <= 15) return '+' + clean;

        return '';
    }

    static detectLanguage(phone, forceLanguage = null, options = {}) {
        // Si se fuerza un idioma, usarlo directamente
        if (forceLanguage && (forceLanguage === 'es' || forceLanguage === 'en')) {
            return forceLanguage;
        }

        const normalized = this.normalizePhone(phone, options);

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
        const language = contact.language || this.detectLanguage(contact.phone, null, {
            countryCode: contact.country_code,
            location: contact.location || contact.city || contact.search_location
        });
        const company = contact.company || contact.company_name || contact.name || 'tu negocio';

        const templates = {
            es: `Hola *${company}* ??
Soy parte del equipo comercial de *Geobooker*.

Hoy miles de personas buscan negocios y servicios cerca de ellos desde su celular. Con Geobooker, *${company}* puede aparecer con ubicaci?n, WhatsApp, c?mo llegar, fotos, servicios y promociones en un solo lugar.

Esto te ayuda a:
? Aumentar tu visibilidad frente a clientes cercanos
? Recibir contactos por WhatsApp, llamada y navegaci?n al negocio
? Mantener tu perfil actualizado con horarios, fotos y promociones
? Estar presente tanto en la web como en nuestra app para Android y iPhone

?? Con?cenos aqu?: ${APP_LINKS.web}
?? Ya contamos con app en Google Play y App Store:
${APP_LINKS.downloadHub}

Si te interesa, te compartimos el enlace para registrar *${company}* en pocos minutos y comenzar a recibir mayor visibilidad local.

_(Si no te interesa, responde NO y no te volvemos a contactar.)_`,

            en: `Hi *${company}* ??
I'm part of the *Geobooker* sales team.

Every day, people search for nearby businesses and services from their phones. With Geobooker, *${company}* can appear with location, WhatsApp, directions, photos, services, and promotions all in one place.

This helps you:
? Increase visibility with nearby customers
? Receive leads through WhatsApp, phone calls, and directions
? Keep your profile updated with hours, photos, and promotions
? Be present on both the web and our Android/iPhone app

?? Learn more: ${APP_LINKS.web}
?? Our app is already available through our download hub:
${APP_LINKS.downloadHub}

If you're interested, we can share the link to register *${company}* in just a few minutes and start increasing local visibility.

_(If you're not interested, reply NO and we won't contact you again.)_`
        };
        return templates[language] || templates.es;
    }

    /**
     * Abrir WhatsApp (mobile-friendly)
     */
    static openWhatsApp(phone, message) {
        const clean = String(phone || '').replace(/\D/g, '');
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
    static isValidPhone(phone, defaultCountry = 'MX') {
        if (!phone) return false;
        try {
            const rawPhone = String(phone).trim();
            const country = rawPhone.startsWith('+') ? undefined : defaultCountry;
            const parsed = phoneUtil.parseAndKeepRawInput(rawPhone, country);
            return phoneUtil.isValidNumber(parsed);
        } catch (e) {
            const clean = String(phone).replace(/\D/g, '');
            if (clean.length < 10 || clean.length > 15) return false;
            if (/^0+$/.test(clean) || /^(\d)\1+$/.test(clean)) return false;
            return true;
        }
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
            const normalizedPhone = this.normalizePhone(contact.phone, { countryCode: contact.country_code, location: contact.location || contact.city || contact.search_location });
            if (!normalizedPhone) {
                toast.error(`No se pudo convertir ${contact.phone} a formato internacional valido.`);
                return { success: false, error: 'phone_normalization_failed', notCounted: true };
            }

            const alreadyContacted = await this.isAlreadyContacted(normalizedPhone);
            if (alreadyContacted) {
                toast.error('Este contacto ya fue contactado previamente');
                return { success: false, error: 'already_contacted' };
            }

            // 3. Generar mensaje
            const message = this.generateMessage(contact);

            // 4. Registrar en base de datos (SOLO si el teléfono es válido)
            const { data, error } = await supabase.rpc('register_whatsapp_sent', {
                p_phone: normalizedPhone,
                p_contact_name: contact.name || contact.contact_name,
                p_company_name: contact.company || contact.company_name,
                p_source: normalizedSource,
                p_message: message,
                p_language: contact.language || this.detectLanguage(normalizedPhone, contact.language, {
                    countryCode: contact.country_code,
                    location: contact.location || contact.city || contact.search_location
                })
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
            this.openWhatsApp(normalizedPhone, message);

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
            const normalized = this.normalizePhone(phone, { countryCode: '' });

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
            const normalized = this.normalizePhone(phone, { countryCode: '' });

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
