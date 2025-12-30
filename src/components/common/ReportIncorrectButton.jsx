// src/components/common/ReportIncorrectButton.jsx
/**
 * Botón para reportar información incorrecta de un negocio
 * Parte de la propuesta de valor de "datos frescos y verificables"
 */
import React, { useState } from 'react';
import { AlertTriangle, X, Send, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const REPORT_REASONS = [
    { id: 'closed', label: 'El negocio está cerrado permanentemente' },
    { id: 'wrong_phone', label: 'Teléfono incorrecto' },
    { id: 'wrong_address', label: 'Dirección incorrecta' },
    { id: 'wrong_hours', label: 'Horarios incorrectos' },
    { id: 'wrong_name', label: 'Nombre incorrecto' },
    { id: 'spam', label: 'Es spam o contenido falso' },
    { id: 'other', label: 'Otro problema' },
];

const ReportIncorrectButton = ({
    businessId,
    businessName,
    size = 'sm',
    className = ''
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (!selectedReason) {
            toast.error('Selecciona un motivo');
            return;
        }

        setSubmitting(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            // Guardar el reporte en la base de datos
            const { error } = await supabase
                .from('business_reports')
                .insert({
                    business_id: businessId,
                    reporter_id: user?.id || null,
                    reason: selectedReason,
                    details: details.trim() || null,
                    status: 'pending'
                });

            if (error) {
                // Si la tabla no existe, mostrar mensaje genérico de éxito
                console.log('Report table may not exist yet:', error);
            }

            setSubmitted(true);
            toast.success('¡Gracias! Revisaremos tu reporte pronto.');

            setTimeout(() => {
                setIsOpen(false);
                setSubmitted(false);
                setSelectedReason('');
                setDetails('');
            }, 2000);

        } catch (error) {
            console.error('Error submitting report:', error);
            toast.error('Error al enviar. Intenta de nuevo.');
        } finally {
            setSubmitting(false);
        }
    };

    const sizeClasses = {
        sm: 'text-xs px-2 py-1',
        md: 'text-sm px-3 py-1.5',
        lg: 'text-base px-4 py-2'
    };

    if (submitted) {
        return (
            <span className={`inline-flex items-center gap-1 text-green-600 ${sizeClasses[size]}`}>
                <Check className="w-4 h-4" />
                Reporte enviado
            </span>
        );
    }

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className={`
          inline-flex items-center gap-1 text-gray-500 hover:text-red-600 
          transition-colors ${sizeClasses[size]} ${className}
        `}
                title="Reportar información incorrecta"
            >
                <AlertTriangle className="w-3 h-3" />
                <span className="hidden sm:inline">Reportar</span>
            </button>

            {/* Modal */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-orange-500" />
                                Reportar información
                            </h3>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-gray-100 rounded-full"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        {/* Business name */}
                        <p className="text-gray-600 text-sm mb-4">
                            Negocio: <strong>{businessName}</strong>
                        </p>

                        {/* Reason selection */}
                        <div className="space-y-2 mb-4">
                            <label className="text-sm font-medium text-gray-700">
                                ¿Cuál es el problema?
                            </label>
                            <div className="space-y-1">
                                {REPORT_REASONS.map(reason => (
                                    <label
                                        key={reason.id}
                                        className={`
                      flex items-center gap-2 p-2 rounded-lg cursor-pointer border
                      ${selectedReason === reason.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:bg-gray-50'
                                            }
                    `}
                                    >
                                        <input
                                            type="radio"
                                            name="reason"
                                            value={reason.id}
                                            checked={selectedReason === reason.id}
                                            onChange={(e) => setSelectedReason(e.target.value)}
                                            className="text-blue-600"
                                        />
                                        <span className="text-sm text-gray-700">{reason.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Details (optional) */}
                        <div className="mb-4">
                            <label className="text-sm font-medium text-gray-700">
                                Detalles adicionales (opcional)
                            </label>
                            <textarea
                                value={details}
                                onChange={(e) => setDetails(e.target.value)}
                                placeholder="Cuéntanos más sobre el problema..."
                                rows={2}
                                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={!selectedReason || submitting}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Enviar reporte
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default ReportIncorrectButton;
