// src/components/payment/PaymentMethodSelector.jsx
// Componente para seleccionar método de pago: Tarjeta o OXXO

import React, { useState } from 'react';
import { CreditCard, Store, Check, AlertCircle } from 'lucide-react';

const PaymentMethodSelector = ({
    onMethodSelect,
    selectedMethod = 'card',
    amount = 0,
    disabled = false
}) => {
    const [method, setMethod] = useState(selectedMethod);

    const handleSelect = (newMethod) => {
        if (disabled) return;
        setMethod(newMethod);
        if (onMethodSelect) {
            onMethodSelect(newMethod);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
        }).format(amount);
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                💳 Método de Pago
            </h3>

            {/* Opción: Tarjeta */}
            <button
                type="button"
                onClick={() => handleSelect('card')}
                disabled={disabled}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
          ${method === 'card'
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${method === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <CreditCard className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800">Tarjeta de Crédito/Débito</h4>
                            <p className="text-sm text-gray-500">Visa, Mastercard, American Express</p>
                        </div>
                    </div>
                    {method === 'card' && (
                        <div className="bg-blue-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
                {method === 'card' && (
                    <div className="mt-3 pt-3 border-t border-blue-200">
                        <p className="text-sm text-blue-700 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Pago inmediato y seguro
                        </p>
                        <p className="text-sm text-blue-700 flex items-center gap-1">
                            <Check className="w-4 h-4" />
                            Renovación automática disponible
                        </p>
                    </div>
                )}
            </button>

            {/* Opción: OXXO */}
            <button
                type="button"
                onClick={() => handleSelect('oxxo')}
                disabled={disabled || amount > 10000}
                className={`w-full p-4 rounded-xl border-2 transition-all duration-200 text-left
          ${method === 'oxxo'
                        ? 'border-yellow-500 bg-yellow-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }
          ${(disabled || amount > 10000) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${method === 'oxxo' ? 'bg-yellow-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800">Pago en Efectivo</h4>
                            <p className="text-sm text-gray-500">OXXO, 7-Eleven, Farmacias</p>
                        </div>
                    </div>
                    {method === 'oxxo' && (
                        <div className="bg-yellow-500 rounded-full p-1">
                            <Check className="w-4 h-4 text-white" />
                        </div>
                    )}
                </div>
                {method === 'oxxo' && (
                    <div className="mt-3 pt-3 border-t border-yellow-200">
                        <p className="text-sm text-yellow-700 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Tienes 3 días para pagar
                        </p>
                        <p className="text-sm text-yellow-700 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            Servicio se activa al confirmar pago (1-24 hrs)
                        </p>
                    </div>
                )}
                {amount > 10000 && (
                    <p className="mt-2 text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        OXXO solo acepta hasta $10,000 MXN
                    </p>
                )}
            </button>

            {/* Resumen */}
            {amount > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-600">Total a pagar:</span>
                        <span className="text-2xl font-bold text-gray-800">
                            {formatCurrency(amount)}
                        </span>
                    </div>
                    {method === 'oxxo' && (
                        <p className="text-xs text-gray-500 mt-2">
                            + Comisión de servicio en tienda (puede variar)
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default PaymentMethodSelector;
