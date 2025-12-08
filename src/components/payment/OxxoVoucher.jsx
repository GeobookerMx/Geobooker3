// src/components/payment/OxxoVoucher.jsx
// Componente para mostrar el voucher de pago en OXXO

import React, { useState } from 'react';
import { Store, Clock, Copy, CheckCircle, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

const OxxoVoucher = ({
    voucherUrl,
    referenceNumber,
    expiresAt,
    amount,
    onClose
}) => {
    const [copied, setCopied] = useState(false);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        const date = new Date(timestamp * 1000);
        return date.toLocaleDateString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopyReference = async () => {
        try {
            await navigator.clipboard.writeText(referenceNumber);
            setCopied(true);
            toast.success('Número copiado al portapapeles');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('No se pudo copiar');
        }
    };

    const handleOpenVoucher = () => {
        if (voucherUrl) {
            window.open(voucherUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full mb-4">
                    <Store className="w-8 h-8 text-yellow-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">¡Voucher Generado!</h2>
                <p className="text-yellow-100 mt-1">Paga en efectivo en cualquier OXXO</p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                {/* Monto */}
                <div className="text-center">
                    <p className="text-gray-500 text-sm">Monto a pagar</p>
                    <p className="text-4xl font-bold text-gray-800">{formatCurrency(amount)}</p>
                </div>

                {/* Número de referencia */}
                <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-gray-500 text-sm mb-2">Número de referencia:</p>
                    <div className="flex items-center justify-between bg-white rounded-lg p-3 border-2 border-dashed border-gray-300">
                        <code className="text-lg font-mono font-bold text-gray-800 tracking-wider">
                            {referenceNumber || 'Cargando...'}
                        </code>
                        <button
                            onClick={handleCopyReference}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Copiar número"
                        >
                            {copied ? (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                                <Copy className="w-5 h-5 text-gray-400" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Fecha límite */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <Clock className="w-5 h-5 text-amber-500 mt-0.5" />
                    <div>
                        <p className="font-semibold text-amber-800">Fecha límite de pago</p>
                        <p className="text-amber-700 text-sm">{formatDate(expiresAt)}</p>
                    </div>
                </div>

                {/* Instrucciones */}
                <div className="space-y-3">
                    <h3 className="font-semibold text-gray-800">📋 Instrucciones:</h3>
                    <ol className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">1</span>
                            <span>Ve a cualquier OXXO, 7-Eleven o farmacia participante</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">2</span>
                            <span>Muestra el código de barras o proporciona el número de referencia</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">3</span>
                            <span>Paga el monto exacto en efectivo</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">4</span>
                            <span>Tu servicio se activará automáticamente (1-24 horas)</span>
                        </li>
                    </ol>
                </div>

                {/* Aviso */}
                <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                    <p className="text-xs text-red-700">
                        Si no pagas antes de la fecha límite, el voucher expirará y tendrás que generar uno nuevo.
                    </p>
                </div>

                {/* Botones */}
                <div className="space-y-3">
                    <button
                        onClick={handleOpenVoucher}
                        className="w-full py-3 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                    >
                        <ExternalLink className="w-5 h-5" />
                        Ver Voucher con Código de Barras
                    </button>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="w-full py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-colors"
                        >
                            Cerrar
                        </button>
                    )}
                </div>

                {/* Tiendas participantes */}
                <div className="text-center text-xs text-gray-400 pt-4 border-t">
                    <p>Tiendas participantes:</p>
                    <p>OXXO • 7-Eleven • Farmacias del Ahorro • Farmacias Guadalajara</p>
                </div>
            </div>
        </div>
    );
};

export default OxxoVoucher;
