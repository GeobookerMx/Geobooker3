// Modal de Actualización de Negocio
// src/components/business/BusinessUpdateModal.jsx

import React, { useState } from 'react';
import { CheckCircle, Sparkles, X, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const BusinessUpdateModal = ({ business, onClose, onUpdated }) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [checklist, setChecklist] = useState({
        address: false,
        hours: false,
        phone: false,
        photos: false,
        description: false
    });

    const allChecked = Object.values(checklist).every(v => v);

    const handleUpdate = async () => {
        if (!allChecked) {
            toast.error('Verifica todos los campos');
            return;
        }

        setIsUpdating(true);

        try {
            const { data, error } = await supabase.rpc('update_business_info', {
                p_business_id: business.id
            });

            if (error) throw error;

            toast.success('✨ Negocio actualizado exitosamente');
            onUpdated && onUpdated();
            onClose();
        } catch (error) {
            console.error('Update error:', error);
            toast.error('Error al actualizar');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-blue-600" />
                        <h3 className="text-xl font-bold">Actualizar Información</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm text-yellow-800">
                                Verifica que tu información esté actualizada para mantener
                                la confianza de tus clientes.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 mb-6">
                    {/* Dirección */}
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={checklist.address}
                            onChange={(e) => setChecklist({ ...checklist, address: e.target.checked })}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <p className="font-medium">Dirección</p>
                            <p className="text-sm text-gray-600">{business.address || 'Sin dirección'}</p>
                        </div>
                    </div>

                    {/* Horarios */}
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={checklist.hours}
                            onChange={(e) => setChecklist({ ...checklist, hours: e.target.checked })}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <p className="font-medium">Horarios</p>
                            <p className="text-sm text-gray-600">
                                {business.hours || 'Sin horarios especificados'}
                            </p>
                        </div>
                    </div>

                    {/* Teléfono */}
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={checklist.phone}
                            onChange={(e) => setChecklist({ ...checklist, phone: e.target.checked })}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <p className="font-medium">Teléfono</p>
                            <p className="text-sm text-gray-600">{business.phone || 'Sin teléfono'}</p>
                        </div>
                    </div>

                    {/* Fotos */}
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={checklist.photos}
                            onChange={(e) => setChecklist({ ...checklist, photos: e.target.checked })}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <p className="font-medium">Fotos (opcional)</p>
                            <p className="text-sm text-gray-600">Verifica que las fotos sean actuales</p>
                        </div>
                    </div>

                    {/* Descripción */}
                    <div className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-lg">
                        <input
                            type="checkbox"
                            checked={checklist.description}
                            onChange={(e) => setChecklist({ ...checklist, description: e.target.checked })}
                            className="mt-1"
                        />
                        <div className="flex-1">
                            <p className="font-medium">Descripción</p>
                            <p className="text-sm text-gray-600">
                                {business.description?.substring(0, 100) || 'Sin descripción'}...
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg mb-6">
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                        <p className="font-semibold text-blue-900">Beneficios de actualizar</p>
                    </div>
                    <ul className="text-sm text-blue-800 space-y-1 ml-7">
                        <li>• Badge "Actualizado" ✨</li>
                        <li>• +15 puntos Trust Score</li>
                        <li>• Mayor visibilidad en búsquedas</li>
                        <li>• Próxima actualización en 3 meses</li>
                    </ul>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-3 border rounded-lg hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleUpdate}
                        disabled={!allChecked || isUpdating}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                    >
                        {isUpdating ? (
                            'Actualizando...'
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4" />
                                Confirmar Actualización
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BusinessUpdateModal;
