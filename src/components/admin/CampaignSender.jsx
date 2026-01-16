// Componente CampaignSender: Permite enviar campañas de email desde MarketingDashboard
// Path: src/components/admin/CampaignSender.jsx

import React, { useState } from 'react';
import { Mail, Send, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const CampaignSender = ({ metrics, onCampaignComplete }) => {
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });

    const startCampaign = async () => {
        if (metrics.sentToday >= metrics.dailyLimit) {
            toast.error('Ya alcanzaste el límite diario de emails');
            return;
        }

        const available = metrics.dailyLimit - metrics.sentToday;
        const toSend = Math.min(available, metrics.projections.pending || 0);

        if (toSend === 0) {
            toast.error('No hay contactos pendientes para enviar');
            return;
        }

        const confirmed = confirm(
            `¿Enviar ${toSend} emails ahora?\n\n` +
            `• Disponibles hoy: ${available}\n` +
            `• Pendientes: ${metrics.projections.pending}\n` +
            `• Se enviarán: ${toSend}`
        );

        if (!confirmed) return;

        setSending(true);
        setProgress({ sent: 0, total: toSend });

        try {
            // Llamar a Netlify Function para procesar cola
            const response = await fetch('/.netlify/functions/process-email-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    limit: toSend,
                    tier: null // Enviar a todos los tiers
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Error al procesar campaña');
            }

            toast.success(
                `✅ Campaña completada!\n` +
                `Enviados: ${result.sent}\n` +
                `Fallidos: ${result.failed}`
            );

            // Recargar métricas
            if (onCampaignComplete) {
                onCampaignComplete();
            }

        } catch (error) {
            console.error('Error en campaña:', error);
            toast.error(`Error: ${error.message}`);
        } finally {
            setSending(false);
            setProgress({ sent: 0, total: 0 });
        }
    };

    const canSend = metrics.sentToday < metrics.dailyLimit && (metrics.projections.pending || 0) > 0;

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold mb-1">📧 Enviar Campaña de Email</h3>
                    <p className="text-sm text-indigo-100">
                        Envía emails automáticamente a tus contactos pendientes
                    </p>
                </div>
                <Mail className="w-12 h-12 opacity-30" />
            </div>

            {/* Progress Bar */}
            {sending && (
                <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                        <span>Enviando...</span>
                        <span>{progress.sent} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-indigo-800 rounded-full h-2">
                        <div
                            className="bg-green-400 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(progress.sent / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-indigo-200">Disponibles Hoy</p>
                    <p className="text-2xl font-bold">{metrics.dailyLimit - metrics.sentToday}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-indigo-200">Pendientes</p>
                    <p className="text-2xl font-bold">{metrics.projections.pending || 0}</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-lg p-3">
                    <p className="text-xs text-indigo-200">A Enviar</p>
                    <p className="text-2xl font-bold text-green-300">
                        {Math.min(metrics.dailyLimit - metrics.sentToday, metrics.projections.pending || 0)}
                    </p>
                </div>
            </div>

            {/* Action Button */}
            <button
                onClick={startCampaign}
                disabled={!canSend || sending}
                className={`w-full py-4 rounded-lg font-bold text-lg transition-all flex items-center justify-center gap-2 ${canSend && !sending
                        ? 'bg-white text-indigo-700 hover:bg-indigo-50 hover:scale-105 shadow-lg'
                        : 'bg-gray-500 text-gray-300 cursor-not-allowed opacity-50'
                    }`}
            >
                {sending ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Enviando Campaña...
                    </>
                ) : canSend ? (
                    <>
                        <Send className="w-6 h-6" />
                        Enviar Campaña Ahora
                    </>
                ) : (
                    <>
                        <AlertCircle className="w-6 h-6" />
                        {metrics.sentToday >= metrics.dailyLimit
                            ? 'Límite Diario Alcanzado'
                            : 'No Hay Pendientes'}
                    </>
                )}
            </button>

            {/* Warning */}
            {canSend && (
                <div className="mt-4 bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3">
                    <p className="text-xs text-yellow-100">
                        ⚠️ Los emails se enviarán usando el template de Geobooker.
                        Asegúrate de tener configurado RESEND_API_KEY en Netlify.
                    </p>
                </div>
            )}

            {/* Success after limit */}
            {metrics.sentToday >= metrics.dailyLimit && (
                <div className="mt-4 bg-green-500/20 border border-green-400/50 rounded-lg p-3">
                    <CheckCircle className="w-5 h-5 text-green-300 inline mr-2" />
                    <span className="text-sm text-green-100">
                        ✅ Límite diario completado. Vuelve mañana para continuar.
                    </span>
                </div>
            )}
        </div>
    );
};

export default CampaignSender;
