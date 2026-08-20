// Componente CampaignSender: permite preparar, previsualizar y enviar campañas de email desde el CRM.
// Path: src/components/admin/CampaignSender.jsx

import React, { useState } from 'react';
import { Send, AlertCircle, CheckCircle, Loader2, Zap, Clock, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAuthenticatedJsonHeaders } from '../../services/authenticatedRequest';

const CampaignSender = ({ metrics, onCampaignComplete }) => {
    const [preparing, setPreparing] = useState(false);
    const [sending, setSending] = useState(false);
    const [previewing, setPreviewing] = useState(false);
    const [previewResult, setPreviewResult] = useState(null);
    const [progress, setProgress] = useState({ sent: 0, total: 0 });

    const dailyAvailable = Math.max((metrics.dailyLimit || 0) - (metrics.sentToday || 0), 0);
    const hasQueue = (metrics.queueCount || 0) > 0;
    const canPrepare = (metrics.sentToday || 0) < (metrics.dailyLimit || 0);
    const canSend = hasQueue && canPrepare;

    const prepareQueue = async () => {
        console.log('🔄 Iniciando preparación de cola desde CampaignSender...');
        setPreparing(true);
        setPreviewResult(null);

        try {
            console.log(`📊 Disponibles: ${dailyAvailable}, Límite: ${metrics.dailyLimit}, Enviados hoy: ${metrics.sentToday}`);
            if (dailyAvailable <= 0) {
                toast.error('Ya alcanzaste el límite diario');
                return;
            }

            const response = await fetch('/.netlify/functions/generate-email-queue', {
                method: 'POST',
                headers: await getAuthenticatedJsonHeaders(),
                body: JSON.stringify({ limit: dailyAvailable })
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

    const previewQueue = async () => {
        if (dailyAvailable <= 0) {
            toast.error('Ya alcanzaste el límite diario de emails');
            return;
        }

        const toPreview = Math.min(dailyAvailable, metrics.queueCount || 0);

        if (toPreview === 0) {
            toast.error('No hay contactos en la cola. Primero prepara la cola.');
            return;
        }

        setPreviewing(true);
        setPreviewResult(null);

        try {
            const response = await fetch('/.netlify/functions/process-email-queue', {
                method: 'POST',
                headers: await getAuthenticatedJsonHeaders(),
                body: JSON.stringify({
                    dryRun: true,
                    limit: toPreview
                })
            });

            const result = await response.json();
            if (!response.ok || result.success === false) {
                throw new Error(result.error || result.message || 'No se pudo generar el preview');
            }

            setPreviewResult(result);
            toast.success(`Preview listo: ${result.eligible || 0} contactos elegibles. No se envió ningún correo.`);
        } catch (error) {
            console.error('Error en preview de cola:', error);
            toast.error(`Error en preview: ${error.message}`);
        } finally {
            setPreviewing(false);
        }
    };

    const startCampaign = async () => {
        if (dailyAvailable <= 0) {
            toast.error('Ya alcanzaste el límite diario de emails');
            return;
        }

        const toSend = Math.min(dailyAvailable, metrics.queueCount || 0);

        if (toSend === 0) {
            toast.error('No hay contactos en la cola. Primero prepara la cola.');
            return;
        }

        const confirmed = confirm(
            `🚀 ¿Lanzar campaña de ${toSend} emails?\n\n` +
            '• Se enviarán usando las plantillas profesionales.\n' +
            '• Reporte disponible en Resend Dashboard.'
        );

        if (!confirmed) return;

        setSending(true);
        setProgress({ sent: 0, total: toSend });

        try {
            const response = await fetch('/.netlify/functions/process-email-queue', {
                method: 'POST',
                headers: await getAuthenticatedJsonHeaders(),
                body: JSON.stringify({ limit: toSend })
            });

            const result = await response.json();
            if (!response.ok) throw new Error(result.error || result.message || 'Error procesando campaña');

            const batchInfo = result.processedBatch && result.requestedLimit && result.processedBatch < result.requestedLimit
                ? `\nLote procesado ahora: ${result.processedBatch} (Netlify procesa por bloques).`
                : '';

            if (result.paused) {
                toast(`Envíos pausados.\n${result.message || 'Activa el envío desde configuración antes de lanzar.'}`, { duration: 7000 });
            } else if (result.stopped) {
                toast(`Corrida detenida por seguridad: ${result.stopReason || 'límite del proveedor'}.\nEnviados: ${result.sent || 0}\nPendientes para reintento: ${result.deferred || 0}`, { duration: 8000 });
            } else if (result.sent > 0) {
                toast.success(`Campaña completada exitosamente.\nEnviados: ${result.sent}\nFallidos: ${result.failed || 0}${batchInfo}`);
            } else if (result.failed > 0) {
                toast.error(`La campaña no envió correos.\nEnviados: 0\nFallidos: ${result.failed}${batchInfo}`);
            } else {
                toast(`La campaña terminó sin envíos.\n${result.message || 'No hubo contactos procesados en esta corrida.'}`);
            }

            setPreviewResult(null);
            if (onCampaignComplete) onCampaignComplete();
        } catch (error) {
            toast.error(`Error en campaña: ${error.message}`);
        } finally {
            setSending(false);
            setProgress({ sent: 0, total: 0 });
        }
    };

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
                            style={{ width: `${progress.total > 0 ? (progress.sent / progress.total) * 100 : 0}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 p-4 rounded-xl">
                    <p className="text-xs text-indigo-200 font-medium">DISPONIBLES HOY</p>
                    <p className="text-3xl font-black">{dailyAvailable}</p>
                </div>
                <div className={`p-4 rounded-xl border transition-all ${hasQueue ? 'bg-green-500/20 border-green-400/50' : 'bg-white/5 border-white/10'}`}>
                    <p className="text-xs text-indigo-200 font-medium text-center">EN COLA DE ENVÍO</p>
                    <p className={`text-3xl font-black text-center ${hasQueue ? 'text-green-300' : 'text-white/50'}`}>
                        {metrics.queueCount || 0}
                    </p>
                </div>
            </div>

            <div className="flex flex-col gap-3">
                {!hasQueue && canPrepare && (
                    <button
                        onClick={prepareQueue}
                        disabled={preparing}
                        className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-indigo-900 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {preparing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Clock className="w-6 h-6" />}
                        {preparing ? 'PREPARANDO COLA...' : '1. PREPARAR COLA PARA HOY'}
                    </button>
                )}

                {hasQueue && (
                    <>
                        <button
                            onClick={previewQueue}
                            disabled={previewing || sending}
                            className="w-full py-4 bg-amber-400 hover:bg-amber-300 text-indigo-950 rounded-xl font-black text-lg transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {previewing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Eye className="w-6 h-6" />}
                            {previewing ? 'REVISANDO COLA...' : 'PREVIEW SIN ENVIAR'}
                        </button>

                        {previewResult && (
                            <div className="rounded-xl border border-white/15 bg-black/20 p-4 text-sm text-indigo-50">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <p className="text-xs text-indigo-200">Elegibles</p>
                                        <p className="text-xl font-black">{previewResult.eligible || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200">Límite usado</p>
                                        <p className="text-xl font-black">{previewResult.batchLimit || previewResult.requestedLimit || Math.min(dailyAvailable, metrics.queueCount || 0)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200">Enviados hoy</p>
                                        <p className="text-xl font-black">{previewResult.sentToday || metrics.sentToday || 0}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-indigo-200">Límite diario</p>
                                        <p className="text-xl font-black">{previewResult.dailyLimit || metrics.dailyLimit || 0}</p>
                                    </div>
                                </div>
                                <p className="mt-3 text-xs text-indigo-100">
                                    Validación segura: no se envió ningún correo. Usa este resultado antes de lanzar la campaña real.
                                </p>
                            </div>
                        )}

                        <button
                            onClick={startCampaign}
                            disabled={sending || previewing}
                            className="w-full py-5 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl font-black text-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {sending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-7 h-7" />}
                            {sending ? 'ENVIANDO...' : '2. LANZAR CAMPAÑA AHORA'}
                        </button>
                    </>
                )}

                {!hasQueue && !canPrepare && (
                    <div className="py-4 bg-gray-800/50 rounded-xl flex items-center justify-center gap-2 text-gray-400 font-bold border border-white/5">
                        <AlertCircle className="w-6 h-6" />
                        LÍMITE DIARIO ALCANZADO ✅
                    </div>
                )}
            </div>

            {canSend && (
                <div className="mt-4 bg-yellow-500/20 border border-yellow-400/50 rounded-lg p-3">
                    <p className="text-xs text-yellow-100">
                        ⚠️ Los emails se enviarán usando el template de Geobooker.
                        Asegúrate de tener configurado RESEND_API_KEY en Netlify.
                    </p>
                </div>
            )}

            {(metrics.sentToday || 0) >= (metrics.dailyLimit || 0) && (
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
