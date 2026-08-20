// src/components/admin/PostSaleEmailModal.jsx
/**
 * Modal para ver, editar y enviar correo post-venta a anunciantes.
 * Envía por la infraestructura real de Geobooker/Resend y registra tracking en ad_campaigns.
 */
import React, { useEffect, useState } from 'react';
import { X, Mail, Send, Edit3, Eye, Download, RefreshCw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { sendEmail } from '../../services/mailService';

const escapeHtml = (value = '') => String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const textToHtml = (value = '') => escapeHtml(value)
    .split('\n')
    .map((line) => line.trim() ? line : '<br>')
    .join('<br>');

const formatDate = (value) => {
    if (!value) return 'No especificada';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PostSaleEmailModal({ campaign, isOpen, onClose }) {
    const [isEditing, setIsEditing] = useState(false);
    const [sending, setSending] = useState(false);
    const [emailContent, setEmailContent] = useState({
        subject: '',
        greeting: '',
        resultsIntro: '',
        promoSection: '',
        closing: ''
    });

    useEffect(() => {
        if (!campaign) return;

        setEmailContent({
            subject: `Resultados de tu campaña "${campaign.advertiser_name || 'Geobooker Ads'}" - Geobooker`,
            greeting: `¡Hola ${campaign.advertiser_name || 'equipo'}!`,
            resultsIntro: 'Tu campaña ha finalizado. Te compartimos un resumen claro de desempeño y próximos pasos para seguir aprovechando Geobooker.',
            promoSection: `PROMOCIÓN ESPECIAL DE FIDELIDAD\n\nGracias por confiar en Geobooker. Como cliente de Ads, podemos ayudarte a preparar tu siguiente campaña con:\n\n• Revisión de ubicación, categoría y objetivo comercial\n• Recomendación de slot según ciudad o audiencia\n• Seguimiento de métricas reales para decidir con criterio\n\nCódigo de seguimiento interno: GEO-POSTVENTA`,
            closing: `¿Listo para tu próxima campaña? Responde este correo o visita geobooker.com.mx/advertise.\n\nGracias por hacer crecer tu negocio con nosotros.\n\nEquipo Geobooker Ads`
        });
    }, [campaign]);

    const getMetrics = () => {
        const impressions = Number(campaign?.impressions || campaign?.total_impressions || 0);
        const clicks = Number(campaign?.clicks || campaign?.total_clicks || 0);
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';
        return { impressions, clicks, ctr };
    };

    const getEmailHTML = () => {
        const { impressions, clicks, ctr } = getMetrics();
        const budget = Number(campaign?.total_budget ?? campaign?.budget ?? 0);
        const currency = campaign?.currency || 'MXN';

        return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;">
  <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);border-radius:18px 18px 0 0;color:#fff;padding:28px;text-align:center;">
    <h1 style="margin:0;font-size:24px;">Resultados de tu campaña</h1>
    <p style="margin:8px 0 0;opacity:.92;">${escapeHtml(campaign?.advertiser_name || 'Geobooker Ads')}</p>
  </div>

  <div style="border:1px solid #e5e7eb;border-top:0;border-radius:0 0 18px 18px;padding:26px;background:#ffffff;">
    <p style="font-size:18px;font-weight:700;margin:0 0 12px;">${escapeHtml(emailContent.greeting)}</p>
    <p style="line-height:1.65;color:#475569;margin:0 0 22px;">${escapeHtml(emailContent.resultsIntro)}</p>

    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0;">
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#4f46e5;">${impressions.toLocaleString('es-MX')}</div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">IMPRESIONES</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#4f46e5;">${clicks.toLocaleString('es-MX')}</div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">CLICS</div>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:16px;text-align:center;">
        <div style="font-size:26px;font-weight:800;color:#4f46e5;">${ctr}%</div>
        <div style="font-size:11px;color:#64748b;font-weight:700;">CTR</div>
      </div>
    </div>

    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:14px;padding:16px;margin:22px 0;">
      <p style="margin:0 0 8px;"><strong>Duración:</strong> ${formatDate(campaign?.start_date)} - ${formatDate(campaign?.end_date)}</p>
      <p style="margin:0 0 8px;"><strong>Segmentación:</strong> ${escapeHtml((campaign?.target_countries || []).join(', ') || campaign?.target_location || 'Por definir')}</p>
      <p style="margin:0;"><strong>Inversión:</strong> ${budget.toLocaleString('es-MX', { style: 'currency', currency })}</p>
    </div>

    <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border-radius:14px;padding:18px;margin:22px 0;color:#78350f;">
      <p style="margin:0 0 10px;font-size:17px;font-weight:800;">Promoción y siguiente paso</p>
      <div style="line-height:1.65;">${textToHtml(emailContent.promoSection)}</div>
    </div>

    <p style="text-align:center;margin:26px 0;">
      <a href="https://geobooker.com.mx/advertise" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;padding:13px 24px;border-radius:12px;font-weight:800;">
        Crear nueva campaña
      </a>
    </p>

    <div style="line-height:1.65;color:#475569;white-space:normal;">${textToHtml(emailContent.closing)}</div>
  </div>
</div>`;
    };

    const markPostSaleSent = async (emailId) => {
        const { error } = await supabase
            .from('ad_campaigns')
            .update({
                post_sale_email_sent: true,
                post_sale_email_date: new Date().toISOString(),
                post_sale_email_subject: emailContent.subject,
                post_sale_email_resend_id: emailId || null,
                post_sale_email_status: 'sent',
                updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

        if (!error) return { tracked: true };

        const message = String(error.message || '').toLowerCase();
        if (error.code === 'PGRST204' || message.includes('schema cache') || message.includes('column')) {
            console.warn('Post-sale email sent, but DB tracking columns are missing:', error);
            return { tracked: false, schemaMissing: true };
        }

        throw error;
    };

    const handleSendEmail = async () => {
        if (!campaign?.advertiser_email) {
            toast.error('Esta campaña no tiene email de anunciante');
            return;
        }

        setSending(true);
        try {
            const emailResult = await sendEmail({
                to: campaign.advertiser_email,
                subject: emailContent.subject,
                html: getEmailHTML()
            });

            if (!emailResult.success) {
                throw new Error(emailResult.error || 'No se pudo enviar el correo post-venta');
            }

            const tracking = await markPostSaleSent(emailResult.emailId);
            if (tracking.schemaMissing) {
                toast.success(`Correo enviado a ${campaign.advertiser_email}. Pendiente aplicar migración de tracking post-venta.`);
            } else {
                toast.success(`Correo enviado a ${campaign.advertiser_email}`);
            }
            onClose();
        } catch (error) {
            console.error('Error sending post-sale email:', error);
            toast.error(error.message || 'Error al enviar correo');
        } finally {
            setSending(false);
        }
    };

    const handleDownloadPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            toast.error('Permite ventanas emergentes para descargar el PDF.');
            return;
        }
        printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${escapeHtml(emailContent.subject)}</title></head><body>${getEmailHTML()}</body></html>`);
        printWindow.document.close();
        printWindow.print();
    };

    if (!isOpen || !campaign) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Mail className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">Correo Post-Venta</h2>
                            <p className="text-purple-200 text-sm">Campaña: {campaign.advertiser_name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="border-b border-gray-200 p-4 flex items-center gap-3 bg-gray-50">
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${isEditing
                            ? 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                            : 'bg-white border border-gray-300 hover:bg-gray-100'
                            }`}
                    >
                        {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
                        {isEditing ? 'Ver Preview' : 'Editar Correo'}
                    </button>
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-100"
                    >
                        <Download className="w-4 h-4" />
                        Descargar PDF
                    </button>
                    <div className="flex-1" />
                    <div className="text-sm text-gray-600">
                        <strong>Destinatario:</strong> {campaign.advertiser_email || 'Sin email'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
                                <input
                                    type="text"
                                    value={emailContent.subject}
                                    onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Saludo</label>
                                <input
                                    type="text"
                                    value={emailContent.greeting}
                                    onChange={(e) => setEmailContent({ ...emailContent, greeting: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Introducción de resultados</label>
                                <textarea
                                    value={emailContent.resultsIntro}
                                    onChange={(e) => setEmailContent({ ...emailContent, resultsIntro: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Promoción / siguiente paso</label>
                                <textarea
                                    value={emailContent.promoSection}
                                    onChange={(e) => setEmailContent({ ...emailContent, promoSection: e.target.value })}
                                    rows={7}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cierre</label>
                                <textarea
                                    value={emailContent.closing}
                                    onChange={(e) => setEmailContent({ ...emailContent, closing: e.target.value })}
                                    rows={4}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                    ) : (
                        <div
                            className="border border-gray-200 rounded-lg overflow-hidden"
                            dangerouslySetInnerHTML={{ __html: getEmailHTML() }}
                        />
                    )}
                </div>

                <div className="border-t border-gray-200 p-4 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-gray-600 hover:text-gray-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSendEmail}
                        disabled={sending || !campaign.advertiser_email}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-600 hover:to-emerald-700 disabled:opacity-50"
                    >
                        {sending ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <Send className="w-5 h-5" />
                        )}
                        Enviar Correo
                    </button>
                </div>
            </div>
        </div>
    );
}
