// Componente CampaignSender: Permite enviar campañas de email desde MarketingDashboard
// Path: src/components/admin/CampaignSender.jsx

import React, { useState } from 'react';
import { Mail, Send, AlertCircle, CheckCircle, Loader2, Zap, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';

const CampaignSender = ({ metrics, onCampaignComplete }) => {
    const [preparing, setPreparing] = useState(false);
    const [sending, setSending] = useState(false);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });

    const prepareQueue = async () => {
        alert('DEBUG: Botón "Preparar Cola" presionado.');
        console.log('🔄 Iniciando preparación de cola desde v1.3.0...');
        setPreparing(true);
        try {
            const available = metrics.dailyLimit - metrics.sentToday;
            console.log(`📊 Disponibles: ${available}, Límite: ${metrics.dailyLimit}, Enviados hoy: ${metrics.sentToday}`);
            if (available <= 0) {
                alert('INFO: Límite diario alcanzado.');
                toast.error('Ya alcanzaste el límite diario');
                return;
            }

            const response = await fetch('/.netlify/functions/generate-email-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: available })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error desconocido en el servidor');

            console.log('✅ Respuesta de preparación:', result);
            toast.success(`✅ Cola preparada: ${result.contacts_added} contactos listos`);
            if (onCampaignComplete) onCampaignComplete();

        } catch (error) {
            console.error('❌ Error preparando cola:', error);
            toast.error(`Error preparando cola: ${error.message}`);
        } finally {
            setPreparing(false);
        }
    };

    const startCampaign = async () => {
        if (metrics.sentToday >= metrics.dailyLimit) {
            toast.error('Ya alcanzaste el límite diario de emails');
            return;
        }

        const toSend = Math.min(metrics.dailyLimit - metrics.sentToday, metrics.queueCount || 0);

        if (toSend === 0) {
            toast.error('No hay contactos en la cola. Primero "Prepara la Cola".');
            return;
        }

        const confirmed = confirm(
            `🚀 ¿Lanzar campaña de ${toSend} emails?\n\n` +
            `• Se enviarán usando las plantillas profesionales.\n` +
            `• Reporte disponible en Resend Dashboard.`
        );

        if (!confirmed) return;

        setSending(true);
        setProgress({ sent: 0, total: toSend });

        try {
            const response = await fetch('/.netlify/functions/process-email-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ limit: toSend })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error);

            toast.success(`✅ ¡Campaña completada exitosamente!\nEnviados: ${result.sent}`);
            if (onCampaignComplete) onCampaignComplete();

        } catch (error) {
            toast.error(`Error en campaña: ${error.message}`);
        } finally {
            setSending(false);
            setProgress({ sent: 0, total: 0 });
        }
    };

    const hasQueue = (metrics.queueCount || 0) > 0;
    const canPrepare = metrics.sentToday < metrics.dailyLimit;
    const canSend = hasQueue && metrics.sentToday < metrics.dailyLimit;

    return (
        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-xl p-6 text-white shadow-xl">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-xl font-bold mb-1">🚀 Lanzar Campaña de Email</h3>
                    <p className="text-sm text-indigo-100">
                        {hasQueue ? 'Cola lista para enviar' : 'Prepara la cola para hoy'}
                    </p>
                </div>
                <Zap className={`w-12 h-12 ${hasQueue ? 'text-yellow-400 animate-pulse' : 'opacity-20'}`} />
            </div>

            {/* Progress Bar */}
            {sending && (
                <div className="mb-4 bg-white/10 p-4 rounded-lg">
                    <div className="flex justify-between text-sm mb-2">
                        <span className="flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Procesando envíos...
                        </span>
                        <span className="font-bold">{progress.sent} / {progress.total}</span>
                    </div>
                    <div className="w-full bg-indigo-900 rounded-full h-3">
                        <div
                            className="bg-gradient-to-r from-green-400 to-emerald-500 h-3 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                            style={{ width: `${(progress.sent / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                    <p className="text-xs text-indigo-200 font-medium">DISPONIBLES HOY</p>
                    <p className="text-3xl font-black">{metrics.dailyLimit - metrics.sentToday}</p>
                </div>
                <div className={`p-4 rounded-xl border transition-all ${hasQueue ? 'bg-green-500/20 border-green-400/50' : 'bg-white/5 border-white/10'}`}>
                    <p className="text-xs text-indigo-200 font-medium text-center">EN COLA DE ENVÍO</p>
                    <p className={`text-3xl font-black text-center ${hasQueue ? 'text-green-300' : 'text-white/50'}`}>
                        {metrics.queueCount || 0}
                    </p>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
                {!hasQueue && canPrepare && (
                    <button
                        onClick={prepareQueue}
                        disabled={preparing}
                        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg"
                    >
                        {preparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Clock className="w-6 h-6" />}
                        {preparing ? 'PREPARANDO COLA...' : '1. PREPARAR COLA PARA HOY'}
                    </button>
                )}

                {hasQueue && (
                    <button
                        onClick={startCampaign}
                        disabled={sending}
                        className="w-full py-5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-2xl"
                    >
                        {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-7 h-7" />}
                        {sending ? 'ENVIANDO...' : '2. LANZAR CAMPAÑA AHORA'}
                    </button>
                )}

                {!hasQueue && !canPrepare && (
                    <div className="py-4 bg-gray-800/50 rounded-xl flex items-center justify-center gap-2 text-gray-400 font-bold border border-white/5">
                        <AlertCircle className="w-6 h-6" />
                        LÍMITE DIARIO ALCANZADO ✅
                    </div>
                )}
            </div>

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
