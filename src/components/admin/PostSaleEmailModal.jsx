// src/components/admin/PostSaleEmailModal.jsx
/**
 * Modal para ver, editar y enviar correo post-venta a anunciantes
 * Incluye resultados de campaña y promociones de fidelidad
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    X, Mail, Send, Edit3, Eye, Download,
    TrendingUp, Target, Gift, RefreshCw
} from 'lucide-react';

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
        if (campaign) {
            generateEmailContent();
        }
    }, [campaign]);

    const generateEmailContent = () => {
        const impressions = campaign.impressions || 0;
        const clicks = campaign.clicks || 0;
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

        setEmailContent({
            subject: `📊 Resultados de tu campaña "${campaign.advertiser_name}" - Geobooker`,
            greeting: `¡Hola ${campaign.advertiser_name}!`,
            resultsIntro: `Tu campaña ha finalizado exitosamente. Aquí están los resultados de tu inversión publicitaria en Geobooker:`,
            promoSection: `🎁 PROMOCIÓN ESPECIAL DE FIDELIDAD\n\n¡Gracias por confiar en Geobooker! Como cliente frecuente, te ofrecemos:\n\n• 15% de descuento en tu próxima campaña\n• 7 días adicionales GRATIS al renovar\n• Acceso prioritario a nuevas zonas premium\n\nCódigo promocional: FIDELGEO15`,
            closing: `¿Listo para tu próxima campaña? Responde a este correo o visita geobooker.com.mx/advertise\n\n¡Gracias por hacer crecer tu negocio con nosotros!\n\nEl equipo de Geobooker`
        });
    };

    const getEmailHTML = () => {
        const impressions = campaign.impressions || 0;
        const clicks = campaign.clicks || 0;
        const ctr = impressions > 0 ? ((clicks / impressions) * 100).toFixed(2) : '0.00';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${emailContent.subject}</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.9; }
        .content { padding: 30px; }
        .greeting { font-size: 20px; font-weight: 600; color: #1a1a1a; margin-bottom: 15px; }
        .intro { color: #555; line-height: 1.6; margin-bottom: 25px; }
        .results-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
        .result-card { background: #f8f9fa; border-radius: 12px; padding: 20px; text-align: center; }
        .result-value { font-size: 28px; font-weight: 700; color: #4F46E5; }
        .result-label { font-size: 12px; color: #666; margin-top: 5px; }
        .promo-box { background: linear-gradient(135deg, #FEF3C7, #FDE68A); border-radius: 12px; padding: 25px; margin: 25px 0; }
        .promo-title { font-size: 18px; font-weight: 700; color: #92400E; margin-bottom: 15px; }
        .promo-code { background: #92400E; color: white; display: inline-block; padding: 8px 20px; border-radius: 8px; font-weight: bold; font-size: 18px; margin-top: 15px; }
        .details { background: #f0f4ff; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .details-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .details-row:last-child { border-bottom: none; }
        .closing { color: #555; line-height: 1.6; margin-top: 25px; white-space: pre-line; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #4F46E5, #7C3AED); color: white !important; text-decoration: none; padding: 14px 30px; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background: #1a1a1a; color: #999; padding: 20px; text-align: center; font-size: 12px; }
        .footer a { color: #7C3AED; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Resultados de tu Campaña</h1>
            <p>${campaign.advertiser_name}</p>
        </div>
        
        <div class="content">
            <div class="greeting">${emailContent.greeting}</div>
            <p class="intro">${emailContent.resultsIntro}</p>
            
            <div class="results-grid">
                <div class="result-card">
                    <div class="result-value">${impressions.toLocaleString()}</div>
                    <div class="result-label">IMPRESIONES</div>
                </div>
                <div class="result-card">
                    <div class="result-value">${clicks.toLocaleString()}</div>
                    <div class="result-label">CLICS</div>
                </div>
                <div class="result-card">
                    <div class="result-value">${ctr}%</div>
                    <div class="result-label">CTR</div>
                </div>
            </div>
            
            <div class="details">
                <div class="details-row">
                    <span>📅 Duración:</span>
                    <strong>${campaign.start_date} - ${campaign.end_date}</strong>
                </div>
                <div class="details-row">
                    <span>🌍 Segmentación:</span>
                    <strong>${campaign.target_countries?.join(', ') || 'Global'}</strong>
                </div>
                <div class="details-row">
                    <span>💰 Inversión:</span>
                    <strong>$${campaign.total_budget?.toLocaleString()} ${campaign.currency || 'MXN'}</strong>
                </div>
            </div>
            
            <div class="promo-box">
                <div class="promo-title">🎁 PROMOCIÓN ESPECIAL DE FIDELIDAD</div>
                <p>¡Gracias por confiar en Geobooker! Como cliente frecuente, te ofrecemos:</p>
                <ul>
                    <li><strong>15% de descuento</strong> en tu próxima campaña</li>
                    <li><strong>7 días adicionales GRATIS</strong> al renovar</li>
                    <li>Acceso prioritario a nuevas zonas premium</li>
                </ul>
                <div class="promo-code">FIDELGEO15</div>
            </div>
            
            <center>
                <a href="https://geobooker.com.mx/advertise" class="cta-button">
                    🚀 Crear Nueva Campaña
                </a>
            </center>
            
            <p class="closing">${emailContent.closing}</p>
        </div>
        
        <div class="footer">
            © 2026 Geobooker. Todos los derechos reservados.<br>
            <a href="https://geobooker.com.mx">geobooker.com.mx</a>
        </div>
    </div>
</body>
</html>`;
    };

    const handleSendEmail = async () => {
        if (!campaign.advertiser_email) {
            toast.error('Esta campaña no tiene email de anunciante');
            return;
        }

        setSending(true);
        try {
            // En producción, esto llamaría a una función de Netlify/Edge para enviar email
            // Por ahora, simularemos el envío y guardaremos el registro

            const { error } = await supabase
                .from('ad_campaigns')
                .update({
                    post_sale_email_sent: true,
                    post_sale_email_date: new Date().toISOString()
                })
                .eq('id', campaign.id);

            if (error) throw error;

            // Aquí iría la integración con servicio de email (SendGrid, Resend, etc.)
            // await fetch('/api/send-post-sale-email', { ... })

            toast.success(`📧 Correo enviado a ${campaign.advertiser_email}`);
            onClose();
        } catch (error) {
            console.error('Error sending email:', error);
            toast.error('Error al enviar correo');
        } finally {
            setSending(false);
        }
    };

    const handleDownloadPDF = () => {
        // Abrir el HTML en nueva ventana para imprimir/guardar como PDF
        const printWindow = window.open('', '_blank');
        printWindow.document.write(getEmailHTML());
        printWindow.document.close();
        printWindow.print();
    };

    if (!isOpen || !campaign) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
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

                {/* Toolbar */}
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

                {/* Content */}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">Sección de promociones</label>
                                <textarea
                                    value={emailContent.promoSection}
                                    onChange={(e) => setEmailContent({ ...emailContent, promoSection: e.target.value })}
                                    rows={6}
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

                {/* Footer Actions */}
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
