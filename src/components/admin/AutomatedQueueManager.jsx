// React component para controlar el Sistema de Colas Automáticas
// Agregar a UnifiedCRM.jsx en el tab "Lanzar"

import React, { useState } from 'react';
import { Play, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const AutomatedQueueManager = () => {
    const [isGenerating, setIsGenerating] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [queueResult, setQueueResult] = useState(null);
    const [processResult, setProcessResult] = useState(null);
    const [dailyLimit, setDailyLimit] = useState(100);
    const [tierFilter, setTierFilter] = useState('all');

    // Generar cola
    const generateQueue = async () => {
        setIsGenerating(true);
        setQueueResult(null);

        try {
            const { data, error } = await supabase
                .rpc('generate_daily_email_queue', {
                    p_limit: dailyLimit,
                    p_tier_filter: tierFilter === 'all' ? null : tierFilter
                });

            if (error) throw error;

            setQueueResult({
                success: true,
                ...data[0]
            });

            toast.success(`Cola generada: ${data[0].contacts_added} contactos`);

        } catch (error) {
            console.error('Error generando cola:', error);
            setQueueResult({
                success: false,
                error: error.message
            });
            toast.error('Error al generar cola');
        } finally {
            setIsGenerating(false);
        }
    };

    // Procesar cola (enviar emails)
    const processQueue = async () => {
        setIsProcessing(true);
        setProcessResult(null);

        try {
            const response = await fetch('/.netlify/functions/process-email-queue', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            const data = await response.json();

            setProcessResult(data);

            if (data.success) {
                toast.success(`Emails enviados: ${data.sent}`);
            } else {
                toast.error('Error al procesar cola');
            }

        } catch (error) {
            console.error('Error procesando cola:', error);
            setProcessResult({
                success: false,
                error: error.message
            });
            toast.error('Error al procesar cola');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Configuration Card */}
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border-2 border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4">🤖 Sistema Automático de Emails</h3>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Límite Diario
                        </label>
                        <input
                            type="number"
                            value={dailyLimit}
                            onChange={(e) => setDailyLimit(parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            min="1"
                            max="500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Resend Free: 100/día max
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Filtrar por Tier
                        </label>
                        <select
                            value={tierFilter}
                            onChange={(e) => setTierFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                        >
                            <option value="all">Todos los Tiers</option>
                            <option value="AAA">Solo AAA</option>
                            <option value="AA">Solo AA</option>
                            <option value="A">Solo A</option>
                            <option value="B">Solo B</option>
                        </select>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={generateQueue}
                        disabled={isGenerating}
                        className="flex-1 bg-purple-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generando Cola...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                1. Generar Cola
                            </>
                        )}
                    </button>

                    <button
                        onClick={processQueue}
                        disabled={isProcessing || !queueResult?.success}
                        className="flex-1 bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                2. Enviar Emails
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Queue Result */}
            {queueResult && (
                <div className={`p-4 rounded-lg border ${queueResult.success
                        ? 'bg-green-50 border-green-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {queueResult.success ? (
                            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={`font-medium ${queueResult.success ? 'text-green-900' : 'text-red-900'
                                }`}>
                                {queueResult.success
                                    ? `Cola generada: ${queueResult.contacts_added} contactos`
                                    : 'Error al generar cola'
                                }
                            </p>
                            {queueResult.success && queueResult.tier_distribution && (
                                <div className="mt-2 text-sm text-green-700">
                                    <p className="font-medium">Distribución:</p>
                                    <div className="flex gap-4 mt-1">
                                        {Object.entries(queueResult.tier_distribution).map(([tier, count]) => (
                                            <span key={tier} className="bg-white px-2 py-1 rounded">
                                                {tier}: {count}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {queueResult.error && (
                                <p className="text-sm text-red-700 mt-1">{queueResult.error}</p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Process Result */}
            {processResult && (
                <div className={`p-4 rounded-lg border ${processResult.success
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-red-50 border-red-200'
                    }`}>
                    <div className="flex items-start gap-3">
                        {processResult.success ? (
                            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        ) : (
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                            <p className={`font-medium ${processResult.success ? 'text-blue-900' : 'text-red-900'
                                }`}>
                                {processResult.message}
                            </p>
                            {processResult.success && (
                                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                                    <div className="bg-white px-3 py-2 rounded">
                                        <p className="text-gray-600">Enviados</p>
                                        <p className="text-xl font-bold text-green-600">{processResult.sent}</p>
                                    </div>
                                    <div className="bg-white px-3 py-2 rounded">
                                        <p className="text-gray-600">Fallidos</p>
                                        <p className="text-xl font-bold text-red-600">{processResult.failed}</p>
                                    </div>
                                    <div className="bg-white px-3 py-2 rounded">
                                        <p className="text-gray-600">Hoy</p>
                                        <p className="text-xl font-bold text-blue-600">{processResult.sentToday}</p>
                                    </div>
                                    <div className="bg-white px-3 py-2 rounded">
                                        <p className="text-gray-600">Restantes</p>
                                        <p className="text-xl font-bold text-purple-600">{processResult.remaining}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Info */}
            <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-600">
                <p className="font-medium mb-2">📋 Proceso Automático:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li><strong>Generar Cola</strong>: Selecciona contactos pendientes priorizando tier AAA</li>
                    <li><strong>Enviar Emails</strong>: Procesa la cola respetando límite diario (100/día)</li>
                    <li>Los contactos quedan marcados como "enviados" en el historial</li>
                    <li>Puedes volver a contactarlos después de 30 días (re-engagement)</li>
                </ol>
            </div>
        </div>
    );
};

export default AutomatedQueueManager;
