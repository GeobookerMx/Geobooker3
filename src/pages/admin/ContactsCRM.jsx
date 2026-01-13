import React, { useState, useEffect, useCallback } from 'react';
import {
    Upload, Users, Mail, Send, Filter, Search, CheckSquare, Square,
    Eye, Trash2, Download, RefreshCw, FileSpreadsheet, X, Loader2,
    ChevronDown, Building2, User, Phone, MapPin
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const ContactsCRM = () => {
    // Estado principal
    const [contacts, setContacts] = useState([]);
    const [senders, setSenders] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [importing, setImporting] = useState(false);
    const [sending, setSending] = useState(false);

    // Filtros y selección
    const [selectedContacts, setSelectedContacts] = useState(new Set());
    const [filterTier, setFilterTier] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal y configuración de envío
    const [showPreview, setShowPreview] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [selectedSender, setSelectedSender] = useState('');
    const [previewContact, setPreviewContact] = useState(null);

    // CSV Import state
    const [csvData, setCsvData] = useState([]);
    const [csvColumns, setCsvColumns] = useState([]);
    const [columnMapping, setColumnMapping] = useState({});

    // Cargar datos iniciales
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [contactsRes, sendersRes, templatesRes] = await Promise.all([
                supabase.from('crm_contacts').select('*').order('created_at', { ascending: false }),
                supabase.from('crm_email_senders').select('*').eq('is_active', true),
                supabase.from('email_templates').select('*').order('created_at', { ascending: false })
            ]);

            setContacts(contactsRes.data || []);
            setSenders(sendersRes.data || []);
            setTemplates(templatesRes.data || []);

            // Seleccionar remitente por defecto
            const defaultSender = sendersRes.data?.find(s => s.is_default);
            if (defaultSender) setSelectedSender(defaultSender.email);
        } catch (error) {
            toast.error('Error cargando datos');
        } finally {
            setLoading(false);
        }
    };

    // Filtrar contactos
    const filteredContacts = contacts.filter(contact => {
        const matchesTier = filterTier === 'ALL' || contact.tier === filterTier;
        const matchesSearch = !searchTerm ||
            contact.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.email?.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesTier && matchesSearch;
    });

    // Selección de contactos
    const toggleContact = (id) => {
        const newSelected = new Set(selectedContacts);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedContacts(newSelected);
    };

    const selectAll = () => {
        if (selectedContacts.size === filteredContacts.length) {
            setSelectedContacts(new Set());
        } else {
            setSelectedContacts(new Set(filteredContacts.map(c => c.id)));
        }
    };

    // Procesar archivo CSV
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith('.csv')) {
            toast.error('Por favor sube un archivo CSV');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            parseCSV(text, file.name);
        };
        reader.readAsText(file, 'UTF-8');
    };

    const parseCSV = (text, fileName) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            toast.error('El archivo CSV está vacío o no tiene datos');
            return;
        }

        // Detectar delimitador
        const delimiter = lines[0].includes(';') ? ';' : ',';

        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/"/g, ''));
        const data = lines.slice(1).map(line => {
            const values = line.split(delimiter).map(v => v.trim().replace(/"/g, ''));
            const row = {};
            headers.forEach((header, i) => {
                row[header] = values[i] || '';
            });
            row._sourceFile = fileName;
            return row;
        }).filter(row => Object.values(row).some(v => v && v !== fileName));

        setCsvColumns(headers);
        setCsvData(data);
        setShowImportModal(true);

        // Auto-mapear columnas comunes
        const autoMapping = {};
        const mappings = {
            name: ['nombre', 'name', 'contacto', 'contact'],
            email: ['email', 'correo', 'mail', 'e-mail', 'email corporativo'],
            company: ['empresa', 'company', 'compañía', 'compania', 'negocio'],
            position: ['puesto', 'position', 'cargo', 'title', 'rol'],
            tier: ['tier', 'tamaño', 'tamano', 'nivel', 'size', 'categoria'],
            phone: ['telefono', 'phone', 'tel', 'celular', 'movil'],
            city: ['ciudad', 'city'],
            postal_code: ['codigo postal', 'cp', 'postal', 'zip'],
            neighborhood: ['colonia', 'neighborhood', 'barrio'],
            website: ['www', 'web', 'website', 'sitio', 'pagina'],
            employee_count: ['personal', 'empleados', 'employees'],
            company_type: ['tipo', 'type', 'categoria', 'giro']
        };

        headers.forEach(header => {
            const headerLower = header.toLowerCase();
            Object.entries(mappings).forEach(([field, keywords]) => {
                if (keywords.some(kw => headerLower.includes(kw))) {
                    autoMapping[field] = header;
                }
            });
        });

        setColumnMapping(autoMapping);
    };

    // Importar contactos
    const importContacts = async () => {
        if (!columnMapping.email) {
            toast.error('Debes mapear al menos la columna de Email');
            return;
        }

        setImporting(true);
        try {
            const contactsToInsert = csvData.map(row => ({
                name: row[columnMapping.name] || null,
                email: row[columnMapping.email],
                company: row[columnMapping.company] || null,
                position: row[columnMapping.position] || null,
                tier: normalizeTier(row[columnMapping.tier]) || 'A',
                phone: row[columnMapping.phone] || null,
                city: row[columnMapping.city] || null,
                postal_code: row[columnMapping.postal_code] || null,
                neighborhood: row[columnMapping.neighborhood] || null,
                website: row[columnMapping.website] || null,
                employee_count: row[columnMapping.employee_count] || null,
                company_type: row[columnMapping.company_type] || null,
                source_file: row._sourceFile
            })).filter(c => c.email && c.email.includes('@'));

            const { data, error } = await supabase
                .from('crm_contacts')
                .insert(contactsToInsert)
                .select();

            if (error) throw error;

            toast.success(`${data.length} contactos importados correctamente`);
            setShowImportModal(false);
            setCsvData([]);
            setCsvColumns([]);
            setColumnMapping({});
            loadData();
        } catch (error) {
            toast.error('Error importando: ' + error.message);
        } finally {
            setImporting(false);
        }
    };

    const normalizeTier = (value) => {
        if (!value) return null;
        const v = value.toUpperCase().trim();
        if (v.includes('AAA') || v === '3A') return 'AAA';
        if (v.includes('AA') || v === '2A') return 'AA';
        if (v.includes('A') || v === '1A') return 'A';
        if (v.includes('B')) return 'B';
        return 'A';
    };

    // Procesar plantilla con datos del contacto
    const processTemplate = (templateHtml, contact, signature) => {
        let html = templateHtml;
        const replacements = {
            '{{nombre}}': contact.name || 'Estimado(a)',
            '{{nombre_contacto}}': contact.name || 'Estimado(a)',
            '{{empresa}}': contact.company || 'su empresa',
            '{{nombre_negocio}}': contact.company || 'su empresa',
            '{{puesto}}': contact.position || '',
            '{{email}}': contact.email || '',
            '{{telefono}}': contact.phone || '',
            '{{ciudad}}': contact.city || '',
            '{{tier}}': contact.tier || 'A'
        };

        Object.entries(replacements).forEach(([key, value]) => {
            html = html.replace(new RegExp(key, 'g'), value);
        });

        // Agregar firma
        if (signature) {
            html += signature;
        }

        return html;
    };

    // Enviar emails
    const sendEmails = async () => {
        if (selectedContacts.size === 0) {
            toast.error('Selecciona al menos un contacto');
            return;
        }
        if (!selectedTemplate) {
            toast.error('Selecciona una plantilla');
            return;
        }
        if (!selectedSender) {
            toast.error('Selecciona un remitente');
            return;
        }

        setSending(true);
        const selectedContactsList = contacts.filter(c => selectedContacts.has(c.id));
        const sender = senders.find(s => s.email === selectedSender);
        let successCount = 0;
        let errorCount = 0;

        try {
            for (const contact of selectedContactsList) {
                const html = processTemplate(selectedTemplate.body_html, contact, sender?.signature_html);

                const response = await fetch('/.netlify/functions/send-notification-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'crm_campaign',
                        data: {
                            email: contact.email,
                            subject: processTemplate(selectedTemplate.subject, contact, ''),
                            html,
                            fromEmail: selectedSender,
                            fromName: sender?.display_name || 'Geobooker'
                        }
                    })
                });

                if (response.ok) {
                    successCount++;
                    // Registrar en log
                    await supabase.from('crm_email_logs').insert({
                        contact_id: contact.id,
                        sender_email: selectedSender,
                        recipient_email: contact.email,
                        recipient_name: contact.name,
                        subject: selectedTemplate.subject,
                        template_name: selectedTemplate.name,
                        status: 'sent'
                    });
                    // Actualizar contador de contacto
                    await supabase.from('crm_contacts')
                        .update({
                            contact_count: (contact.contact_count || 0) + 1,
                            last_contacted_at: new Date().toISOString()
                        })
                        .eq('id', contact.id);
                } else {
                    errorCount++;
                }
            }

            if (successCount > 0) {
                toast.success(`${successCount} emails enviados correctamente`);
            }
            if (errorCount > 0) {
                toast.error(`${errorCount} emails fallaron`);
            }

            setSelectedContacts(new Set());
            loadData();
        } catch (error) {
            toast.error('Error enviando emails: ' + error.message);
        } finally {
            setSending(false);
        }
    };

    // Eliminar contactos seleccionados
    const deleteSelected = async () => {
        if (selectedContacts.size === 0) return;
        if (!confirm(`¿Eliminar ${selectedContacts.size} contactos?`)) return;

        const { error } = await supabase
            .from('crm_contacts')
            .delete()
            .in('id', Array.from(selectedContacts));

        if (error) {
            toast.error('Error eliminando contactos');
        } else {
            toast.success('Contactos eliminados');
            setSelectedContacts(new Set());
            loadData();
        }
    };

    // Renderizar
    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                        <Users className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">CRM de Contactos</h1>
                        <p className="text-gray-500">{contacts.length} contactos • {selectedContacts.size} seleccionados</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <label className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-green-700 transition font-medium">
                        <Upload className="w-5 h-5" />
                        Importar CSV
                        <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button onClick={loadData} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                        <RefreshCw className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filtros y búsqueda */}
            <div className="bg-white rounded-xl shadow-sm border p-4 mb-4">
                <div className="flex flex-wrap gap-4 items-center">
                    {/* Búsqueda */}
                    <div className="flex-1 min-w-[200px] relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, empresa o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>

                    {/* Filtro por tier */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-5 h-5 text-gray-400" />
                        <select
                            value={filterTier}
                            onChange={(e) => setFilterTier(e.target.value)}
                            className="border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="ALL">Todos los niveles</option>
                            <option value="AAA">AAA (Enterprise)</option>
                            <option value="AA">AA (Mediana)</option>
                            <option value="A">A (Pequeña)</option>
                            <option value="B">B (Micro)</option>
                        </select>
                    </div>

                    {/* Stats rápidos */}
                    <div className="flex gap-2">
                        {['AAA', 'AA', 'A', 'B'].map(tier => (
                            <span
                                key={tier}
                                onClick={() => setFilterTier(filterTier === tier ? 'ALL' : tier)}
                                className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer transition ${filterTier === tier
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {tier}: {contacts.filter(c => c.tier === tier).length}
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Panel de acciones (cuando hay selección) */}
            {selectedContacts.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4 flex items-center justify-between">
                    <span className="font-medium text-blue-800">
                        {selectedContacts.size} contactos seleccionados
                    </span>
                    <div className="flex gap-3">
                        {/* Selector de plantilla */}
                        <select
                            value={selectedTemplate?.id || ''}
                            onChange={(e) => setSelectedTemplate(templates.find(t => t.id === e.target.value))}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            <option value="">Seleccionar plantilla...</option>
                            {templates.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>

                        {/* Selector de remitente */}
                        <select
                            value={selectedSender}
                            onChange={(e) => setSelectedSender(e.target.value)}
                            className="border rounded-lg px-3 py-2 bg-white"
                        >
                            {senders.map(s => (
                                <option key={s.email} value={s.email}>
                                    {s.display_name} ({s.email})
                                </option>
                            ))}
                        </select>

                        {/* Vista previa */}
                        <button
                            onClick={() => {
                                const firstSelected = contacts.find(c => selectedContacts.has(c.id));
                                if (firstSelected && selectedTemplate) {
                                    setPreviewContact(firstSelected);
                                    setShowPreview(true);
                                } else {
                                    toast.error('Selecciona un contacto y una plantilla');
                                }
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            <Eye className="w-4 h-4" />
                            Vista Previa
                        </button>

                        {/* Enviar */}
                        <button
                            onClick={sendEmails}
                            disabled={sending || !selectedTemplate}
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                        >
                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {sending ? 'Enviando...' : 'Enviar Emails'}
                        </button>

                        {/* Eliminar */}
                        <button
                            onClick={deleteSelected}
                            className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}

            {/* Tabla de contactos */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left">
                                <button onClick={selectAll} className="p-1 hover:bg-gray-200 rounded">
                                    {selectedContacts.size === filteredContacts.length && filteredContacts.length > 0
                                        ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                        : <Square className="w-5 h-5 text-gray-400" />
                                    }
                                </button>
                            </th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contacto</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Empresa</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Nivel</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Ciudad</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Contactos</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredContacts.map(contact => (
                            <tr
                                key={contact.id}
                                className={`hover:bg-gray-50 cursor-pointer ${selectedContacts.has(contact.id) ? 'bg-blue-50' : ''}`}
                                onClick={() => toggleContact(contact.id)}
                            >
                                <td className="px-4 py-3">
                                    {selectedContacts.has(contact.id)
                                        ? <CheckSquare className="w-5 h-5 text-blue-600" />
                                        : <Square className="w-5 h-5 text-gray-300" />
                                    }
                                </td>
                                <td className="px-4 py-3">
                                    <div>
                                        <p className="font-medium text-gray-900">{contact.name || 'Sin nombre'}</p>
                                        <p className="text-sm text-gray-500">{contact.email}</p>
                                        {contact.position && (
                                            <p className="text-xs text-gray-400">{contact.position}</p>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <p className="text-gray-900">{contact.company || '-'}</p>
                                    {contact.company_type && (
                                        <p className="text-xs text-gray-400">{contact.company_type}</p>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${contact.tier === 'AAA' ? 'bg-purple-100 text-purple-700' :
                                            contact.tier === 'AA' ? 'bg-blue-100 text-blue-700' :
                                                contact.tier === 'A' ? 'bg-green-100 text-green-700' :
                                                    'bg-gray-100 text-gray-700'
                                        }`}>
                                        {contact.tier}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-gray-600">
                                    {contact.city || '-'}
                                </td>
                                <td className="px-4 py-3">
                                    <span className="text-gray-600">{contact.contact_count || 0}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredContacts.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                        <FileSpreadsheet className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                        <p>No hay contactos</p>
                        <p className="text-sm">Importa un archivo CSV para comenzar</p>
                    </div>
                )}
            </div>

            {/* Modal de importación CSV */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold">Mapear Columnas CSV</h2>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-6">
                            <p className="text-gray-600">
                                Se encontraron <strong>{csvData.length}</strong> registros. Mapea las columnas:
                            </p>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: 'name', label: 'Nombre del Contacto', icon: User },
                                    { key: 'email', label: 'Email *', icon: Mail },
                                    { key: 'company', label: 'Empresa', icon: Building2 },
                                    { key: 'position', label: 'Puesto', icon: User },
                                    { key: 'tier', label: 'Nivel (AAA, AA, A, B)', icon: Filter },
                                    { key: 'phone', label: 'Teléfono', icon: Phone },
                                    { key: 'city', label: 'Ciudad', icon: MapPin },
                                    { key: 'company_type', label: 'Tipo de Empresa', icon: Building2 },
                                ].map(({ key, label, icon: Icon }) => (
                                    <div key={key} className="flex items-center gap-3">
                                        <Icon className="w-5 h-5 text-gray-400" />
                                        <div className="flex-1">
                                            <label className="text-sm font-medium text-gray-700">{label}</label>
                                            <select
                                                value={columnMapping[key] || ''}
                                                onChange={(e) => setColumnMapping({ ...columnMapping, [key]: e.target.value })}
                                                className="w-full mt-1 border rounded-lg px-3 py-2 text-sm"
                                            >
                                                <option value="">-- Seleccionar --</option>
                                                {csvColumns.map(col => (
                                                    <option key={col} value={col}>{col}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Preview de datos */}
                            <div>
                                <h3 className="font-medium mb-2">Vista previa (primeros 3 registros):</h3>
                                <div className="overflow-auto border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-3 py-2 text-left">Nombre</th>
                                                <th className="px-3 py-2 text-left">Email</th>
                                                <th className="px-3 py-2 text-left">Empresa</th>
                                                <th className="px-3 py-2 text-left">Nivel</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {csvData.slice(0, 3).map((row, i) => (
                                                <tr key={i}>
                                                    <td className="px-3 py-2">{row[columnMapping.name] || '-'}</td>
                                                    <td className="px-3 py-2">{row[columnMapping.email] || '-'}</td>
                                                    <td className="px-3 py-2">{row[columnMapping.company] || '-'}</td>
                                                    <td className="px-3 py-2">{normalizeTier(row[columnMapping.tier]) || 'A'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowImportModal(false)}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={importContacts}
                                disabled={importing || !columnMapping.email}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                            >
                                {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                {importing ? 'Importando...' : `Importar ${csvData.length} Contactos`}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de vista previa */}
            {showPreview && previewContact && selectedTemplate && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
                        <div className="p-6 border-b flex items-center justify-between">
                            <h2 className="text-xl font-bold">Vista Previa del Email</h2>
                            <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4 space-y-2 text-sm">
                                <p><strong>Para:</strong> {previewContact.email}</p>
                                <p><strong>De:</strong> {selectedSender}</p>
                                <p><strong>Asunto:</strong> {processTemplate(selectedTemplate.subject, previewContact, '')}</p>
                            </div>
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <div
                                    dangerouslySetInnerHTML={{
                                        __html: processTemplate(
                                            selectedTemplate.body_html,
                                            previewContact,
                                            senders.find(s => s.email === selectedSender)?.signature_html || ''
                                        )
                                    }}
                                />
                            </div>
                        </div>
                        <div className="p-6 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setShowPreview(false)}
                                className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Cerrar
                            </button>
                            <button
                                onClick={() => {
                                    setShowPreview(false);
                                    sendEmails();
                                }}
                                disabled={sending}
                                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                            >
                                <Send className="w-4 h-4" />
                                Enviar a {selectedContacts.size} contactos
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContactsCRM;
