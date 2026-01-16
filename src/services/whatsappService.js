// Servicio Global de WhatsApp
// Single Source of Truth para TODOS los envíos de WhatsApp
// src/services/whatsappService.js

import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export class WhatsAppService {
    // Configuración (cargada de Supabase)
    static config = {
        phone: '525526702368',
        displayNumber: '+52 55 2670 2368',
        dailyLimit: 20
    };

    /**
     * Inicializar configuración desde Supabase
     */
    static async loadConfig() {
        try {
            const { data, error } = await supabase
                .from('crm_settings')
                .select('setting_value')
                .eq('setting_key', 'whatsapp_business')
                .single();

            if (!error && data) {
                this.config = {
                    phone: data.setting_value.phone,
                    displayNumber: data.setting_value.display_number,
                    dailyLimit: data.setting_value.daily_limit || 20
                };
            }
        } catch (err) {
            console.error('Error loading WhatsApp config:', err);
        }
    }

    /**
     * Verificar si se puede enviar hoy (límite diario)
     */
    static async canSendToday() {
        try {
            const { data, error } = await supabase.rpc('get_whatsapp_sent_today');

            if (error) throw error;

            const sent = data || 0;
            const remaining = this.config.dailyLimit - sent;

            return {
                canSend: remaining > 0,
                sent: sent,
                remaining: remaining,
                dailyLimit: this.config.dailyLimit
            };
        } catch (error) {
            console.error('Error checking daily limit:', error);
            return { canSend: false, sent: 0, remaining: 0, dailyLimit: 20 };
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
     * Normalizar número de teléfono
     */
    static normalizePhone(phone) {
        if (!phone) return '';

        // Remover todo excepto números
        const clean = phone.replace(/\D/g, '');

        // México: 10 dígitos → +52
        if (clean.length === 10) {
            return '+52' + clean;
        }

        // Si ya tiene código de país sin +
        if (clean.length >= 11) {
            if (clean.startsWith('52')) return '+' + clean; // México
            if (clean.startsWith('1')) return '+' + clean;  // US/Canada
            if (clean.startsWith('44')) return '+' + clean; // UK
            if (clean.startsWith('34')) return '+' + clean; // España
            return '+' + clean;
        }

        return '+' + clean;
    }

    /**
     * Detectar idioma del país (básico)
     */
    static detectLanguage(phone) {
        const normalized = this.normalizePhone(phone);

        // Países de habla hispana
        if (normalized.startsWith('+52')) return 'es'; // México
        if (normalized.startsWith('+34')) return 'es'; // España
        if (normalized.startsWith('+54')) return 'es'; // Argentina
        if (normalized.startsWith('+56')) return 'es'; // Chile
        if (normalized.startsWith('+57')) return 'es'; // Colombia

        // Países de habla inglesa
        if (normalized.startsWith('+1')) return 'en';  // US/Canada
        if (normalized.startsWith('+44')) return 'en'; // UK
        if (normalized.startsWith('+61')) return 'en'; // Australia

        return 'es'; // Default español
    }

    /**
     * Generar mensaje personalizado
     */
    static generateMessage(contact) {
        const language = contact.language || this.detectLanguage(contact.phone);
        const name = contact.name || contact.contact_name || 'Estimado/a';
        const company = contact.company || contact.company_name || 'su empresa';

        const templates = {
            es: `Hola ${name},

Soy Juan Pablo de *Geobooker*. 

Vimos que *${company}* puede beneficiarse de nuestra plataforma de geolocalización para aumentar su visibilidad y atraer más clientes.

📍 *Conoce más*: geobooker.com.mx
📱 *Descarga la app*: geobooker.com.mx#descargar-app

¿Te interesa una llamada rápida de 10 minutos?

Saludos,
Juan Pablo
Geobooker
${this.config.displayNumber}`,

            en: `Hi ${name},

I'm Juan Pablo from *Geobooker*. 

We noticed that *${company}* could benefit from our geolocation platform to increase visibility and attract more customers.

📍 *Learn more*: geobooker.com.mx
📱 *Download app*: geobooker.com.mx#descargar-app

Interested in a quick 10-minute call?

Best regards,
Juan Pablo
Geobooker
${this.config.displayNumber}`
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
     * Enviar mensaje de WhatsApp (función principal)
     */
    static async sendMessage(contact, source = 'manual') {
        try {
            // 1. Verificar límite diario
            const limit = await this.canSendToday();
            if (!limit.canSend) {
                toast.error(`Límite diario alcanzado (${limit.sent}/${limit.dailyLimit})`);
                return { success: false, error: 'daily_limit' };
            }

            // 2. Verificar si ya fue contactado
            const alreadyContacted = await this.isAlreadyContacted(contact.phone);
            if (alreadyContacted) {
                toast.error('Este contacto ya fue contactado previamente');
                return { success: false, error: 'already_contacted' };
            }

            // 3. Generar mensaje
            const message = this.generateMessage(contact);

            // 4. Registrar en base de datos
            const { data, error } = await supabase.rpc('register_whatsapp_sent', {
                p_phone: contact.phone,
                p_contact_name: contact.name || contact.contact_name,
                p_company_name: contact.company || contact.company_name,
                p_source: source,
                p_message: message,
                p_language: contact.language || this.detectLanguage(contact.phone)
            });

            if (error) throw error;

            // 5. Abrir WhatsApp
            this.openWhatsApp(contact.phone, message);

            // 6. Success
            toast.success(`WhatsApp abierto para ${contact.company || contact.name}`);

            return {
                success: true,
                messageId: data,
                remaining: limit.remaining - 1
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
                .gte('sent_at', new Date().toISOString().split('T')[0]);

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
