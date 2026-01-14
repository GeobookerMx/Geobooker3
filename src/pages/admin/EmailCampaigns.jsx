import React, { useState, useEffect } from 'react';
import { Mail, Send, Layout, Plus, Trash2, Filter, Loader2, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { processTemplate, sendEmail, getRecipientsByTier } from '../../services/mailService';
import toast from 'react-hot-toast';

const EmailCampaigns = () => {
    const [templates, setTemplates] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [activeTab, setActiveTab] = useState('templates');
    const [isCreating, setIsCreating] = useState(false);

    // Form States
    const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', body_html: '' });
    const [selectedTier, setSelectedTier] = useState('A');
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const { data: tmpls } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false });
        const { data: cmps } = await supabase.from('email_campaigns').select('*').order('created_at', { ascending: false });
        setTemplates(tmpls || []);
        setCampaigns(cmps || []);
    };

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        const { error } = await supabase.from('email_templates').insert([newTemplate]);
        if (error) {
            toast.error('Error al crear plantilla');
        } else {
            toast.success('Plantilla creada correctamente');
            setIsCreating(false);
            setNewTemplate({ name: '', subject: '', body_html: '' });
            loadData();
        }
    };

    const handleLaunchCampaign = async () => {
        if (!selectedTemplate || !selectedTier) {
            toast.error('Selecciona una plantilla y un nivel');
            return;
        }

        setIsSending(true);
        try {
            const template = templates.find(t => t.id === selectedTemplate);
            const recipients = await getRecipientsByTier(selectedTier);

            if (recipients.length === 0) {
                toast.error('No hay destinatarios en este nivel.');
                setIsSending(false);
                return;
            }

            // Registrar campaña
            const { data: campaign, error: cErr } = await supabase
                .from('email_campaigns')
                .insert([{
                    name: `Campaña ${selectedTier} - ${new Date().toLocaleDateString()}`,
                    template_id: selectedTemplate,
                    target_tier: selectedTier,
                    status: 'sending'
                }])
                .select()
                .single();

            if (cErr) throw cErr;

            // Enviar correos (en lotes reales, aquí simulación rápida)
            let sent = 0;
            for (const recipient of recipients) {
                const finalHtml = processTemplate(template.body_html, recipient);
                await sendEmail({
                    to: recipient.contact_email,
                    subject: template.subject,
                    html: finalHtml
                });
                sent++;
            }

            // Finalizar campaña
            await supabase
                .from('email_campaigns')
                .update({ status: 'completed', sent_count: sent })
                .eq('id', campaign.id);

            toast.success(`¡Campaña enviada con éxito a ${sent} negocios!`);
            loadData();
        } catch (error) {
            toast.error('Error lanzando campaña: ' + error.message);
        } finally {
            setIsSending(false);
            setActiveTab('history');
        }
    };

    return (
        <div className="p-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                        <Mail className="w-8 h-8 text-blue-600" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={() => { setActiveTab('templates'); setIsCreating(true); }}
                        className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                        <Plus className="w-5 h-5" /> Nueva Plantilla
                    </button>
                    <button
                        onClick={() => setActiveTab('launch')}
                        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition"
                    >
                        <Send className="w-5 h-5" /> Nueva Campaña
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-8 border-b mb-8">
                {['templates', 'launch', 'history'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 font-medium capitalize transition-all ${activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab === 'templates' ? 'Plantillas' : tab === 'launch' ? 'Lanzar Campaña' : 'Historial de Envíos'}
                    </button>
                ))}
            </div>

            {/* Content: Plantillas */}
            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {templates.map(tmpl => (
                        <div key={tmpl.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition">
                            <h3 className="font-bold text-gray-900 mb-1">{tmpl.name}</h3>
                            <p className="text-sm text-gray-500 mb-4">{tmpl.subject}</p>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedTemplate(tmpl.id);
                                        setActiveTab('launch');
                                        toast.success('Plantilla seleccionada para campaña');
                                    }}
                                    className="p-2 text-gray-400 hover:text-green-600"
                                    title="Usar en campaña"
                                >
                                    <Send className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm('¿Eliminar esta plantilla?')) {
                                            await supabase.from('email_templates').delete().eq('id', tmpl.id);
                                            toast.success('Plantilla eliminada');
                                            loadData();
                                        }
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-600"
                                    title="Eliminar plantilla"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {isCreating && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white w-full max-w-2xl rounded-2xl p-8 shadow-2xl">
                                <h2 className="text-xl font-bold mb-6">Crear Nueva Plantilla</h2>
                                <form onSubmit={handleCreateTemplate} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Interno</label>
                                        <input
                                            required
                                            className="w-full p-3 border rounded-xl"
                                            value={newTemplate.name}
                                            onChange={e => setNewTemplate({ ...newTemplate, name: e.target.value })}
                                            placeholder="ej. Bienvenida Negocios AAA"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asunto del Correo</label>
                                        <input
                                            required
                                            className="w-full p-3 border rounded-xl"
                                            value={newTemplate.subject}
                                            onChange={e => setNewTemplate({ ...newTemplate, subject: e.target.value })}
                                            placeholder="ej. ¡Hola {{nombre_negocio}}! Tenemos una propuesta para ti"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cuerpo del Correo (HTML permitido)</label>
                                        <textarea
                                            required
                                            rows="8"
                                            className="w-full p-3 border rounded-xl font-mono text-sm"
                                            value={newTemplate.body_html}
                                            onChange={e => setNewTemplate({ ...newTemplate, body_html: e.target.value })}
                                            placeholder="<h1>Hola {{nombre_negocio}}</h1>..."
                                        />
                                    </div>
                                    <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                                        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                        <p className="text-xs text-blue-800">
                                            Variables: <strong>{"{{nombre_negocio}}"}</strong>, <strong>{"{{puesto}}"}</strong>, <strong>{"{{manager}}"}</strong>, <strong>{"{{personal}}"}</strong>, <strong>{"{{ciudad}}"}</strong>.
                                        </p>
                                    </div>
                                    <div className="flex justify-end gap-4 pt-4">
                                        <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-2 text-gray-600 font-medium">Cancelar</button>
                                        <button type="submit" className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold">Guardar Plantilla</button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content: Lanzar Campaña */}
            {activeTab === 'launch' && (
                <div className="max-w-xl bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-xl font-bold mb-6">Configurar Campaña</h2>
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">1. Seleccionar Plantilla</label>
                            <select
                                className="w-full p-3 border rounded-xl bg-gray-50"
                                value={selectedTemplate}
                                onChange={e => setSelectedTemplate(e.target.value)}
                            >
                                <option value="">Elige una plantilla...</option>
                                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">2. Seleccionar Segmento (Target Tier)</label>
                            <div className="grid grid-cols-3 gap-4">
                                {['A', 'AA', 'AAA'].map(tier => (
                                    <button
                                        key={tier}
                                        onClick={() => setSelectedTier(tier)}
                                        className={`py-3 rounded-xl font-bold transition-all border-2 ${selectedTier === tier ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-600 hover:border-blue-200'
                                            }`}
                                    >
                                        Negocios {tier}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="pt-6 border-t font-bold">
                            <button
                                onClick={handleLaunchCampaign}
                                disabled={isSending}
                                className={`w-full py-4 rounded-xl text-white flex items-center justify-center gap-3 transition-all ${isSending ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-xl hover:shadow-green-200'
                                    }`}
                            >
                                {isSending ? (
                                    <><Loader2 className="w-6 h-6 animate-spin" /> Procesando envío masivo...</>
                                ) : (
                                    <><Send className="w-6 h-6" /> Lanzar Campaña de Email</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content: Historial */}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-700 uppercase font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">Campaña</th>
                                <th className="px-6 py-4">Nivel Pagado</th>
                                <th className="px-6 py-4">Estado</th>
                                <th className="px-6 py-4">Enviados</th>
                                <th className="px-6 py-4">Fecha</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y text-gray-600">
                            {campaigns.map(cmp => (
                                <tr key={cmp.id}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{cmp.name}</td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">
                                            Tier {cmp.target_tier}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${cmp.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {cmp.status.toUpperCase()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 font-bold">{cmp.sent_count}</td>
                                    <td className="px-6 py-4 text-sm">{new Date(cmp.created_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default EmailCampaigns;
