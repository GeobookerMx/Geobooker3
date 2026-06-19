// src/pages/BillingPortal.jsx
import React, { useState, useEffect } from 'react';
import {
    Receipt, Download, FileText, CreditCard, Calendar,
    Mail, Building2, Edit2, Check, X, Loader2, AlertCircle
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { IS_IOS_NATIVE } from '../utils/iosStore';

const BillingPortal = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    // ✅ Apple Guideline 3.1.1: Ocultar portal de facturación en iOS nativo
    const [loading, setLoading] = useState(true);
    const [invoices, setInvoices] = useState([]);
    const [payments, setPayments] = useState([]);
    const [fiscalData, setFiscalData] = useState(null);
    const [editingFiscal, setEditingFiscal] = useState(false);
    const [activeTab, setActiveTab] = useState('payments');

    // Fiscal form state
    const [fiscalForm, setFiscalForm] = useState({
        rfc: '',
        razon_social: '',
        regimen_fiscal: '',
        codigo_postal: '',
        uso_cfdi: 'G03'
    });

    useEffect(() => {
        if (IS_IOS_NATIVE) {
            navigate('/dashboard', { replace: true });
            return;
        }

        if (user) {
            loadData();
        }
    }, [navigate, user]);

    if (IS_IOS_NATIVE) {
        return null;
    }

    const loadData = async () => {
        setLoading(true);
        try {
            // Load fiscal data
            const { data: fiscal } = await supabase
                .from('fiscal_clients')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (fiscal) {
                setFiscalData(fiscal);
                setFiscalForm({
                    rfc: fiscal.rfc || '',
                    razon_social: fiscal.razon_social || '',
                    regimen_fiscal: fiscal.regimen_fiscal || '',
                    codigo_postal: fiscal.codigo_postal || '',
                    uso_cfdi: fiscal.uso_cfdi || 'G03'
                });
            }

            // Load user's invoices
            const { data: invs } = await supabase
                .from('invoices')
                .select('*')
                .eq('fiscal_client_id', fiscal?.id)
                .order('created_at', { ascending: false });

            setInvoices(invs || []);

            // Load user's payments/campaigns
            const { data: camps } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('user_id', user.id)
                .in('payment_status', ['paid', 'completed'])
                .order('created_at', { ascending: false });

            setPayments(camps || []);
        } catch (err) {
            console.error('Error loading billing data:', err);
        } finally {
            setLoading(false);
        }
    };

    const saveFiscalData = async () => {
        try {
            if (fiscalData?.id) {
                // Update existing
                const { error } = await supabase
                    .from('fiscal_clients')
                    .update({
                        ...fiscalForm,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', fiscalData.id);

                if (error) throw error;
            } else {
                // Create new
                const { error } = await supabase
                    .from('fiscal_clients')
                    .insert({
                        ...fiscalForm,
                        user_id: user.id,
                        email: user.email
                    });

                if (error) throw error;
            }

            toast.success('Datos fiscales guardados');
            setEditingFiscal(false);
            loadData();
        } catch (err) {
            toast.error('Error guardando: ' + err.message);
        }
    };

    const requestInvoice = async (campaignId) => {
        if (!fiscalData?.rfc) {
            toast.error('Primero completa tus datos fiscales');
            setEditingFiscal(true);
            return;
        }

        const toastId = toast.loading('Enviando solicitud de factura...');

        try {
            // 1. Obtener detalles de la campaña
            const { data: campaign, error: campError } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (campError || !campaign) {
                throw new Error(campError?.message || 'No se encontró la campaña');
            }

            // 2. Calcular montos
            const subtotal = parseFloat(campaign.budget || campaign.total_budget || 0);
            const ivaAmount = campaign.billing_country === 'MX' || fiscalData.rfc.length === 12 || fiscalData.rfc.length === 13 ? subtotal * 0.16 : 0;
            const total = subtotal + ivaAmount;

            // 3. Crear el registro de factura en estado pending si no existe
            const { data: existingInvoice } = await supabase
                .from('invoices')
                .select('id')
                .eq('campaign_id', campaignId)
                .maybeSingle();

            if (!existingInvoice) {
                const { error: invError } = await supabase
                    .from('invoices')
                    .insert({
                        campaign_id: campaignId,
                        fiscal_client_id: fiscalData.id,
                        subtotal: subtotal,
                        iva_rate: campaign.billing_country === 'MX' ? 16.00 : 0.00,
                        iva_amount: ivaAmount,
                        total: total,
                        currency: campaign.currency || 'MXN',
                        status: 'pending',
                        created_by: user.id,
                        concept: `Servicios de publicidad digital - Campaña: ${campaign.advertiser_name || 'Sin nombre'}`
                    });

                if (invError) throw invError;
            }

            // 4. Actualizar estado en la campaña
            const { error: updateError } = await supabase
                .from('ad_campaigns')
                .update({ invoice_status: 'requested' })
                .eq('id', campaignId);

            if (updateError) throw updateError;

            // 5. Enviar notificación al admin via correo
            const emailBody = `
                <div style="font-family: sans-serif; padding: 20px; color: #333; line-height: 1.5;">
                    <h2 style="color: #2563eb; margin-top: 0;">Solicitud de Factura Recibida</h2>
                    <p>El anunciante <strong>${fiscalData.razon_social}</strong> ha solicitado la factura para su campaña publicitaria.</p>
                    
                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 20px; color: #4b5563;">Datos de la Campaña:</h3>
                    <ul style="padding-left: 20px;">
                        <li><strong>ID Campaña:</strong> ${campaign.id}</li>
                        <li><strong>Negocio/Anunciante:</strong> ${campaign.advertiser_name || 'N/A'}</li>
                        <li><strong>Email del Anunciante:</strong> ${campaign.advertiser_email || 'N/A'}</li>
                        <li><strong>Inversión (Subtotal):</strong> $${subtotal.toLocaleString()} ${campaign.currency || 'MXN'}</li>
                        <li><strong>IVA:</strong> $${ivaAmount.toLocaleString()}</li>
                        <li><strong>Total:</strong> $${total.toLocaleString()}</li>
                    </ul>

                    <h3 style="border-bottom: 1px solid #eee; padding-bottom: 8px; margin-top: 20px; color: #4b5563;">Datos Fiscales del Cliente:</h3>
                    <ul style="padding-left: 20px;">
                        <li><strong>RFC:</strong> ${fiscalData.rfc}</li>
                        <li><strong>Razón Social:</strong> ${fiscalData.razon_social}</li>
                        <li><strong>Régimen Fiscal:</strong> ${fiscalData.regimen_fiscal}</li>
                        <li><strong>Código Postal:</strong> ${fiscalData.codigo_postal}</li>
                        <li><strong>Uso de CFDI:</strong> ${fiscalData.uso_cfdi || 'G03'}</li>
                    </ul>

                    <p style="margin-top: 30px; text-align: center;">
                        <a href="https://geobooker.com.mx/admin/revenue" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; display: inline-block;">Ver en el Panel de Administración</a>
                    </p>
                </div>
            `;

            await fetch('/.netlify/functions/send-notification-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'custom',
                    data: {
                        email: 'hola@geobooker.com.mx', // Email del admin
                        subject: `📄 Factura Solicitada: ${fiscalData.rfc} (${fiscalData.razon_social})`,
                        html: emailBody,
                        companyName: 'Geobooker Administrador'
                    }
                })
            });

            toast.success('Solicitud de factura enviada. El equipo la generará pronto.', { id: toastId });
            loadData();

        } catch (err) {
            console.error('Error al solicitar factura:', err);
            toast.error('Error al enviar la solicitud: ' + err.message, { id: toastId });
        }
    };

    const regimenes = [
        { code: '601', name: 'General de Ley Personas Morales' },
        { code: '606', name: 'Arrendamiento' },
        { code: '612', name: 'Personas Físicas con Actividades Empresariales' },
        { code: '616', name: 'Sin obligaciones fiscales' },
        { code: '626', name: 'Régimen Simplificado de Confianza (RESICO)' }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                    <Receipt className="w-8 h-8 text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">💳 Facturación</h1>
                    <p className="text-gray-500">Tus pagos, facturas y datos fiscales</p>
                </div>
            </div>

            {/* Fiscal Data Card */}
            <div className="bg-white rounded-xl border shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-600" />
                        Datos Fiscales
                    </h2>
                    {!editingFiscal && (
                        <button
                            onClick={() => setEditingFiscal(true)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                            <Edit2 className="w-4 h-4" />
                            Editar
                        </button>
                    )}
                </div>

                {editingFiscal ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RFC</label>
                                <input
                                    type="text"
                                    value={fiscalForm.rfc}
                                    onChange={(e) => setFiscalForm({ ...fiscalForm, rfc: e.target.value.toUpperCase() })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                                    maxLength={13}
                                    placeholder="XAXX010101000"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código Postal</label>
                                <input
                                    type="text"
                                    value={fiscalForm.codigo_postal}
                                    onChange={(e) => setFiscalForm({ ...fiscalForm, codigo_postal: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    maxLength={5}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                            <input
                                type="text"
                                value={fiscalForm.razon_social}
                                onChange={(e) => setFiscalForm({ ...fiscalForm, razon_social: e.target.value.toUpperCase() })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Régimen Fiscal</label>
                            <select
                                value={fiscalForm.regimen_fiscal}
                                onChange={(e) => setFiscalForm({ ...fiscalForm, regimen_fiscal: e.target.value })}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Seleccionar...</option>
                                {regimenes.map(r => (
                                    <option key={r.code} value={r.code}>{r.code} - {r.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setEditingFiscal(false)}
                                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={saveFiscalData}
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Guardar
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        {fiscalData?.rfc ? (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-gray-500">RFC</p>
                                    <p className="font-mono font-medium">{fiscalData.rfc}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500">Código Postal</p>
                                    <p className="font-medium">{fiscalData.codigo_postal || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-500">Razón Social</p>
                                    <p className="font-medium">{fiscalData.razon_social || '-'}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-gray-500">Régimen Fiscal</p>
                                    <p className="font-medium">{fiscalData.regimen_fiscal || '-'}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-gray-500">
                                <AlertCircle className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                                <p>No tienes datos fiscales registrados</p>
                                <button
                                    onClick={() => setEditingFiscal(true)}
                                    className="mt-2 text-blue-600 hover:underline"
                                >
                                    Agregar datos fiscales
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-4 mb-4 border-b">
                <button
                    onClick={() => setActiveTab('payments')}
                    className={`pb-3 px-1 font-medium border-b-2 transition ${activeTab === 'payments'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500'
                        }`}
                >
                    💳 Pagos
                </button>
                <button
                    onClick={() => setActiveTab('invoices')}
                    className={`pb-3 px-1 font-medium border-b-2 transition ${activeTab === 'invoices'
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-500'
                        }`}
                >
                    📄 Facturas
                </button>
            </div>

            {/* Content */}
            <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {activeTab === 'payments' ? (
                    <div>
                        {payments.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <CreditCard className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No tienes pagos registrados</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Concepto</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Estado</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Factura</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {payments.map(p => (
                                        <tr key={p.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(p.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="font-medium text-gray-900">{p.name || 'Campaña publicitaria'}</p>
                                                <p className="text-xs text-gray-500">{p.campaign_type || 'local'}</p>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p className="font-bold">${parseFloat(p.total_with_iva || p.budget || 0).toLocaleString()}</p>
                                                <p className="text-xs text-gray-400">{p.currency || 'MXN'}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                                                    ✅ Pagado
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                {p.invoice_status === 'sent' ? (
                                                    <span className="text-green-600 text-sm">Facturado</span>
                                                ) : (
                                                    <button
                                                        onClick={() => requestInvoice(p.id)}
                                                        className="text-blue-600 hover:underline text-sm"
                                                    >
                                                        Solicitar factura
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                ) : (
                    <div>
                        {invoices.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                                <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>No tienes facturas emitidas</p>
                            </div>
                        ) : (
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Folio</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Total</th>
                                        <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase text-right">Descargar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y">
                                    {invoices.map(inv => (
                                        <tr key={inv.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">
                                                <p className="font-mono font-medium text-blue-600">{inv.invoice_number}</p>
                                                {inv.cfdi_uuid && (
                                                    <p className="text-xs text-gray-400 truncate max-w-[150px]">{inv.cfdi_uuid}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold">
                                                ${parseFloat(inv.total || 0).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {inv.cfdi_pdf_url && (
                                                        <a
                                                            href={inv.cfdi_pdf_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            PDF
                                                        </a>
                                                    )}
                                                    {inv.cfdi_xml_url && (
                                                        <a
                                                            href={inv.cfdi_xml_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs hover:bg-blue-100"
                                                        >
                                                            <Download className="w-3 h-3" />
                                                            XML
                                                        </a>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BillingPortal;
