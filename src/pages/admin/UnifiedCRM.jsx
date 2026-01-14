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
import * as XLSX from 'xlsx';

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
    const [typeFilter, setTypeFilter] = useState('all');

    // Templates State
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateForm, setTemplateForm] = useState({
        name: '', subject: '', body_html: '', template_type: 'promotional'
    });

    // Stats State
    const [companyTypeStats, setCompanyTypeStats] = useState([]);
    const [tierStats, setTierStats] = useState([]);
    const [statsLoading, setStatsLoading] = useState(false);

    // Campaign State
    const [campaignType, setCampaignType] = useState('email'); // 'email' or 'whatsapp'
    const [dailyLimit, setDailyLimit] = useState(100);
    const [selectedSender, setSelectedSender] = useState(null);
    const [emailQueue, setEmailQueue] = useState([]);
    const [waQueue, setWaQueue] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [sendProgress, setSendProgress] = useState(0);
    const [waSearchTier, setWaSearchTier] = useState('all');
    const [emailSearchTier, setEmailSearchTier] = useState('all');

    // History State
    const [emailLogs, setEmailLogs] = useState([]);
    const [waLogs, setWaLogs] = useState([]);
    const [followUpDays, setFollowUpDays] = useState(15);
    const [isResetting, setIsResetting] = useState(false);

    // Settings State
    const [senders, setSenders] = useState([]);
    const [whatsappConfig, setWhatsappConfig] = useState({ phone: '', display_number: '', default_message: '' });
    const [campaignLimits, setCampaignLimits] = useState({ daily_email_limit: 100, daily_whatsapp_limit: 50 });
    const [settingsLoading, setSettingsLoading] = useState(false);

    // Import State
    const [importing, setImporting] = useState(false);
    const [previewData, setPreviewData] = useState([]);

    // Company Types for filter
    const [companyTypes, setCompanyTypes] = useState([]);

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        await Promise.all([
            loadContacts(),
            loadTemplates(),
            loadStats(),
            loadHistory(),
            loadSettings()
        ]);
    };

    const loadSettings = async () => {
        setSettingsLoading(true);
        try {
            const { data, error } = await supabase
                .from('crm_settings')
                .select('*');

            if (error) throw error;

            data.forEach(s => {
                if (s.setting_key === 'email_senders') {
                    setSenders(s.setting_value);
                    if (s.setting_value.length > 0) setSelectedSender(s.setting_value[0]);
                }
                if (s.setting_key === 'whatsapp_business') setWhatsappConfig(s.setting_value);
                if (s.setting_key === 'campaign_limits') setCampaignLimits(s.setting_value);
            });
        } catch (err) {
            console.error('Error cargando configuración:', err);
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
                .from('crm_contacts')
                .select('*', { count: 'exact', head: true });

            // Get tier distribution (Proper grouped count)
            const tiers = ['AAA', 'AA', 'A', 'B'];
            const tierCounts = {};

            await Promise.all(tiers.map(async (tier) => {
                const { count } = await supabase
                    .from('crm_contacts')
                    .select('*', { count: 'exact', head: true })
                    .eq('tier', tier);
                tierCounts[tier] = count || 0;
            }));

            setTierStats(Object.entries(tierCounts).map(([tier, count]) => ({
                tier,
                total_contacts: count,
                with_email: count,
                with_phone: 0
            })));

            // Get sample for display
            const { data, error } = await supabase
                .from('crm_contacts')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(500);

            if (error) throw error;
            setContacts(data || []);
            setTotalContacts(totalCount || 0);

            // Update header to show total
            console.log(`📊 Total contactos en DB: ${totalCount}`);

            // Get unique company types
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
                name: row.Nombre || row.name || row.Name || '',
                email: (row.Email || row.email || row['Email corporativo'] || '').trim().toLowerCase(),
                company: row.Empresa || row.company || row.Company || '',
                position: row.Puesto || row.position || row.Position || '',
                phone: row.Telefono || row.phone || row.Phone || row['Teléfono'] || '',
                tier: normalizeTier(row.Tier || row.tier || 'A'),
                company_type: row['Tipo de empresa'] || row.company_type || row.Tipo || '',
                city: row.Ciudad || row.city || row.City || '',
                website: row.Web || row.website || row['Sitio web'] || ''
            })).filter(c => c.email && c.email.includes('@')); // Only contacts with valid email

            if (contacts.length === 0) {
                toast.error('No se encontraron contactos con email válido', { id: toastId });
                return;
            }

            console.log(`Importing ${contacts.length} contacts...`);

            // Use insert instead of upsert if upsert fails
            const { error } = await supabase
                .from('crm_contacts')
                .upsert(contacts, {
                    onConflict: 'email',
                    ignoreDuplicates: true
                });

            if (error) {
                console.error('Upsert error:', error);
                // Fallback: try inserting one by one, skipping duplicates
                let imported = 0;
                for (const contact of contacts) {
                    const { error: insertError } = await supabase
                        .from('crm_contacts')
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

    const toggleContact = (id) => {
        setSelectedContacts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const selectAll = () => {
        if (selectedContacts.size === filteredContacts.length) {
            setSelectedContacts(new Set());
        } else {
            setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
        }
    };

    const deleteSelected = async () => {
        if (!confirm(`¿Eliminar ${selectedContacts.size} contactos?`)) return;

        const toastId = toast.loading('Eliminando...');
        try {
            const { error } = await supabase
                .from('crm_contacts')
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

    const filteredContacts = contacts.filter(c => {
        const matchSearch = !searchTerm ||
            c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.company?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchTier = tierFilter === 'all' || c.tier === tierFilter;
        const matchType = typeFilter === 'all' || c.company_type === typeFilter;
        return matchSearch && matchTier && matchType;
    });

    // ============ TEMPLATES FUNCTIONS ============
    const loadTemplates = async () => {
        try {
            const { data, error } = await supabase
                .from('email_templates')
                .select('*')
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
            setTemplateForm({ name: '', subject: '', body_html: '', template_type: 'promotional' });
            loadTemplates();
        } catch (err) {
            toast.error('Error guardando', { id: toastId });
        }
    };

    const deleteTemplate = async (id) => {
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
        try {
            if (campaignType === 'email') {
                const { data, error } = await supabase
                    .rpc('generate_email_queue', {
                        daily_limit: dailyLimit,
                        min_per_type: 5,
                        target_tier: emailSearchTier === 'all' ? null : emailSearchTier
                    });

                if (error) throw error;
                setEmailQueue(data || []);
                toast.success(`Cola generada: ${data?.length || 0} emails`);
            } else {
                const { data, error } = await supabase
                    .rpc('generate_whatsapp_queue', {
                        daily_limit: dailyLimit,
                        target_tier: waSearchTier === 'all' ? null : waSearchTier
                    });

                if (error) throw error;
                setWaQueue(data || []);
                toast.success(`Cola generada: ${data?.length || 0} WhatsApps`);
            }
        } catch (err) {
            toast.error('Error generando cola');
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
        const toastId = toast.loading('Enviando campaña...');

        try {
            let successCount = 0;
            let failCount = 0;

            for (let i = 0; i < emailQueue.length; i++) {
                const item = emailQueue[i];

                // Process template with contact data
                let processedBody = selectedTemplate.body_html;
                const variables = {
                    empresa: item.contact_name || 'Negocio',
                    nombre: item.contact_name || 'Amigo',
                    tier: item.contact_tier
                };

                Object.keys(variables).forEach(key => {
                    const regex = new RegExp(`{{${key}}}`, 'g');
                    processedBody = processedBody.replace(regex, variables[key]);
                });

                // Add signature
                const finalHtml = `${processedBody} ${selectedSender.signature || ''}`;

                try {
                    const response = await fetch('/.netlify/functions/send-notification-email', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'custom',
                            data: {
                                email: item.contact_email,
                                subject: selectedTemplate.subject,
                                html: finalHtml,
                                from_name: selectedSender.name,
                                from_email: selectedSender.email
                            }
                        })
                    });

                    if (!response.ok) throw new Error('Failed to send');

                    // Log to history
                    await supabase.from('crm_email_logs').insert({
                        recipient_email: item.contact_email,
                        subject: selectedTemplate.subject,
                        body_html: finalHtml,
                        status: 'sent',
                        tier: item.contact_tier,
                        template_id: selectedTemplate.id
                    });

                    successCount++;
                } catch (err) {
                    console.error('Send error:', err);
                    failCount++;
                }

                setSendProgress(Math.round((i + 1) / emailQueue.length * 100));
                // Slight delay between sends to avoid rate limits
                await new Promise(r => setTimeout(r, 500));
            }

            toast.success(`Campaña finalizada: ${successCount} enviados, ${failCount} fallidos`, { id: toastId });
            setEmailQueue([]);
            loadHistory();
        } catch (err) {
            toast.error('Error enviando: ' + err.message, { id: toastId });
        } finally {
            setIsSending(false);
        }
    };

    // ============ SEND TEST EMAIL ============
    const sendTestEmail = async () => {
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
            // Process template with sample data
            let processedSubject = selectedTemplate.subject;
            let processedBody = selectedTemplate.body_html;

            const sampleVariables = {
                empresa: 'Mi Empresa de Prueba',
                nombre: 'Usuario de Prueba',
                tier: 'AAA'
            };

            Object.keys(sampleVariables).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                processedSubject = processedSubject.replace(regex, sampleVariables[key]);
                processedBody = processedBody.replace(regex, sampleVariables[key]);
            });

            const finalHtml = `${processedBody} ${selectedSender.signature || ''}`;

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
                                html: `<div style="background:#fff3cd;padding:10px;margin-bottom:20px;border-radius:8px;border:1px solid #ffc107;"><strong>⚠️ ESTO ES UNA PRUEBA</strong> - El correo real no tendrá este aviso.</div>${finalHtml}`,
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

        const cleanPhone = phone.replace(/\D/g, '');
        const message = encodeURIComponent(
            `🧪 *PRUEBA DE WHATSAPP*\n\nEste es un mensaje de prueba del CRM de Geobooker.\n\nSi recibes esto, la configuración funciona correctamente. ✅\n\nEl mensaje real a los contactos será diferente.`
        );

        const waUrl = `https://wa.me/${cleanPhone}?text=${message}`;
        window.open(waUrl, '_blank');
        toast.success('Abriendo WhatsApp Web para prueba...');
    };


    // ============ TABS CONFIG ============
    const tabs = [
        { id: 'contactos', label: '📥 Contactos', icon: Users },
        { id: 'plantillas', label: '📝 Plantillas', icon: Mail },
        { id: 'stats', label: '📊 Stats', icon: BarChart3 },
        { id: 'lanzar', label: '🚀 Lanzar', icon: Send },
        { id: 'historial', label: '📋 Historial', icon: Clock },
        { id: 'config', label: '⚙️ Config', icon: Settings }
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
                <div className="px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            🎯 CRM & Marketing
                        </h1>
                        <p className="text-sm text-gray-500">
                            {totalContacts.toLocaleString()} contactos totales • {templates.length} plantillas
                        </p>
                    </div>

                    {/* Tier Quick Stats */}
                    <div className="flex flex-wrap gap-2">
                        {tierStats.map(tier => (
                            <div
                                key={tier.tier}
                                className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 bg-white shadow-sm ${tier.tier === 'AAA' ? 'border-yellow-200 bg-yellow-50/30' :
                                    tier.tier === 'AA' ? 'border-purple-200 bg-purple-50/30' :
                                        'border-blue-200 bg-blue-50/30'
                                    }`}
                            >
                                <span className={`w-2 h-2 rounded-full ${tier.tier === 'AAA' ? 'bg-yellow-400' :
                                    tier.tier === 'AA' ? 'bg-purple-400' :
                                        'bg-blue-400'
                                    }`}></span>
                                <span className="text-xs font-bold text-gray-700">{tier.tier}:</span>
                                <span className="text-xs font-medium text-gray-600">{tier.total_contacts.toLocaleString()}</span>
                            </div>
                        ))}
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
                            </div>

                            {/* Selection Actions */}
                            {selectedContacts.size > 0 && (
                                <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                                    <span className="text-sm text-gray-600">
                                        {selectedContacts.size} seleccionados
                                    </span>
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
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[600px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="w-10 p-3">
                                                <button onClick={selectAll}>
                                                    {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0 ? (
                                                        <CheckSquare className="w-5 h-5 text-blue-600" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </button>
                                            </th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Nombre</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Email</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Empresa</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Tier</th>
                                            <th className="text-left p-3 text-xs font-semibold text-gray-600">Tipo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {contactsLoading ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center">
                                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-600" />
                                                </td>
                                            </tr>
                                        ) : filteredContacts.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-gray-500">
                                                    No hay contactos. Importa un archivo CSV.
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredContacts.slice(0, 100).map(contact => (
                                                <tr key={contact.id} className="hover:bg-gray-50">
                                                    <td className="p-3">
                                                        <button onClick={() => toggleContact(contact.id)}>
                                                            {selectedContacts.has(contact.id) ? (
                                                                <CheckSquare className="w-5 h-5 text-blue-600" />
                                                            ) : (
                                                                <Square className="w-5 h-5 text-gray-400" />
                                                            )}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 font-medium text-sm">{contact.name || '-'}</td>
                                                    <td className="p-3 text-sm text-blue-600">{contact.email || '-'}</td>
                                                    <td className="p-3 text-sm text-gray-600">{contact.company || '-'}</td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${getTierColor(contact.tier)}`}>
                                                            {contact.tier}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-xs text-gray-500">{contact.company_type || '-'}</td>
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
                                    setTemplateForm({ name: '', subject: '', body_html: '', template_type: 'promotional' });
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
                                                    deleteTemplate(template.id);
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

                {/* ============ TAB: STATS ============ */}
                {activeTab === 'stats' && (
                    <div className="space-y-6">
                        {/* Tier Stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {tierStats.map(tier => (
                                <div
                                    key={tier.tier}
                                    className={`p-4 rounded-xl ${tier.tier === 'AAA' ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                                        tier.tier === 'AA' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' :
                                            tier.tier === 'A' ? 'bg-gradient-to-br from-blue-500 to-cyan-600 text-white' :
                                                'bg-gray-200 text-gray-800'
                                        }`}
                                >
                                    <div className="text-2xl font-bold">{tier.tier}</div>
                                    <div className="text-sm opacity-90">{tier.total_contacts} contactos</div>
                                    <div className="text-xs opacity-75 mt-1">
                                        📧 {tier.with_email} | 📱 {tier.with_phone}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Company Type Stats */}
                        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                            <div className="p-4 border-b flex justify-between items-center">
                                <h3 className="font-bold text-gray-900">Por Tipo de Empresa</h3>
                                <button
                                    onClick={loadStats}
                                    className="p-2 hover:bg-gray-100 rounded-lg"
                                >
                                    <RefreshCw className={`w-4 h-4 ${statsLoading ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[500px]">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left p-3 text-xs font-semibold">Tipo</th>
                                            <th className="text-right p-3 text-xs font-semibold">Total</th>
                                            <th className="text-right p-3 text-xs font-semibold">Email</th>
                                            <th className="text-right p-3 text-xs font-semibold">Enviados</th>
                                            <th className="text-right p-3 text-xs font-semibold">%</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {companyTypeStats.map((stat, i) => (
                                            <tr key={i} className="hover:bg-gray-50">
                                                <td className="p-3 font-medium text-sm">{stat.company_type}</td>
                                                <td className="p-3 text-right text-sm">{stat.total_contacts}</td>
                                                <td className="p-3 text-right text-sm text-green-600">{stat.with_email}</td>
                                                <td className="p-3 text-right text-sm text-gray-500">{stat.emails_sent || 0}</td>
                                                <td className="p-3 text-right">
                                                    <span className={`px-2 py-0.5 rounded text-xs ${(stat.email_coverage_pct || 0) > 50
                                                        ? 'bg-green-100 text-green-700'
                                                        : 'bg-gray-100 text-gray-600'
                                                        }`}>
                                                        {stat.email_coverage_pct || 0}%
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* ============ TAB: LANZAR ============ */}
                {activeTab === 'lanzar' && (
                    <div className="space-y-6">
                        {/* Canal Selector */}
                        <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                            <button
                                onClick={() => setCampaignType('email')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${campaignType === 'email' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4" />
                                    Email
                                </div>
                            </button>
                            <button
                                onClick={() => setCampaignType('whatsapp')}
                                className={`px-6 py-2 rounded-lg font-bold transition-all ${campaignType === 'whatsapp' ? 'bg-white shadow-sm text-green-600' : 'text-gray-500'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-4 h-4" />
                                    WhatsApp
                                </div>
                            </button>
                        </div>

                        {/* Step 1: Configure */}
                        <div className="bg-white rounded-xl p-6 shadow-sm border">
                            <h3 className="font-bold text-lg mb-4">1. Configurar Envío {campaignType === 'email' ? 'Masivo' : 'Colectivo'}</h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Límite diario</label>
                                    <select
                                        value={dailyLimit}
                                        onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                                        className="w-full p-3 border rounded-xl"
                                    >
                                        <option value={campaignType === 'whatsapp' ? 10 : 20}>{campaignType === 'whatsapp' ? 10 : 20} (seguro)</option>
                                        <option value={campaignType === 'whatsapp' ? 30 : 50}>{campaignType === 'whatsapp' ? 30 : 50}</option>
                                        <option value={100}>100</option>
                                        <option value={200}>200</option>
                                    </select>
                                </div>
                                {campaignType === 'email' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Tier</label>
                                        <select
                                            value={emailSearchTier}
                                            onChange={(e) => setEmailSearchTier(e.target.value)}
                                            className="w-full p-3 border rounded-xl"
                                        >
                                            <option value="all">Sugerencia Inteligente (Mix)</option>
                                            <option value="AAA">Sólo Tier AAA (Top)</option>
                                            <option value="AA">Sólo Tier AA (Premium)</option>
                                            <option value="A">Sólo Tier A (Base)</option>
                                            <option value="B">Sólo Tier B (Exploratorio)</option>
                                        </select>
                                    </div>
                                )}
                                {campaignType === 'whatsapp' && (
                                    <div>
                                        <label className="block text-sm font-medium mb-2">Filtrar por Tier</label>
                                        <select
                                            value={waSearchTier}
                                            onChange={(e) => setWaSearchTier(e.target.value)}
                                            className="w-full p-3 border rounded-xl"
                                        >
                                            <option value="all">Todos los Tiers</option>
                                            <option value="AAA">Sólo Tier AAA (Alianzas)</option>
                                            <option value="AA">Sólo Tier AA (Premium)</option>
                                            <option value="A">Sólo Tier A (Base)</option>
                                        </select>
                                    </div>
                                )}
                                <div className="flex items-end">
                                    <button
                                        onClick={generateQueue}
                                        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold"
                                    >
                                        <RefreshCw className="w-5 h-5" />
                                        Generar Nueva Cola
                                    </button>
                                </div>
                            </div>
                        </div>

                        {campaignType === 'email' ? (
                            <>
                                {/* Step 2: Sender */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border">
                                    <h3 className="font-bold text-lg mb-4">2. Seleccionar Remitente</h3>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {senders.map((sender, idx) => (
                                            <div
                                                key={idx}
                                                onClick={() => setSelectedSender(sender)}
                                                className={`p-4 border-2 rounded-xl cursor-pointer transition-all ${selectedSender?.email === sender.email
                                                    ? 'border-blue-500 bg-blue-50'
                                                    : 'border-gray-100 hover:border-gray-200 bg-gray-50/50'
                                                    }`}
                                            >
                                                <div className="font-bold text-sm">{sender.name}</div>
                                                <div className="text-xs text-gray-500 truncate">{sender.email}</div>
                                                {selectedSender?.email === sender.email && (
                                                    <div className="mt-1 text-[10px] text-blue-600 font-bold uppercase">Seleccionado</div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Step 3: Template */}
                                <div className="bg-white rounded-xl p-6 shadow-sm border">
                                    <h3 className="font-bold text-lg mb-4">3. Seleccionar Plantilla</h3>
                                    {selectedTemplate ? (
                                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-200">
                                            <div>
                                                <span className="font-semibold">{selectedTemplate.name}</span>
                                                <p className="text-sm text-gray-600">{selectedTemplate.subject}</p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('plantillas')}
                                                className="text-blue-600 text-sm"
                                            >
                                                Cambiar
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveTab('plantillas')}
                                            className="w-full p-4 border-2 border-dashed rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600"
                                        >
                                            ← Ir a Plantillas para seleccionar
                                        </button>
                                    )}
                                </div>

                                {/* Step 4: Queue Preview */}
                                {emailQueue.length > 0 && (
                                    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                                        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
                                            <h3 className="font-bold">4. Cola de Envío Masivo ({emailQueue.length})</h3>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={sendTestEmail}
                                                    disabled={isSending || !selectedTemplate}
                                                    className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg font-medium disabled:opacity-50 hover:bg-yellow-600"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    Enviar Prueba
                                                </button>
                                                <button
                                                    onClick={sendCampaign}
                                                    disabled={isSending || !selectedTemplate}
                                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium disabled:opacity-50"
                                                >
                                                    {isSending ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            {sendProgress}%
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-4 h-4" />
                                                            Enviar Todo Ahora
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto max-h-64">
                                            <table className="w-full min-w-[400px] text-sm">
                                                <thead className="bg-gray-50 font-bold">
                                                    <tr>
                                                        <th className="p-2 text-left">#</th>
                                                        <th className="p-2 text-left">Nombre</th>
                                                        <th className="p-2 text-left">Email</th>
                                                        <th className="p-2 text-left">Tier</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y text-gray-600">
                                                    {emailQueue.slice(0, 50).map((item, i) => (
                                                        <tr key={item.contact_id}>
                                                            <td className="p-2 text-gray-400">{i + 1}</td>
                                                            <td className="p-2 font-medium">{item.contact_name || '-'}</td>
                                                            <td className="p-2 text-blue-600">{item.contact_email}</td>
                                                            <td className="p-2">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${getTierColor(item.contact_tier)}`}>
                                                                    {item.contact_tier}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
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
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 font-bold">
                                                    <tr>
                                                        <th className="p-3 text-left">Contacto / Empresa</th>
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
                                                                <div className="text-xs text-blue-600">{item.contact_phone}</div>
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
                                                                            const phone = item.contact_phone.replace(/\D/g, '');
                                                                            const msg = whatsappConfig.default_message || 'Hola!';
                                                                            window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
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
                            </>
                        )}
                    </div>
                )}

                {/* ============ TAB: CONFIG ============ */}
                {activeTab === 'config' && (
                    <div className="space-y-6">
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
            {showTemplateModal && (
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
                            <div>
                                <label className="block text-sm font-medium mb-2">Cuerpo (HTML)</label>
                                <textarea
                                    value={templateForm.body_html}
                                    onChange={(e) => setTemplateForm(p => ({ ...p, body_html: e.target.value }))}
                                    className="w-full p-3 border rounded-xl h-48 font-mono text-sm"
                                    placeholder="<p>Hola {{nombre}},</p>"
                                />
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
        </div>
    );
};

export default UnifiedCRM;
