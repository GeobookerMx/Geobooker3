// src/pages/OxxoPendingPage.jsx
/**
 * Página de "Esperando Pago OXXO"
 * Se muestra después de generar un voucher OXXO
 * El usuario ve el estado de su pago y puede volver a ver el voucher
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Clock, CheckCircle, XCircle, Store, FileText, ArrowLeft, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const OxxoPendingPage = () => {
    const [searchParams] = useSearchParams();
    const paymentIntentId = searchParams.get('payment_intent');
    const [status, setStatus] = useState('pending'); // pending, succeeded, failed
    const [loading, setLoading] = useState(false);
    const [voucherData, setVoucherData] = useState(null);

    // Intentar recuperar datos del voucher del sessionStorage
    useEffect(() => {
        const stored = sessionStorage.getItem('oxxo_voucher');
        if (stored) {
            try {
                setVoucherData(JSON.parse(stored));
            } catch (e) {
                console.error('Error parsing voucher data:', e);
            }
        }
    }, []);

    // Verificar estado del pago (polling opcional)
    const checkPaymentStatus = async () => {
        if (!paymentIntentId) return;

        setLoading(true);
        try {
            // Aquí podrías llamar a una función serverless que verifique el estado
            // Por ahora simulamos un check básico
            const response = await fetch(`/.netlify/functions/check-payment-status?payment_intent=${paymentIntentId}`);
            if (response.ok) {
                const data = await response.json();
                setStatus(data.status);
            }
        } catch (error) {
            console.error('Error checking payment status:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-white py-12 px-4">
            <div className="max-w-lg mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Store className="w-10 h-10 text-yellow-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">
                        Pago OXXO Pendiente
                    </h1>
                    <p className="text-gray-600">
                        Tu voucher ha sido generado. Tienes <strong>3 días</strong> para pagar en cualquier OXXO.
                    </p>
                </div>

                {/* Status Card */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                    {status === 'pending' && (
                        <div className="flex items-center gap-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                            <Clock className="w-8 h-8 text-yellow-600 animate-pulse" />
                            <div>
                                <h3 className="font-bold text-yellow-800">Esperando tu pago</h3>
                                <p className="text-yellow-700 text-sm">
                                    Una vez que pagues en OXXO, tu servicio se activará automáticamente.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'succeeded' && (
                        <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl border border-green-200">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                            <div>
                                <h3 className="font-bold text-green-800">¡Pago confirmado!</h3>
                                <p className="text-green-700 text-sm">
                                    Tu pago ha sido procesado exitosamente.
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="flex items-center gap-4 p-4 bg-red-50 rounded-xl border border-red-200">
                            <XCircle className="w-8 h-8 text-red-600" />
                            <div>
                                <h3 className="font-bold text-red-800">Pago expirado</h3>
                                <p className="text-red-700 text-sm">
                                    El voucher ha expirado. Por favor genera uno nuevo.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Voucher Info */}
                {voucherData && (
                    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
                        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <FileText className="w-5 h-5 text-gray-600" />
                            Información del Voucher
                        </h3>

                        <div className="space-y-3">
                            <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-gray-600">Monto a pagar:</span>
                                <span className="font-bold text-lg text-gray-900">
                                    ${voucherData.amount?.toLocaleString()} MXN
                                </span>
                            </div>

                            {voucherData.referenceNumber && (
                                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                                    <span className="text-gray-600">Número de referencia:</span>
                                    <code className="font-mono bg-gray-100 px-2 py-1 rounded text-sm">
                                        {voucherData.referenceNumber}
                                    </code>
                                </div>
                            )}

                            {voucherData.voucherUrl && (
                                <a
                                    href={voucherData.voucherUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block w-full text-center bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 rounded-xl transition-colors mt-4"
                                >
                                    📄 Ver Voucher Completo
                                </a>
                            )}
                        </div>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-gray-50 rounded-xl p-5 mb-6">
                    <h3 className="font-bold text-gray-900 mb-3">¿Cómo pagar en OXXO?</h3>
                    <ol className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                            <span>Acude a cualquier tienda OXXO con tu voucher impreso o en pantalla.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                            <span>Indica al cajero que deseas hacer un pago de servicios.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                            <span>Proporciona el número de referencia o escanea el código de barras.</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-yellow-500 text-white w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">4</span>
                            <span>Paga en efectivo y guarda tu ticket.</span>
                        </li>
                    </ol>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3">
                    <Link
                        to="/"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Volver al inicio
                    </Link>

                    <button
                        onClick={checkPaymentStatus}
                        disabled={loading}
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Verificando...' : 'Verificar estado'}
                    </button>
                </div>

                {/* Note */}
                <p className="text-center text-xs text-gray-400 mt-6">
                    El pago puede tardar hasta 24 horas en reflejarse después de pagar en OXXO.
                </p>
            </div>
        </div>
    );
};

export default OxxoPendingPage;
