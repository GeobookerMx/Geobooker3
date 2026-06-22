// src/pages/admin/UnifiedCRM.jsx
/**
 * Unified CRM & Marketing Dashboard
 * - Contactos: Import, view, filter
 * - Plantillas: Create/edit email templates
 * - Estadísticas: Stats by company type and tier
 * - Lanzar: Select contacts + template → send
 * - Historial: Sent emails history
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Upload, Users, Mail, Send, Search, CheckSquare, Square,
    Trash2, Download, RefreshCw, X, Loader2, Plus, Edit2,
    Building2, BarChart3, TrendingUp, Clock, FileSpreadsheet,
    Play, MessageCircle, Filter, ChevronRight, Eye, Settings
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import EmailTester from '../../components/admin/EmailTester';
import MarketingDashboard from '../../components/admin/MarketingDashboard';
import WhatsAppQueueManager from '../../components/admin/WhatsAppQueueManager';
import WhatsAppCRM from '../../components/admin/WhatsAppCRM';
import WhatsAppService from '../../services/whatsappService';
import KPIsPanel from '../../components/admin/KPIsPanel';
import { matchesSemanticText } from '../../utils/semanticDictionary';

const FALLBACK_EMAIL_SENDER = {
    name: 'Geobooker Ads',
    email: 'hola@geobooker.com.mx',
    signature: '<div style="margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:14px;color:#6b7280;"><p><strong>Geobooker Ads</strong><br>Publicidad local y enterprise<br>📧 hola@geobooker.com.mx<br>🌐 <a href="https://geobooker.com.mx">geobooker.com.mx</a></p></div>',
    use_for: ['default', 'crm']
};

const extractEmailBodyContent = (html = '') => {
    const input = String(html || '').trim();
    if (!input) return '';

    const bodyMatch = input.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    if (bodyMatch?.[1]) {
        return bodyMatch[1].trim();
    }

    return input
        .replace(/<!doctype[^>]*>/gi, '')
        .replace(/<\/?(html|head|body)[^>]*>/gi, '')
        .trim();
};

const applyEmailTemplateVariables = (input = '', variables = {}) => {
    let output = String(input || '');
    const replacements = [
        { tokens: ['{contact_name}', '{{contact_name}}', '{nombre}', '{{nombre}}'], value: variables.contactName },
        { tokens: ['{company_name}', '{{company_name}}', '{empresa}', '{{empresa}}'], value: variables.companyName },
        { tokens: ['{tier}', '{{tier}}'], value: variables.tier }
    ];

    replacements.forEach(({ tokens, value }) => {
        tokens.forEach((token) => {
            output = output.split(token).join(value || '');
        });
    });

    return output;
};

const buildEmailPreviewShell = ({ html, signatureHtml = '', companyName = 'tu empresa', preheader = 'Conoce Geobooker Ads y descarga la app' }) => {
    const contentHtml = `${extractEmailBodyContent(html)}${signatureHtml ? `\n${extractEmailBodyContent(signatureHtml)}` : ''}`;

    return `
        <div style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</div>
        <div style="margin:0;padding:24px;background:linear-gradient(180deg,#eff6ff 0%,#f8fafc 100%);font-family:Arial,Helvetica,sans-serif;">
            <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.10);">
                <div style="padding:30px 28px 24px;background:linear-gradient(135deg,#0f172a 0%,#1d4ed8 60%,#2563eb 100%);text-align:center;color:#fff;">
                    <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width:210px;max-width:100%;height:auto;display:block;margin:0 auto 14px;" />
                    <p style="margin:0;font-size:13px;opacity:.92;">Publicidad local, premium y enterprise para hacer crecer tu negocio</p>
                </div>
                <div style="padding:34px 28px 22px;color:#1f2937;line-height:1.65;font-size:16px;">
                    ${contentHtml}
                </div>
                <div style="background:#f8fafc;border-top:1px solid #e5e7eb;padding:28px;">
                    <div style="text-align:center;margin-bottom:18px;">
                        <img src="https://geobooker.com.mx/images/geobooker-logo-horizontal-new.png" alt="Geobooker" style="width:145px;max-width:100%;height:auto;opacity:.92;" />
                        <p style="margin:12px 0 0;color:#475569;font-size:13px;line-height:1.6;">
                            Geobooker Ads ayuda a negocios como <strong>${companyName}</strong> a ganar visibilidad con espacios patrocinados, mapa, busqueda y presencia premium.
                        </p>
                    </div>
                    <div style="background:linear-gradient(135deg,#dbeafe 0%,#eef2ff 100%);border:1px solid #bfdbfe;border-radius:16px;padding:18px;text-align:center;margin-bottom:18px;">
                        <h3 style="margin:0 0 8px;color:#0f172a;font-size:18px;">Descarga Geobooker y descubre nuestros espacios publicitarios</h3>
                        <p style="margin:0;color:#475569;font-size:13px;line-height:1.6;">Tus clientes pueden encontrarte en web, Android e iPhone.</p>
                    </div>
                    <div style="color:#64748b;font-size:12px;line-height:1.7;text-align:center;">
                        <p style="margin:7px 0;"><strong>Web:</strong> <a href="https://geobooker.com.mx" style="color:#2563eb;text-decoration:none;">https://geobooker.com.mx</a></p>
                        <p style="margin:7px 0;"><strong>Email comercial:</strong> <a href="mailto:hola@geobooker.com.mx" style="color:#2563eb;text-decoration:none;">hola@geobooker.com.mx</a></p>
                        <p style="margin:7px 0;">Si no deseas mas mensajes corporativos, responde este correo con la palabra <strong>BAJA</strong>.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
};


const TEMPLATE_TYPE_META = {
    invitation: { label: 'Automatica: Invitacion', badge: 'bg-blue-100 text-blue-700' },
    followup: { label: 'Automatica: Follow Up', badge: 'bg-amber-100 text-amber-700' },
    reengagement: { label: 'Automatica: Re-engagement', badge: 'bg-orange-100 text-orange-700' },
    promotional: { label: 'Manual: Promocional', badge: 'bg-emerald-100 text-emerald-700' },
    custom: { label: 'Manual: Personalizada', badge: 'bg-slate-100 text-slate-700' }
};

const PROTECTED_TEMPLATE_TYPES = new Set(['invitation', 'followup', 'reengagement']);

const getTemplateTypeMeta = (templateType) => TEMPLATE_TYPE_META[templateType] || { label: templateType || 'Sin tipo', badge: 'bg-gray-100 text-gray-700' };

const UnifiedCRM = () => {
    // Active Tab
    const [activeTab, setActiveTab] = useState('contactos');

    // Contacts State
    const [contacts, setContacts] = useState([]);
    const [totalContacts, setTotalContacts] = useState(0);
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [contactsLoading, setContactsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [tierFilter, setTierFilter] = useState('all');
    const [typeFilter] = useState('all');
    const [industryFilter, setIndustryFilter] = useState('all');
    const [cityFilter, setCityFilter] = useState('all');
    const [stateFilter, setStateFilter] = useState('all');

    // Templates State
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateForm, setTemplateForm] = useState({
        name: '', subject: '', html_content: '', template_type: 'promotional', is_active: true
    });

    // Stats State
    const [, setCompanyTypeStats] = useState([]);
    const [, setTierStats] = useState([]);
    const [, setStatsLoading] = useState(false);

    // Email Status Metrics
    const [emailMetrics, setEmailMetrics] = useState({ enviados: 0, pendientes: 0, abiertos: 0, todayCount: 0 });

    // Campaign State
    const [campaignType, setCampaignType] = useState('email'); // 'email' or 'whatsapp'
    const [dailyLimit, setDailyLimit] = useState(100);
    const [selectedSender, setSelectedSender] = useState(null);
    const [emailQueue, setEmailQueue] = useState([]);
    const [waQueue, setWaQueue] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [waSearchTier] = useState('all');
    const [emailSearchTier, setEmailSearchTier] = useState('all');

    // History State
    const [, setEmailLogs] = useState([]);
    const [, setWaLogs] = useState([]);
    const [followUpDays, setFollowUpDays] = useState(15);
    const [isResetting, setIsResetting] = useState(false);

    // N8N State
    const [showN8nModal, setShowN8nModal] = useState(false);
    const [n8nMessage, setN8nMessage] = useState('');

    // Settings State
    const [senders, setSenders] = useState([]);
    const [whatsappConfig, setWhatsappConfig] = useState({ phone: '', display_number: '', default_message: '' });
    const [campaignLimits, setCampaignLimits] = useState({ daily_email_limit: 100, daily_whatsapp_limit: 50 });
    const [, setSettingsLoading] = useState(false);

    // Import State
    const [importing, setImporting] = useState(false);
    const [, setPreviewData] = useState([]);

    // Company Types for filter
    const [, setCompanyTypes] = useState([]);

    // 🌟 NUEVO: Drawer de detalle de contacto
    const [drawerContact, setDrawerContact] = useState(null);

    // 🌟 NUEVO: Modal preview de email
    const [showEmailPreview, setShowEmailPreview] = useState(false);
    const [emailPreviewHtml, setEmailPreviewHtml] = useState('');
    const [queueStats, setQueueStats] = useState({ prepared: 0, pending: 0, sentToday: 0 });

    // 🌟 NUEVO: Log en vivo de campaña
    const [campaignLog, setCampaignLog] = useState([]);
    const addLog = (msg, type = 'info') => setCampaignLog(prev => [...prev.slice(-49), { msg, type, t: new Date().toLocaleTimeString() }]);

    const loadInitialData = useCallback(async () => {
        await Promise.all([
            loadContacts(),
            loadTemplates(),
            loadStats(),
            loadHistory(),
            loadSettings(),
            loadQueueStats()
        ]);
    }, []);

    useEffect(() => {
        loadInitialData();
    }, [loadInitialData]);

    const loadQueueStats = async () => {
        try {
            const todayStr = new Date().toISOString().slice(0, 10);
            const [{ count: pendingCount }, { count: sentTodayCount }] = await Promise.all([
                supabase
                    .from('email_queue')
                    .select('*', { count: 'exact', head: true })
                    .eq('status', 'pending'),
                supabase
                    .from('campaign_history')
                    .select('*', { count: 'exact', head: true })
                    .eq('campaign_type', 'email')
                    .gte('sent_at', `${todayStr}T00:00:00`)
                    .lte('sent_at', `${todayStr}T23:59:59`)
            ]);

            setQueueStats(prev => ({
                ...prev,
                pending: pendingCount || 0,
                sentToday: sentTodayCount || 0
            }));
        } catch (err) {
            console.error('Error loading queue stats:', err);
        }
    };

    const loadSettings = async () => {
        setSettingsLoading(true);
        try {
            const { data, error } = await supabase
                .from('crm_settings')
                .select('*');

            if (error) throw error;

            let loadedSenders = null;
            data.forEach(s => {
                if (s.setting_key === 'email_senders') {
                    loadedSenders = Array.isArray(s.setting_value) ? s.setting_value : [];
                }
                if (s.setting_key === 'whatsapp_business') setWhatsappConfig(s.setting_value);
                if (s.setting_key === 'campaign_limits') {
                    setCampaignLimits(s.setting_value);
                    // Sincronizar el límite diario del input con lo que hay en DB
                    if (s.setting_value.daily_email_limit) {
                        setDailyLimit(s.setting_value.daily_email_limit);
                    }
                }
            });

            const safeSenders = loadedSenders && loadedSenders.length > 0
                ? loadedSenders
                : [FALLBACK_EMAIL_SENDER];

            setSenders(safeSenders);
            setSelectedSender((prev) => prev || safeSenders[0]);
        } catch (err) {
            console.error('Error cargando configuración:', err);
            setSenders([FALLBACK_EMAIL_SENDER]);
            setSelectedSender(FALLBACK_EMAIL_SENDER);
        } finally {
            setSettingsLoading(false);
        }
    };

    const saveSettings = async (key, value) => {
        const toastId = toast.loading('Guardando configuración...');
        try {
            const { error } = await supabase
                .from('crm_settings')
                .upsert({ setting_key: key, setting_value: value }, { onConflict: 'setting_key' });

            if (error) throw error;
            toast.success('Configuración guardada', { id: toastId });
            loadSettings();
        } catch (err) {
            toast.error('Error al guardar: ' + err.message, { id: toastId });
        }
    };

    // ============ CONTACTS FUNCTIONS ============
    const loadContacts = async () => {
        setContactsLoading(true);
        try {
            // Get total count first
            const { count: totalCount } = await supabase
                .from('marketing_contacts')
                .select('*', { count: 'exact', head: true });

            // Get tier distribution + email status metrics
            const { data: allContacts } = await supabase
                .from('marketing_contacts')
                .select('tier, email_status, email_sent_at, last_email_sent');

            const rows = allContacts || [];

            // Tier stats
            const tierCounts = rows.reduce((acc, curr) => {
                acc[curr.tier] = (acc[curr.tier] || 0) + 1;
                return acc;
            }, {});
            setTierStats(Object.entries(tierCounts).map(([tier, count]) => ({
                tier, total_contacts: count, with_email: count, with_phone: 0
            })));

            // Email metrics
            const todayStr = new Date().toISOString().slice(0, 10);
            setEmailMetrics({
                enviados: rows.filter(r => r.email_status === 'sent').length,
                pendientes: rows.filter(r => !r.email_status || r.email_status === 'pending').length,
                abiertos: rows.filter(r => r.email_status === 'opened').length,
                todayCount: rows.filter(r => (r.email_sent_at || r.last_email_sent) && (r.email_sent_at || r.last_email_sent).startsWith(todayStr)).length
            });

            // Get all contacts for robust local search
            const { data, error } = await supabase
                .from('marketing_contacts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(25000);

            if (error) throw error;
            setContacts(data || []);
            setTotalContacts(totalCount || 0);
            console.log(`📊 Total contactos en DB: ${totalCount}`);

            const types = [...new Set(data?.map(c => c.company_type).filter(Boolean))];
            setCompanyTypes(types);
        } catch (err) {
            toast.error('Error cargando contactos');
        } finally {
            setContactsLoading(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        console.log('📂 File selected:', file.name, file.type, file.size);
        setImporting(true);

        try {
            const reader = new FileReader();

            reader.onload = async (event) => {
                try {
                    console.log('📖 File read, parsing...');
                    const XLSX = await import('xlsx');
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    console.log('📊 Sheet found:', sheetName);
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet);

                    console.log('✅ Parsed rows:', jsonData.length);
                    console.log('Sample row:', jsonData[0]);

                    if (jsonData.length === 0) {
                        toast.error('El archivo está vacío');
                        setImporting(false);
                        return;
                    }

                    setPreviewData(jsonData.slice(0, 10));
                    toast.success(`${jsonData.length} filas encontradas`);

                    // Auto-import after preview
                    await importContacts(jsonData);
                } catch (err) {
                    console.error('Parse error:', err);
                    toast.error('Error leyendo archivo: ' + err.message);
                } finally {
                    setImporting(false);
                }
            };

            reader.onerror = (err) => {
                console.error('FileReader error:', err);
                toast.error('Error al leer el archivo');
                setImporting(false);
            };

            reader.readAsArrayBuffer(file);
        } catch (err) {
            console.error('File upload error:', err);
            toast.error('Error: ' + err.message);
            setImporting(false);
        }
    };

    const importContacts = async (data) => {
        const toastId = toast.loading('Importando contactos...');
        try {
            const contacts = data.map(row => ({
                contact_name: row.Nombre || row.name || row.Name || row.Contacto || '',
                email: (row.Email || row.email || row['Email corporativo'] || row['Email corp'] || '').trim().toLowerCase(),
                company_name: row.Empresa || row.company || row.Company || row['Compañía'] || row['Compania'] || row['Compa\u00f1ia'] || '',
                phone: row.Telefono || row['Telefono 1'] || row['Telefono 2'] || row['Telefono 3'] || row.phone || row.Phone || row['Teléfono'] || '',
                tier: normalizeTier(row.Tier || row.tier || row['Tama\u00f1o'] || row.Tamano || 'A'),
                industry: row['Tipo de empresa'] || row.industry || row.Tipo || row.Giro || '',
                city: row.Ciudad || row.city || row.City || '',
                state: row.Estado || row.state || '',
                country: 'M\u00e9xico'
            })).filter(c => c.email && c.email.includes('@')); // Only contacts with valid email

            if (contacts.length === 0) {
                toast.error('No se encontraron contactos con email válido', { id: toastId });
                return;
            }

            console.log(`Importing ${contacts.length} contacts...`);

            // Use marketing_contacts table
            const { error } = await supabase
                .from('marketing_contacts')
                .upsert(contacts, {
                    onConflict: 'email'
                });

            if (error) {
                console.error('Upsert error:', error);
                // Fallback: try inserting one by one, skipping duplicates
                let imported = 0;
                for (const contact of contacts) {
                    const { error: insertError } = await supabase
                        .from('marketing_contacts')
                        .insert([contact])
                        .select();
                    if (!insertError) imported++;
                }
                toast.success(`${imported} contactos importados (${contacts.length - imported} duplicados omitidos)`, { id: toastId });
            } else {
                toast.success(`${contacts.length} contactos importados`, { id: toastId });
            }

            loadContacts();
            loadStats();
        } catch (err) {
            console.error('Import error:', err);
            toast.error('Error importando: ' + err.message, { id: toastId });
        }
    };

    const normalizeTier = (value) => {
        const v = String(value).toUpperCase().trim();
        if (v === 'AAA' || v === '3') return 'AAA';
        if (v === 'AA' || v === '2') return 'AA';
        if (v === 'A' || v === '1') return 'A';
        return 'B';
    };

    // ============ CONTACT SELECTION FUNCTIONS ============
    const toggleContact = (id) => {
        setSelectedContacts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const selectAll = () => {
        if (allVisibleSelected) {
            setSelectedContacts(prev => {
                const next = new Set(prev);
                filteredContacts.forEach(contact => next.delete(contact.id));
                return next;
            });
        } else {
            setSelectedContacts(prev => new Set([...prev, ...filteredContacts.map(c => c.id)]));
        }
    };

    const deleteSelected = async () => {
        if (!confirm(`¿Eliminar ${selectedContacts.size} contactos?`)) return;

        const toastId = toast.loading('Eliminando...');
        try {
            const { error } = await supabase
                .from('marketing_contacts')
                .delete()
                .in('id', Array.from(selectedContacts));

            if (error) throw error;
            toast.success('Contactos eliminados', { id: toastId });
            setSelectedContacts(new Set());
            loadContacts();
        } catch (err) {
            toast.error('Error eliminando', { id: toastId });
        }
    };

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();

    const filteredContacts = contacts.filter(c => {
        const matchSearch = !normalizedSearchTerm || matchesSemanticText(normalizedSearchTerm, [
            c.contact_name,
            c.email,
            c.company_name,
            c.city,
            c.state,
            c.industry,
            c.company_type
        ]);
        const matchTier = tierFilter === 'all' || c.tier === tierFilter;
        const matchIndustry = industryFilter === 'all' || c.industry === industryFilter;
        const matchType = typeFilter === 'all' || c.company_type === typeFilter;
        const matchCity = cityFilter === 'all' || c.city === cityFilter;
        const matchState = stateFilter === 'all' || c.state === stateFilter;
        return matchSearch && matchTier && matchIndustry && matchType && matchCity && matchState;
    });

    const allVisibleSelected = filteredContacts.length > 0 &&
        filteredContacts.every(contact => selectedContacts.has(contact.id));

    const uniqueIndustries = Array.from(new Set(contacts.map(c => c.industry).filter(Boolean))).sort();
    const uniqueStates = Array.from(new Set(contacts.map(c => c.state).filter(Boolean))).sort();
    const uniqueCities = Array.from(new Set(contacts.map(c => c.city).filter(Boolean))).sort();

    // ============ TEMPLATES FUNCTIONS ============
    const loadTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
                .order('template_type', { ascending: true })
                .order('created_at', { ascending: false });

            if (error) throw error;
            setTemplates(data || []);
        } catch (err) {
            console.error('Error loading templates:', err);
        }
    };

    const saveTemplate = async () => {
        const toastId = toast.loading('Guardando plantilla...');
        try {
            if (!templateForm.name?.trim() || !templateForm.subject?.trim() || !templateForm.html_content?.trim()) {
                toast.error('Completa nombre, asunto y cuerpo HTML', { id: toastId });
                return;
            }

            if (selectedTemplate) {
                await supabase
                    .from('email_templates')
                    .update(templateForm)
                    .eq('id', selectedTemplate.id);
            } else {
                await supabase
                    .from('email_templates')
                    .insert([templateForm]);
            }

            toast.success('Plantilla guardada', { id: toastId });
            setShowTemplateModal(false);
            setSelectedTemplate(null);
            setTemplateForm({ name: '', subject: '', html_content: '', template_type: 'promotional', is_active: true });
            loadTemplates();
        } catch (err) {
            toast.error('Error guardando', { id: toastId });
        }
    };

    const deleteTemplate = async (id, templateType) => {
        if (PROTECTED_TEMPLATE_TYPES.has(templateType)) {
            toast.error('Las plantillas automaticas criticas no se pueden eliminar desde el CRM');
            return;
        }

        if (!confirm('¿Eliminar esta plantilla?')) return;

        try {
            await supabase.from('email_templates').delete().eq('id', id);
            toast.success('Plantilla eliminada');
            loadTemplates();
        } catch (err) {
            toast.error('Error eliminando');
        }
    };

    // ============ STATS FUNCTIONS ============
    // ============ STATS FUNCTIONS ============
    const loadStats = async () => {
        setStatsLoading(true);
        try {
            // Try to load from views, fallback to manual query
            const { data: typeStats } = await supabase
                .from('crm_company_type_stats')
                .select('*')
                .limit(20);

            setCompanyTypeStats(typeStats || []);

            const { data: tStats } = await supabase
                .from('crm_tier_stats')
                .select('*');

            setTierStats(tStats || []);
        } catch (err) {
            console.error('Stats error:', err);
        } finally {
            setStatsLoading(false);
        }
    };


    const generateQueue = async () => {
        const toastId = toast.loading(campaignType === 'email' ? 'Buscando contactos con email...' : 'Buscando contactos con WhatsApp...');

        try {
            if (campaignType === 'email') {
                const response = await fetch('/.netlify/functions/generate-email-queue', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        limit: dailyLimit,
                        tier: emailSearchTier === 'all' ? null : emailSearchTier
                    })
                });

                const result = await response.json();
                if (!response.ok || result.success === false) {
                    throw new Error(result.error || 'No se pudo preparar la cola');
                }

                const { data: queueRows, error: queueError } = await supabase
                    .from('email_queue')
                    .select(`
                        id,
                        contact_id,
                        email_round,
                        priority,
                        marketing_contacts!inner (
                            contact_name,
                            company_name,
                            email,
                            tier,
                            email_sent_count
                        )
                    `)
                    .eq('status', 'pending')
                    .order('priority', { ascending: false })
                    .order('email_round', { ascending: true })
                    .order('created_at', { ascending: true })
                    .limit(dailyLimit);

                if (queueError) throw queueError;

                const mappedQueue = (queueRows || []).map(row => ({
                    queue_id: row.id,
                    contact_id: row.contact_id,
                    contact_name: row.marketing_contacts?.contact_name,
                    company_name: row.marketing_contacts?.company_name,
                    contact_email: row.marketing_contacts?.email,
                    contact_tier: row.marketing_contacts?.tier,
                    email_sent_count: row.marketing_contacts?.email_sent_count || 0,
                    email_round: row.email_round,
                    priority: row.priority
                }));

                setEmailQueue(mappedQueue);
                setQueueStats(prev => ({
                    ...prev,
                    prepared: result.contacts_added || mappedQueue.length,
                    pending: mappedQueue.length
                }));
                loadQueueStats();

                if (mappedQueue.length > 0) {
                    toast.success(`✅ Cola preparada en base de datos: ${mappedQueue.length} emails pendientes`, { id: toastId });
                } else {
                    toast.error(`❌ No se encontraron contactos con email que cumplan los criterios:\n- Tier: ${emailSearchTier === 'all' ? 'Todos' : emailSearchTier}\n- Estado: Sin enviar`, { id: toastId, duration: 5000 });
                }
            } else {
                const { data, error } = await supabase
                    .rpc('generate_whatsapp_queue', {
                        p_limit: dailyLimit,
                        p_tier_filter: waSearchTier === 'all' ? null : waSearchTier
                    });

                if (error) throw error;
                setWaQueue(data || []);

                if (data && data.length > 0) {
                    toast.success(`✅ Cola generada: ${data.length} contactos con WhatsApp listos`, { id: toastId });
                } else {
                    toast.error(`❌ No se encontraron contactos que cumplan los criterios:\n- Con número de teléfono válido\n- Tier: ${waSearchTier === 'all' ? 'Todos' : waSearchTier}\n- Sin WhatsApp enviado`, { id: toastId, duration: 5000 });
                }
            }
        } catch (err) {
            console.error('Error generating queue:', err);
            toast.error(`Error generando cola: ${err.message}`, { id: toastId });
        }
    };


    // ============ HISTORY FUNCTIONS ============
    const loadHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('crm_email_logs')
                .select('*')
                .order('sent_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setEmailLogs(data || []);

            const { data: waData } = await supabase
                .from('crm_contacts')
                .select('id, name, phone, wa_sent_at, wa_template, tier')
                .eq('wa_sent', true)
                .order('wa_sent_at', { ascending: false })
                .limit(50);
            setWaLogs(waData || []);
        } catch (err) {
            console.error('History error:', err);
        }
    };

    const markWaSent = async (contactId) => {
        try {
            const { error } = await supabase.rpc('mark_whatsapp_sent', {
                contact_ids: [contactId],
                template_name: 'manual_collective'
            });
            if (error) throw error;

            // Remove from queue
            setWaQueue(prev => prev.filter(item => item.contact_id !== contactId));
            toast.success('Marcado como enviado');
            loadHistory();
            loadStats();
        } catch (err) {
            toast.error('Error al marcar');
        }
    };

    const handleResetCampaign = async (type) => {
        if (!confirm(`¿Estás seguro de reiniciar los contactos de ${type} que tengan más de ${followUpDays} días? Esto los pondrá de nuevo en la cola.`)) return;

        setIsResetting(true);
        try {
            const { data, error } = await supabase.rpc('reset_contact_status', {
                days_since_last_contact: parseInt(followUpDays),
                reset_email: type === 'email' || type === 'both',
                reset_whatsapp: type === 'whatsapp' || type === 'both',
                target_tier: emailSearchTier === 'all' ? null : emailSearchTier
            });

            if (error) throw error;
            toast.success(`${data} contactos reiniciados para seguimiento`);
            loadStats();
        } catch (err) {
            toast.error('Error al reiniciar campaña');
            console.error(err);
        } finally {
            setIsResetting(false);
        }
    };

    // ============ N8N TRIGGER ============
    const triggerN8NForContacts = async (contactIds, customMessage = '') => {
        const selected = contacts.filter(c => contactIds.has(c.id));
        if (selected.length === 0) { toast.error('Selecciona al menos un contacto'); return; }

        const toastId = toast.loading(`Enviando ${selected.length} contacto(s) a N8N...`);
        const N8N_WEBHOOK = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://n8n.geobooker.com.mx/webhook/nuevo-lead-crm';
        let ok = 0, fail = 0;

        for (const c of selected) {
            // Reemplazo dinámico de variables en el texto
            let finalMessage = customMessage
                .replace(/{{contact_name}}/gi, c.contact_name || '')
                .replace(/{{company_name}}/gi, c.company_name || '')
                .replace(/{{city}}/gi, c.city || '')
                .replace(/{{industry}}/gi, c.industry || '');

            try {
                const res = await fetch(N8N_WEBHOOK, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'INSERT',
                        table: 'marketing_contacts',
                        schema: 'public',
                        record: {
                            tier: c.tier,
                            email: c.email,
                            company_name: c.company_name,
                            contact_name: c.contact_name,
                            city: c.city,
                            state: c.state,
                            industry: c.industry,
                            custom_message: finalMessage
                        }
                    })
                });
                if (res.ok) ok++; else fail++;
            } catch { fail++; }
            await new Promise(r => setTimeout(r, 300));
        }
        toast.success(`N8N: ${ok} enviados${fail > 0 ? `, ${fail} fallidos` : ''}`, { id: toastId });
    };

    // ============ SEND CAMPAIGN ============
    const sendCampaign = async () => {
        if (!selectedTemplate) {
            toast.error('Selecciona una plantilla primero');
            return;
        }
        if (!selectedSender) {
            toast.error('Selecciona un remitente primero');
            return;
        }
        if (emailQueue.length === 0) {
            toast.error('Genera la cola primero');
            return;
        }

        setIsSending(true);
        setSendProgress(0);
        setCampaignLog([]);
        addLog('🚀 Iniciando campaña...', 'info');
        const toastId = toast.loading('Enviando campaña...');

        try {
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < emailQueue.length; i++) {
                const item = emailQueue[i];

                const templateVariables = {
                    companyName: item.company_name || 'Negocio',
                    contactName: item.contact_name || 'Amigo',
                    tier: item.contact_tier || ''
                };

                const processedBody = applyEmailTemplateVariables(selectedTemplate.html_content, templateVariables);
                const processedSubject = applyEmailTemplateVariables(selectedTemplate.subject, templateVariables);

                try {
                    const response = await fetch('/.netlify/functions/send-notification-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'custom',
                            data: {
                                email: item.contact_email,
                                subject: processedSubject,
                                html: processedBody,
                                signature_html: selectedSender.signature || '',
                                company_name: item.company_name,
                                contact_name: item.contact_name,
                                tier: item.contact_tier,
                                from_name: selectedSender.name,
                                from_email: selectedSender.email
                            }
                        })
                    });

                    // Parse respuesta
                    let result;
                    try {
                        result = await response.json();
                    } catch (e) {
                        console.error('Error parseando respuesta:', e);
                        result = { error: 'Invalid JSON response' };
                    }

                    if (!response.ok) {
                        throw new Error(result.error || `Error ${response.status}: ${result.message || 'Unknown error'}`);
                    }

                    console.log(`✅ Email enviado a ${item.contact_email} (ID: ${result.emailId})`);
                    addLog(`✅ ${item.contact_email} — ${item.company_name || ''}`, 'success');

                    // 1. Mark as sent in marketing_contacts (so it's not selected again)
                    await supabase.from('marketing_contacts').update({
                        email_sent_at: new Date().toISOString(),
                        last_email_sent: new Date().toISOString(),
                        email_sent_count: (item.email_sent_count || 0) + 1,
                        email_status: 'sent',
                        status: 'contactado'
                    }).eq('id', item.contact_id);

                    // 2. Log to history
                    await supabase.from('crm_email_logs').insert({
                        recipient_email: item.contact_email,
                        subject: processedSubject,
                        html_content: processedBody,
                        rendered_html: buildEmailPreviewShell({
                            html: processedBody,
                            signatureHtml: selectedSender.signature || '',
                            companyName: item.company_name || 'Negocio'
                        }),
                        status: 'sent',
                        tier: item.contact_tier,
                        template_id: selectedTemplate.id,
                        contact_id: item.contact_id,
                        message_id: result.emailId || null
                    });

                    await supabase.from('campaign_history').insert({
                        contact_id: item.contact_id,
                        campaign_type: 'email',
                        status: 'sent',
                        sent_at: new Date().toISOString(),
                        message_id: result.emailId || null,
                        details: {
                            subject: processedSubject,
                            sender_email: selectedSender.email,
                            sender_name: selectedSender.name,
                            template_id: selectedTemplate.id,
                            source: 'unified_crm_manual'
                        }
                    });

                    successCount++;
                } catch (err) {
                    console.error('Send error:', err);
                    addLog(`❌ ${item.contact_email} — ${err.message}`, 'error');
                    failCount++;
                }

                setSendProgress(Math.round((i + 1) / emailQueue.length * 100));
                // Slight delay between sends to avoid rate limits
                await new Promise(r => setTimeout(r, 500));
            }

            toast.success(`Campaña finalizada: ${successCount} enviados, ${failCount} fallidos`, { id: toastId });
            addLog(`🏁 Campaña finalizada: ${successCount} ✅ ${failCount} ❌`, 'info');
            setEmailQueue([]);
            loadHistory();
            loadQueueStats();
            loadContacts();
        } catch (err) {
            toast.error('Error enviando: ' + err.message, { id: toastId });
        } finally {
            setIsSending(false);
        }
    };

    // ============ SEND TEST EMAIL ============
    const SEND_TEST_EMAIL = async () => {
        if (!selectedTemplate) {
            toast.error('Selecciona una plantilla primero');
            return;
        }
        if (!selectedSender) {
            toast.error('Selecciona un remitente primero');
            return;
        }

        const testEmails = window.prompt(
            'Ingresa los emails de prueba (separados por coma):',
            'juan.pablo.pg@hotmail.com, geobookerr@gmail.com'
        );

        if (!testEmails) return;

        const emails = testEmails.split(',').map(e => e.trim()).filter(e => e.includes('@'));

        if (emails.length === 0) {
            toast.error('No se encontraron emails válidos');
            return;
        }

        const toastId = toast.loading(`Enviando prueba a ${emails.length} correo(s)...`);

        try {
            const sampleVariables = {
                companyName: 'Mi Empresa de Prueba',
                contactName: 'Usuario de Prueba',
                tier: 'AAA'
            };

            const processedSubject = applyEmailTemplateVariables(selectedTemplate.subject, sampleVariables);
            const processedBody = applyEmailTemplateVariables(selectedTemplate.html_content, sampleVariables);

            let successCount = 0;
            for (const email of emails) {
                try {
                    const response = await fetch('/.netlify/functions/send-notification-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'custom',
                            data: {
                                email: email,
                                subject: `[PRUEBA] ${processedSubject}`,
                                html: `<div style="background:#fff3cd;padding:10px;margin-bottom:20px;border-radius:8px;border:1px solid #ffc107;"><strong>Prueba CRM</strong> - Este correo usa el mismo layout profesional del envio real.</div>${processedBody}`,
                                signature_html: selectedSender.signature || '',
                                company_name: 'Mi Empresa de Prueba',
                                contact_name: 'Usuario de Prueba',
                                tier: 'AAA',
                                from_name: selectedSender.name,
                                from_email: selectedSender.email
                            }
                        })
                    });

                    if (response.ok) successCount++;
                } catch (err) {
                    console.error('Test send error:', err);
                }
            }

            toast.success(`✅ Prueba enviada a ${successCount}/${emails.length} correos. Revisa tu bandeja.`, { id: toastId });
        } catch (err) {
            toast.error('Error enviando prueba: ' + err.message, { id: toastId });
        }
    };

    // ============ SEND TEST WHATSAPP ============
    const sendTestWhatsApp = () => {
        const phone = window.prompt(
            'Ingresa el número de teléfono para la prueba (con código de país):',
            '521234567890'
        );

        if (!phone) return;

        const message = `🧪 *PRUEBA DE WHATSAPP*\n\nEste es un mensaje de prueba del CRM de Geobooker.\n\nSi recibes esto, la configuración funciona correctamente. ✅\n\nEl mensaje real a los contactos será diferente.`;

        WhatsAppService.openWhatsApp(phone, message);
        toast.success('Abriendo WhatsApp Web para prueba...');
    };


    // ============ EMAIL PREVIEW ============
    const openEmailPreview = () => {
        if (!selectedTemplate) { toast.error('Selecciona una plantilla primero'); return; }
        const sampleVariables = { companyName: 'Empresa Ejemplo S.A.', contactName: 'Juan Contacto', tier: 'AAA' };
        const processedHtml = applyEmailTemplateVariables(selectedTemplate.html_content, sampleVariables);
        setEmailPreviewHtml(buildEmailPreviewShell({
            html: processedHtml,
            signatureHtml: selectedSender?.signature || '',
            companyName: sampleVariables.companyName
        }));
        setShowEmailPreview(true);
    };

    // ============ TABS CONFIG ============
    const tabs = [
        { id: 'contactos', label: '👥 Base de Datos', icon: Users },
        { id: 'email', label: '🚀 Campaña Email', icon: Mail },
        { id: 'whatsapp', label: '💬 WhatsApp', icon: MessageCircle },
        { id: 'plantillas', label: '✉️ Templates', icon: Edit2 },
        { id: 'kpis', label: '📈 Métricas', icon: BarChart3 },
        { id: 'historial', label: '🕐 Historial', icon: Clock },
        { id: 'config', label: '⚙️ Ajustes', icon: Settings }
    ];

    const getTierColor = (tier) => {
        switch (tier) {
            case 'AAA': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'AA': return 'bg-purple-100 text-purple-800 border-purple-300';
            case 'A': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-20">
                <div className="px-4 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            🎯 CRM & Marketing Geobooker
                        </h1>
                        <p className="text-sm text-gray-500">
                            {totalContacts.toLocaleString()} contactos • {templates.length} plantillas activas
                        </p>
                    </div>

                    {/* Email Status KPIs */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-green-500"></span>
                            <span className="text-xs font-semibold text-green-700">Enviados: {emailMetrics.enviados}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                            <span className="text-xs font-semibold text-amber-700">Pendientes: {emailMetrics.pendientes}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            <span className="text-xs font-semibold text-blue-700">Abiertos: {emailMetrics.abiertos}</span>
                        </div>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg ${
                            emailMetrics.todayCount >= 90 ? 'bg-red-50 border-red-200' :
                            emailMetrics.todayCount >= 60 ? 'bg-orange-50 border-orange-200' :
                            'bg-gray-50 border-gray-200'
                        }`}>
                            <span className="text-xs font-semibold text-gray-600">📬 Hoy: {queueStats.sentToday}/{campaignLimits.daily_email_limit}</span>
                        </div>
                    </div>
                </div>

                <div className="px-4 pb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                        <p className="font-semibold mb-1">Estado operativo del CRM</p>
                        <p>
                            `Preparación de cola` ahora inserta contactos reales en `email_queue`. `Resend/Netlify` sí envía correos desde Geobooker. `N8N` solo dispara lo que tu workflow haga: por sí solo no manda correos ni cuenta envíos si el flujo no está configurado para eso.
                        </p>
                    </div>
                </div>



                {/* Tabs - Scrollable on mobile */}
                <div className="overflow-x-auto scrollbar-hide">
                    <div className="flex border-t min-w-max">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span className="hidden sm:inline">{tab.label}</span>
                                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 max-w-7xl mx-auto">
                {/* ============ TAB: CONTACTOS ============ */}
                {activeTab === 'contactos' && (
                    <div className="space-y-4">
                        {/* Actions Bar */}
                        <div className="bg-white rounded-xl p-4 shadow-sm border">
                            <div className="flex flex-col sm:flex-row gap-3">
                                {/* Import Button */}
                                <label className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700">
                                    <Upload className="w-4 h-4" />
                                    Importar CSV/Excel
                                    <input
                                        type="file"
                                        accept=".csv,.xlsx,.xls"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                        disabled={importing}
                                    />
                                </label>

                                {/* Search */}
                                <div className="flex-1 relative">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg"
                                    />
                                </div>

                                {/* Filters */}
                                <select
                                    value={tierFilter}
                                    onChange={(e) => setTierFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg bg-white"
                                >
                                    <option value="all">Todos los Tiers</option>
                                    <option value="AAA">AAA</option>
                                    <option value="AA">AA</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                </select>
                                <select
                                    value={industryFilter}
                                    onChange={(e) => setIndustryFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg bg-white max-w-[160px]"
                                >
                                    <option value="all">Giros (Todos)</option>
                                    {uniqueIndustries.map(ind => (
                                        <option key={ind} value={ind}>{ind}</option>
                                    ))}
                                </select>
                                <select
                                    value={stateFilter}
                                    onChange={(e) => setStateFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg bg-white max-w-[150px]"
                                >
                                    <option value="all">Estados (Todos)</option>
                                    {uniqueStates.map(st => (
                                        <option key={st} value={st}>{st}</option>
                                    ))}
                                </select>
                                <select
                                    value={cityFilter}
                                    onChange={(e) => setCityFilter(e.target.value)}
                                    className="px-3 py-2 border rounded-lg bg-white max-w-[150px]"
                                >
                                    <option value="all">Ciudades (Todas)</option>
                                    {uniqueCities.map(ci => (
                                        <option key={ci} value={ci}>{ci}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Badge for Search result counts */}
                            <div className="mt-3 mb-1 inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-semibold shadow-sm w-full sm:w-auto">
                                <Search className="w-4 h-4 text-blue-500" />
                                Búsqueda lista: Encontramos {filteredContacts.length.toLocaleString()} resultados de tu DB
                            </div>

                            {/* Selection Actions */}
                            {selectedContacts.size > 0 && (
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t flex-wrap">
                                    <span className="text-sm text-gray-600">
                                        {selectedContacts.size} seleccionados
                                    </span>
                                    <button
                                        onClick={() => {
                                            setN8nMessage('');
                                            setShowN8nModal(true);
                                        }}
                                        className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                                    >
                                        🤖 Enviar Secuencia N8N
                                    </button>
                                    <button
                                        onClick={deleteSelected}
                                        className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Eliminar
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Contacts Table */}
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                                <table className="w-full min-w-[800px]">
                                    <thead className="bg-gray-50 sticky top-0">
                                        <tr>
                                            <th className="w-10 p-3">
                                                <button onClick={selectAll}>
                                                    {allVisibleSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Empresa</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Contacto</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Teléfono</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Email</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Tier</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Estado</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Fuente</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {contactsLoading ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                                                </td>
                                            </tr>
                                        ) : filteredContacts.length === 0 ? (
                                            <tr>
                                                <td colSpan={8} className="p-8 text-center text-gray-500">
                                                    No hay contactos. Importa un archivo CSV.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredContacts.slice(0, 100).map(contact => (
                                                <tr
                                                    key={contact.id}
                                                    className="hover:bg-blue-50 cursor-pointer transition-colors"
                                                    onClick={() => setDrawerContact(contact)}
                                                >
                                                    <td className="p-3">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                toggleContact(contact.id);
                                                            }}
                                                        >
                                                            {selectedContacts.has(contact.id) ? (
                                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-gray-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium text-sm max-w-[200px] truncate" title={contact.company_name}>
                                                        {contact.company_name || '-'}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-600">
                                                        {contact.contact_name || '-'}
                                                    </td>
                                                    <td className="p-3 text-sm">
                                                        {contact.phone ? (
                                                            <span className="text-green-600 font-medium">{contact.phone}</span>
                                                        ) : (
                                                            <span className="text-gray-400">-</span>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-sm text-blue-600 max-w-[200px] truncate" title={contact.email}>
                                                        {contact.email || '-'}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTierColor(contact.tier)}`}>
                                                            {contact.tier}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-xs">
                                                        <div className="flex gap-1">
                                                            {contact.email_status === 'sent' ? (
                                                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded" title="Email enviado">📧✅</span>
                                                            ) : contact.email && (
                                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded" title="Email pendiente">📧⏳</span>
                                                            )}
                                                            {contact.whatsapp_status === 'sent' ? (
                                                                <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded" title="WhatsApp enviado">📱✅</span>
                                                            ) : contact.phone && (
                                                                <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded" title="WhatsApp pendiente">📱⏳</span>
                                                            )}
                                                            {!contact.email && !contact.phone && (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-xs">
                                                        {contact.source === 'google_places' ? (
                                                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded">🇲🇽 Nacional</span>
                                                        ) : contact.source === 'apify' ? (
                                                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">🌍 Apify</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">📁 CSV</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {filteredContacts.length > 100 && (
                                <div className="p-3 text-center text-sm text-gray-500 bg-gray-50">
                                    Mostrando 100 de {filteredContacts.length}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============ TAB: PLANTILLAS ============ */}
                {activeTab === 'plantillas' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Plantillas de Email</h2>
                            <button
                                onClick={() => {
                                    setSelectedTemplate(null);
                                    setTemplateForm({ name: '', subject: '', html_content: '', template_type: 'promotional', is_active: true });
                                    setShowTemplateModal(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                Nueva Plantilla
                            </button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {templates.map(template => (
                                <div
                                    key={template.id}
                                    className={`bg-white rounded-xl p-4 border-2 cursor-pointer transition-all ${selectedTemplate?.id === template.id
                                        ? 'border-blue-500 shadow-lg'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    onClick={() => setSelectedTemplate(template)}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-semibold text-gray-900">{template.name}</h3>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedTemplate(template);
                                                    setTemplateForm(template);
                                                    setShowTemplateModal(true);
                                                }}
                                                className="p-1 hover:bg-gray-100 rounded"
                                            >
                                                <Edit2 className="w-4 h-4 text-gray-500" />
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteTemplate(template.id, template.template_type);
                                                }}
                                                className="p-1 hover:bg-red-100 rounded"
                                            >
                                                <Trash2 className="w-4 h-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-600 truncate">
                                        📧 {template.subject}
                                    </p>
                                    {selectedTemplate?.id === template.id && (
                                        <div className="mt-2 pt-2 border-t">
                                            <span className="text-xs text-blue-600 font-medium">✓ Seleccionada</span>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {templates.length === 0 && (
                                <div className="col-span-full bg-white rounded-xl p-8 text-center text-gray-500">
                                    No hay plantillas. Crea una para empezar.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* ============ TAB: WHATSAPP ============ */}
                {activeTab === 'whatsapp' && (
                    <WhatsAppCRM />
                )}

                {/* ============ TAB: EMAIL ============ */}
                {activeTab === 'email' && (
                    <div className="space-y-6">
                        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <Mail className="h-5 w-5 text-blue-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-blue-700">
                                        <strong>Email Marketing</strong> - Solo contactos de CSV.
                                        Los contactos con WhatsApp enviado hace 15+ días se reciclan aquí.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <MarketingDashboard />
                    </div>
                )}

                {/* ============ TAB: KPIS ============ */}
                {activeTab === 'kpis' && (
                    <KPIsPanel />
                )}

                {/* ============ TAB: LANZAR ============ */}
                {activeTab === 'lanzar' && (
                    <div className="space-y-6">
                        {/* Canal Selector */}
                        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setCampaignType('email')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${campaignType === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </div>
                            </button>
                            <button
                                onClick={() => setCampaignType('whatsapp')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${campaignType === 'whatsapp' ? 'bg-white shadow-sm text-green-600' : 'text-gray-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </div>
                            </button>
                        </div>

                        {campaignType === 'email' ? (
                            <div className="space-y-6">
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <Mail className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                Estás usando el nuevo motor de <strong>Email Marketing Profesional</strong>.
                                                Este sistema maneja automáticamente los 15,000+ leads, las plantillas dinámicas y los límites diarios.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Action: Generar Cola de 100 Emails */}
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-xl font-bold flex items-center gap-2">
                                                📧 Envío Rápido de Emails
                                            </h3>
                                            <p className="text-blue-100 text-sm mt-1">
                                                Prepara una cola real en base de datos con hasta {campaignLimits.daily_email_limit} contactos pendientes para enviar hoy.
                                                Los contactos ya enviados no se repetirán.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <select
                                                value={emailSearchTier}
                                                onChange={(e) => setEmailSearchTier(e.target.value)}
                                                className="px-3 py-2 rounded-lg text-gray-800 bg-white border-0"
                                            >
                                                <option value="all">Todos los Tiers</option>
                                                <option value="AAA">Solo AAA</option>
                                                <option value="AA">Solo AA</option>
                                                <option value="A">Solo A</option>
                                            </select>
                                            {/* 🌟 Botón Preview Email */}
                                            {selectedTemplate && (
                                                <button
                                                    onClick={openEmailPreview}
                                                    className="flex items-center gap-2 px-4 py-2.5 bg-white/20 text-white border border-white/30 rounded-lg font-medium hover:bg-white/30 transition"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Vista previa
                                                </button>
                                            )}
                                            <button
                                                onClick={generateQueue}
                                                className="flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-lg font-bold hover:bg-blue-50 transition shadow-lg"
                                            >
                                                <Play className="w-5 h-5" />
                                                Preparar Cola Real
                                            </button>
                                        </div>
                                    </div>

                                    {/* Email Queue Display */}
                                    {/* 🌟 Live Campaign Log */}
                                    {campaignLog.length > 0 && (
                                        <div className="mt-4 bg-gray-900 rounded-xl p-4 max-h-48 overflow-y-auto">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">📡 Log en vivo</span>
                                                {isSending && <span className="flex gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping"></span></span>}
                                            </div>
                                            <div className="space-y-0.5 font-mono text-xs">
                                                {campaignLog.map((entry, i) => (
                                                    <div key={i} className={`flex gap-2 ${
                                                        entry.type === 'success' ? 'text-green-400' :
                                                        entry.type === 'error' ? 'text-red-400' : 'text-blue-300'
                                                    }`}>
                                                        <span className="text-gray-500 flex-shrink-0">[{entry.t}]</span>
                                                        <span>{entry.msg}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Barra de progreso mejorada */}
                                    {isSending && (
                                        <div className="mt-4">
                                            <div className="flex justify-between text-xs text-white/80 mb-1">
                                                <span>Progreso de envío</span>
                                                <span>{sendProgress}%</span>
                                            </div>
                                            <div className="w-full bg-white/20 rounded-full h-2">
                                                <div
                                                    className="bg-white h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${sendProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                    {emailQueue.length > 0 && (
                                        <div className="mt-4 bg-white/10 rounded-lg p-4">
                                            <div className="flex flex-wrap justify-between items-center gap-3 mb-2">
                                                <div>
                                                    <span className="font-medium">📋 Cola actual: {emailQueue.length} emails</span>
                                                    <p className="text-xs text-blue-200 mt-1">
                                                        Preparados en cola real para envío con Resend desde Geobooker.
                                                    </p>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <button
                                                        onClick={openEmailPreview}
                                                        className="px-4 py-2 bg-white/15 border border-white/20 rounded-lg text-sm font-medium text-white hover:bg-white/25"
                                                    >
                                                        Vista previa
                                                    </button>
                                                    <button
                                                        onClick={sendCampaign}
                                                        disabled={!selectedTemplate || !selectedSender || isSending || emailQueue.length === 0}
                                                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {isSending ? 'Enviando...' : `Enviar ${emailQueue.length} emails`}
                                                    </button>
                                                    <button
                                                        onClick={() => setEmailQueue([])}
                                                        className="text-sm text-blue-200 hover:text-white"
                                                    >
                                                        Limpiar cola
                                                    </button>
                                                </div>
                                            </div>
                                            <p className="text-blue-200 text-xs">
                                                El envío real usa la plantilla seleccionada, el remitente activo y registra historial con `message_id` de Resend.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <MarketingDashboard />
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* WhatsApp Queue */}
                                {waQueue.length > 0 ? (
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
                                            <div>
                                                <h3 className="font-bold">Cola de Envío Colectivo WhatsApp ({waQueue.length})</h3>
                                                <p className="text-xs text-gray-500 mt-1">Haz clic en "Enviar" para abrir WhatsApp Web y luego marcar como "Hecho".</p>
                                            </div>
                                            <button
                                                onClick={sendTestWhatsApp}
                                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium hover:bg-yellow-600"
                                            >
                                                <Eye className="w-4 h-4" />
                                                Probar WhatsApp
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '500px' }}>
                                            <table className="w-full min-w-[700px] text-sm">
                                                <thead className="bg-gray-50 font-bold sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 text-left">Contacto / Empresa</th>
                                                        <th className="p-3 text-left">Teléfono</th>
                                                        <th className="p-3 text-left">Tier</th>
                                                        <th className="p-3 text-center">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {waQueue.map((item) => (
                                                        <tr key={item.contact_id} className="hover:bg-gray-50">
                                                            <td className="p-3">
                                                                <div className="font-bold">{item.contact_name}</div>
                                                                <div className="text-xs text-gray-500">{item.company_name}</div>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="text-xs text-blue-600 font-medium">{item.contact_phone}</div>
                                                            </td>
                                                            <td className="p-3">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getTierColor(item.contact_tier)}`}>
                                                                    {item.contact_tier}
                                                                </span>
                                                            </td>
                                                            <td className="p-3">
                                                                <div className="flex justify-center gap-2">
                                                                    <button
                                                                        onClick={() => {
                                                                            const msg = whatsappConfig.default_message || 'Hola!';
                                                                            WhatsAppService.openWhatsApp(item.contact_phone, msg);
                                                                        }}
                                                                        className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                                                    >
                                                                        <MessageCircle className="w-4 h-4" />
                                                                        Enviar
                                                                    </button>
                                                                    <button
                                                                        onClick={() => markWaSent(item.contact_id)}
                                                                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
                                                                    >
                                                                        Hecho
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed">
                                        <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                        <h4 className="text-lg font-medium text-gray-900">No hay cola de WhatsApp</h4>
                                        <p className="text-gray-500 max-w-xs mx-auto mt-2">Usa el botón "Generar Nueva Cola" arriba buscando contactos con teléfono pendientes.</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* ============ TAB: CONFIG ============ */}
                {activeTab === 'config' && (
                    <div className="space-y-6">
                        {/* Email Testing Section */}
                        <EmailTester />

                        {/* WhatsApp Section */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-green-600" />
                                WhatsApp Business
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Número de Teléfono (Formato Internacional)</label>
                                        <input
                                            type="text"
                                            value={whatsappConfig.phone}
                                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, phone: e.target.value }))}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="525512345678"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre para Mostrar</label>
                                        <input
                                            type="text"
                                            value={whatsappConfig.display_number}
                                            onChange={(e) => setWhatsappConfig(prev => ({ ...prev, display_number: e.target.value }))}
                                            className="w-full p-2 border rounded-lg"
                                            placeholder="+52 55 1234 5678"
                                        />
                                    </div>
                                    <button
                                        onClick={() => saveSettings('whatsapp_business', whatsappConfig)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                        Guardar WhatsApp
                                    </button>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje Predeterminado</label>
                                    <textarea
                                        rows={4}
                                        value={whatsappConfig.default_message}
                                        onChange={(e) => setWhatsappConfig(prev => ({ ...prev, default_message: e.target.value }))}
                                        className="w-full p-2 border rounded-lg text-sm"
                                        placeholder="¡Hola! Vi tu perfil en Geobooker..."
                                    />
                                    <p className="text-xs text-gray-400 mt-2">Este mensaje se usará cuando abras un chat desde el Scraper o contactos.</p>
                                </div>
                            </div>
                        </div>

                        {/* Email Senders Section */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-bold flex items-center gap-2">
                                    <Mail className="w-5 h-5 text-blue-600" />
                                    Remitentes de Email
                                </h3>
                                <button
                                    onClick={() => setSenders(prev => [...prev, { name: '', email: '', signature: '', use_for: [] }])}
                                    className="text-sm text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg flex items-center gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Agregar Remitente
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                                    Resend debe enviar desde un correo verificado del dominio de Geobooker.
                                    Si aquí capturas un Gmail u otro externo, el sistema ahora lo usará como respuesta (`reply-to`), pero el envío real saldrá desde <strong>hola@geobooker.com.mx</strong>.
                                </div>
                                {senders.map((sender, idx) => (
                                    <div key={idx} className="p-4 border rounded-xl bg-gray-50/50 space-y-3">
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre</label>
                                                <input
                                                    type="text"
                                                    value={sender.name}
                                                    onChange={(e) => {
                                                        const newSenders = [...senders];
                                                        newSenders[idx].name = e.target.value;
                                                        setSenders(newSenders);
                                                    }}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="Juan Pablo CEO"
                                                />
                                            </div>
                                            <div className="flex-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Correo Electrónico</label>
                                                <input
                                                    type="email"
                                                    value={sender.email}
                                                    onChange={(e) => {
                                                        const newSenders = [...senders];
                                                        newSenders[idx].email = e.target.value;
                                                        setSenders(newSenders);
                                                    }}
                                                    className="w-full p-2 border rounded-lg"
                                                    placeholder="juanpablopg@geobooker.com.mx"
                                                />
                                            </div>
                                            <button
                                                onClick={() => setSenders(prev => prev.filter((_, i) => i !== idx))}
                                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg self-end"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Firma HTML</label>
                                            <textarea
                                                rows={3}
                                                value={sender.signature}
                                                onChange={(e) => {
                                                    const newSenders = [...senders];
                                                    newSenders[idx].signature = e.target.value;
                                                    setSenders(newSenders);
                                                }}
                                                className="w-full p-2 border rounded-lg text-xs font-mono"
                                                placeholder="<div>...</div>"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {senders.length > 0 && (
                                <button
                                    onClick={() => saveSettings('email_senders', senders)}
                                    className="mt-6 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
                                >
                                    Guardar Remitentes
                                </button>
                            )}
                        </div>

                        {/* Limits Section */}
                        <div className="bg-white rounded-xl shadow-sm border p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-purple-600" />
                                Límites de Campaña
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium">Emails por Día</label>
                                            <span className="font-bold text-blue-600">{campaignLimits.daily_email_limit}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="500"
                                            value={campaignLimits.daily_email_limit}
                                            onChange={(e) => setCampaignLimits(prev => ({ ...prev, daily_email_limit: parseInt(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <label className="text-sm font-medium">WhatsApp por Día</label>
                                            <span className="font-bold text-green-600">{campaignLimits.daily_whatsapp_limit}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="1"
                                            max="200"
                                            value={campaignLimits.daily_whatsapp_limit}
                                            onChange={(e) => setCampaignLimits(prev => ({ ...prev, daily_whatsapp_limit: parseInt(e.target.value) }))}
                                            className="w-full"
                                        />
                                    </div>
                                    <button
                                        onClick={() => saveSettings('campaign_limits', campaignLimits)}
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                                    >
                                        Guardar Límites
                                    </button>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
                                    <h4 className="font-bold mb-2 flex items-center gap-2">
                                        💡 Recomendación de Calentamiento
                                    </h4>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>Semana 1: Máximo 20 emails / día</li>
                                        <li>Semana 2: Aumentar a 40 emails / día</li>
                                        <li>Meta: 100-200 emails / día para evitar spam</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Re-engagement Section */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-orange-100 text-left">
                                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-orange-700">
                                    <RefreshCw className="w-5 h-5" />
                                    Re-engagement (Seguimiento)
                                </h2>
                                <p className="text-sm text-gray-600 mb-6">
                                    Permite que contactos ya contactados vuelvan a la cola si no han respondido después de cierto tiempo.
                                </p>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            Días para volver a contactar
                                        </label>
                                        <input
                                            type="number"
                                            value={followUpDays}
                                            onChange={(e) => setFollowUpDays(parseInt(e.target.value))}
                                            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                            min="1"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">
                                            Solo se reiniciarán aquellos contactados hace más de {followUpDays} días.
                                        </p>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <button
                                            onClick={() => handleResetCampaign('email')}
                                            disabled={isResetting}
                                            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold shadow-sm"
                                        >
                                            <Mail className="w-4 h-4" />
                                            Reciclar Cola de Emails
                                        </button>
                                        <button
                                            onClick={() => handleResetCampaign('whatsapp')}
                                            disabled={isResetting}
                                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 disabled:opacity-50 text-sm font-bold shadow-sm"
                                        >
                                            <MessageCircle className="w-4 h-4" />
                                            Reciclar Cola de WhatsApp
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Template Modal */}
            {
                showTemplateModal && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                            <div className="p-6 border-b flex justify-between items-center sticky top-0 bg-white">
                                <h2 className="text-xl font-bold">
                                    {selectedTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}
                                </h2>
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Nombre</label>
                                    <input
                                        type="text"
                                        value={templateForm.name}
                                        onChange={(e) => setTemplateForm(p => ({ ...p, name: e.target.value }))}
                                        className="w-full p-3 border rounded-xl"
                                        placeholder="Ej: Gancho Restaurantes"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Asunto</label>
                                    <input
                                        type="text"
                                        value={templateForm.subject}
                                        onChange={(e) => setTemplateForm(p => ({ ...p, subject: e.target.value }))}
                                        className="w-full p-3 border rounded-xl"
                                        placeholder="Usa {{empresa}}, {{nombre}} para personalizar"
                                    />
                                </div>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Tipo de plantilla</label>
                                        <select
                                            value={templateForm.template_type}
                                            onChange={(e) => setTemplateForm(p => ({ ...p, template_type: e.target.value }))}
                                            className="w-full p-3 border rounded-xl"
                                        >
                                            <option value="promotional">Manual: Promocional</option>
                                            <option value="custom">Manual: Personalizada</option>
                                            <option value="invitation">Automatica: Invitacion</option>
                                            <option value="followup">Automatica: Follow Up</option>
                                            <option value="reengagement">Automatica: Re-engagement</option>
                                        </select>
                                    </div>
                                    <label className="flex items-center gap-3 mt-8 md:mt-0">
                                        <input
                                            type="checkbox"
                                            checked={Boolean(templateForm.is_active)}
                                            onChange={(e) => setTemplateForm(p => ({ ...p, is_active: e.target.checked }))}
                                            className="w-4 h-4"
                                        />
                                        <span className="text-sm font-medium">Plantilla activa</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2">Cuerpo (HTML)</label>
                                    <textarea
                                        value={templateForm.html_content}
                                        onChange={(e) => setTemplateForm(p => ({ ...p, html_content: e.target.value }))}
                                        className="w-full p-3 border rounded-xl h-48 font-mono text-sm"
                                        placeholder="<p>Hola {{nombre}},</p>"
                                    />
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                                    Variables soportadas: <code>{'{contact_name}'}</code>, <code>{'{company_name}'}</code>, <code>{'{tier}'}</code>, <code>{'{{nombre}}'}</code>, <code>{'{{empresa}}'}</code>.
                                    Las automaticas usan por ronda: <strong>invitation</strong>, <strong>followup</strong>, <strong>reengagement</strong>.
                                </div>
                            </div>
                            <div className="p-6 border-t flex justify-end gap-3">
                                <button
                                    onClick={() => setShowTemplateModal(false)}
                                    className="px-4 py-2 text-gray-600"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={saveTemplate}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-xl font-medium"
                                >
                                    Guardar
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* N8N Modal */}
            {showN8nModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-purple-50">
                            <h2 className="text-xl font-bold flex items-center gap-2 text-purple-900">
                                🤖 Enviar {selectedContacts.size} contactos a N8N
                            </h2>
                            <button onClick={() => setShowN8nModal(false)} className="p-2 hover:bg-purple-100 rounded-lg text-purple-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-purple-100 p-3 rounded-lg text-sm text-purple-800">
                                Escribe un correo, solicitud o mensaje especial para <strong>estas {selectedContacts.size} empresas seleccionadas</strong>. Este texto se enviará a tu flujo de N8N en la variable `custom_message`.
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Mensaje Personalizado (Opcional)</label>
                                <textarea
                                    value={n8nMessage}
                                    onChange={(e) => setN8nMessage(e.target.value)}
                                    className="w-full p-4 border-2 border-purple-100 rounded-xl focus:border-purple-500 focus:ring-0 text-sm h-40"
                                    placeholder="Ej: Hola {{contact_name}}, vimos su empresa {{company_name}} en {{city}} y nos interesó..."
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                            <button onClick={() => setShowN8nModal(false)} className="px-4 py-2 font-medium text-gray-600 hover:text-gray-900">Cancelar</button>
                            <button
                                onClick={() => {
                                    triggerN8NForContacts(selectedContacts, n8nMessage);
                                    setShowN8nModal(false);
                                }}
                                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
                            >
                                <Play className="w-4 h-4 fill-current" /> Enviar a N8N
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile-friendly scrollbar styles */}
            <style>{`
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>

            {/* ====================================================
                🌟 DRAWER: Detalle de Contacto
                Panel lateral que aparece al hacer click en una fila
            ==================================================== */}
            {drawerContact && (
                <div className="fixed inset-0 z-50 flex">
                    {/* Overlay */}
                    <div
                        className="flex-1 bg-black/40 backdrop-blur-sm"
                        onClick={() => setDrawerContact(null)}
                    />
                    {/* Panel */}
                    <div className="w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col animate-slide-in-right">
                        {/* Header del drawer */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-5 flex items-start justify-between flex-shrink-0">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
                                        drawerContact.tier === 'AAA' ? 'bg-yellow-400 text-yellow-900 border-yellow-300' :
                                        drawerContact.tier === 'AA'  ? 'bg-purple-300 text-purple-900 border-purple-200' :
                                        drawerContact.tier === 'A'   ? 'bg-blue-300 text-blue-900 border-blue-200' :
                                        'bg-gray-200 text-gray-700 border-gray-200'
                                    }`}>{drawerContact.tier}</span>
                                    {drawerContact.email_status === 'sent' && (
                                        <span className="text-xs bg-green-400/20 text-green-100 px-2 py-0.5 rounded-full">📧 Email enviado</span>
                                    )}
                                </div>
                                <h2 className="text-lg font-bold truncate">{drawerContact.company_name || 'Sin empresa'}</h2>
                                <p className="text-blue-200 text-sm">{drawerContact.contact_name || 'Sin contacto'}</p>
                            </div>
                            <button
                                onClick={() => setDrawerContact(null)}
                                className="p-2 hover:bg-white/20 rounded-lg ml-2 flex-shrink-0"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Cuerpo del drawer */}
                        <div className="flex-1 p-5 space-y-4">
                            {/* Información de contacto */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">📋 Datos de Contacto</h3>
                                {drawerContact.email && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Mail className="w-4 h-4 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-400">Email</p>
                                            <a href={`mailto:${drawerContact.email}`}
                                               className="text-sm font-medium text-blue-600 hover:underline truncate block">
                                                {drawerContact.email}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {drawerContact.phone && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <MessageCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Teléfono</p>
                                            <a href={`https://wa.me/${drawerContact.phone?.replace(/\D/g,'')}`}
                                               target="_blank" rel="noopener noreferrer"
                                               className="text-sm font-medium text-green-600 hover:underline">
                                                {drawerContact.phone}
                                            </a>
                                        </div>
                                    </div>
                                )}
                                {drawerContact.city && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-4 h-4 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Ciudad / Estado</p>
                                            <p className="text-sm font-medium text-gray-800">
                                                {[drawerContact.city, drawerContact.state].filter(Boolean).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                )}
                                {drawerContact.industry && (
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <BarChart3 className="w-4 h-4 text-purple-600" />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-400">Giro / Industria</p>
                                            <p className="text-sm font-medium text-gray-800">{drawerContact.industry}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Estado de campañas */}
                            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">📊 Estado de Campañas</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className={`p-3 rounded-lg text-center ${drawerContact.email_status === 'sent' ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                                        <p className="text-2xl mb-0.5">{drawerContact.email_status === 'sent' ? '✅' : '⏳'}</p>
                                        <p className="text-xs font-semibold text-gray-700">Email</p>
                                        <p className="text-xs text-gray-400">{drawerContact.email_status === 'sent' ? 'Enviado' : 'Pendiente'}</p>
                                        {(drawerContact.email_sent_at || drawerContact.last_email_sent) && (
                                            <p className="text-xs text-gray-400 mt-1">{new Date(drawerContact.email_sent_at || drawerContact.last_email_sent).toLocaleDateString()}</p>
                                        )}
                                    </div>
                                    <div className={`p-3 rounded-lg text-center ${drawerContact.whatsapp_status === 'sent' ? 'bg-green-50 border border-green-200' : 'bg-gray-100'}`}>
                                        <p className="text-2xl mb-0.5">{drawerContact.whatsapp_status === 'sent' ? '✅' : '⏳'}</p>
                                        <p className="text-xs font-semibold text-gray-700">WhatsApp</p>
                                        <p className="text-xs text-gray-400">{drawerContact.whatsapp_status === 'sent' ? 'Enviado' : 'Pendiente'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Metadatos */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">🔍 Metadatos</h3>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Fuente</span>
                                        <span className="font-medium text-gray-700">{drawerContact.source || 'CSV'}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">Creado</span>
                                        <span className="font-medium text-gray-700">
                                            {drawerContact.created_at ? new Date(drawerContact.created_at).toLocaleDateString() : '—'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-400">ID</span>
                                        <span className="font-mono text-gray-400 text-[10px]">{drawerContact.id?.slice(0,8)}…</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer del drawer — acciones rápidas */}
                        <div className="p-4 border-t bg-white flex-shrink-0 space-y-2">
                            {drawerContact.email && (
                                <a
                                    href={`mailto:${drawerContact.email}`}
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition"
                                >
                                    <Mail className="w-4 h-4" />
                                    Enviar email directo
                                </a>
                            )}
                            {drawerContact.phone && (
                                <a
                                    href={`https://wa.me/${drawerContact.phone?.replace(/\D/g,'')}`}
                                    target="_blank" rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition"
                                >
                                    <MessageCircle className="w-4 h-4" />
                                    Abrir WhatsApp
                                </a>
                            )}
                            <button
                                onClick={() => {
                                    toggleContact(drawerContact.id);
                                    setDrawerContact(null);
                                }}
                                className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-sm"
                            >
                                {selectedContacts.has(drawerContact.id) ? '☑ Deseleccionar' : '☐ Seleccionar para campaña'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====================================================
                🌟 MODAL: Vista Previa de Email
            ==================================================== */}
            {showEmailPreview && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b bg-gray-50 flex-shrink-0">
                            <div>
                                <h2 className="font-bold text-gray-900">👁 Vista Previa del Email</h2>
                                <p className="text-xs text-gray-500 mt-0.5">
                                    Plantilla: <strong>{selectedTemplate?.name}</strong> · Remitente: {selectedSender?.name || '—'}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowEmailPreview(false)}
                                className="p-2 hover:bg-gray-200 rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        {/* Subheader — asunto del email */}
                        <div className="px-4 py-2 bg-blue-50 border-b flex-shrink-0">
                            <p className="text-xs text-gray-500">Asunto:</p>
                            <p className="text-sm font-semibold text-gray-800">{selectedTemplate?.subject}</p>
                        </div>
                        {/* Preview iframe */}
                        <div className="flex-1 overflow-auto p-4">
                            <div className="border rounded-xl overflow-hidden bg-white min-h-[300px]">
                                <iframe
                                    srcDoc={emailPreviewHtml}
                                    title="Email Preview"
                                    className="w-full"
                                    style={{ minHeight: '400px', border: 'none' }}
                                    sandbox="allow-same-origin"
                                />
                            </div>
                            <p className="text-xs text-gray-400 mt-2 text-center">
                                ⚠️ Vista de prueba con datos de ejemplo. Los emails reales usarán los datos de cada contacto.
                            </p>
                        </div>
                        {/* Footer */}
                        <div className="p-4 border-t bg-gray-50 flex justify-between items-center flex-shrink-0">
                            <p className="text-xs text-gray-500">Cola actual: <strong>{emailQueue.length}</strong> emails listos</p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowEmailPreview(false)}
                                    className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition"
                                >
                                    Cerrar
                                </button>
                                <button
                                    onClick={() => { setShowEmailPreview(false); sendCampaign(); }}
                                    disabled={emailQueue.length === 0 || isSending}
                                    className="px-5 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    Enviar {emailQueue.length} emails
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes slide-in-right {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                .animate-slide-in-right { animation: slide-in-right 0.25s ease-out; }
            `}</style>
        </div >
    );
};

export default UnifiedCRM;








