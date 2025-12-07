// src/components/admin/EditAdSpaceModal.jsx
import React, { useState } from 'react';
import { X, DollarSign, Users, ToggleLeft } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

export default function EditAdSpaceModal({ space, onClose, onSave }) {
    const [formData, setFormData] = useState({
        display_name: space.display_name || '',
        price_monthly: space.price_monthly || '',
        max_slots: space.max_slots || 1,
        is_active: space.is_active ?? true,
        description: space.description || ''
    });

    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('ad_spaces')
                .update(formData)
                .eq('id', space.id);

            if (error) throw error;

            toast.success('✅ Espacio actualizado correctamente');
            onSave();
            onClose();
        } catch (error) {
            toast.error('Error al actualizar: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex justify-between items-center rounded-t-xl">
                    <div>
                        <h2 className="text-2xl font-bold">Editar Espacio Publicitario</h2>
                        <p className="text-blue-100 text-sm mt-1">{space.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Display Name */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Nombre para Mostrar
                        </label>
                        <input
                            type="text"
                            value={formData.display_name}
                            onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Banner Principal"
                        />
                    </div>

                    {/* Price Monthly */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" />
                            Precio Mensual (MXN)
                        </label>
                        <input
                            type="number"
                            value={formData.price_monthly}
                            onChange={(e) => setFormData({ ...formData, price_monthly: parseFloat(e.target.value) })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="1500.00"
                            step="0.01"
                            min="0"
                        />
                    </div>

                    {/* Max Slots */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Máximo de Slots
                        </label>
                        <input
                            type="number"
                            value={formData.max_slots}
                            onChange={(e) => setFormData({ ...formData, max_slots: parseInt(e.target.value) })}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="3"
                            min="1"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Número máximo de campañas simultáneas para este espacio
                        </p>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Descripción
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Descripción del espacio publicitario..."
                        />
                    </div>

                    {/* Is Active Toggle */}
                    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2">
                            <ToggleLeft className={`w-6 h-6 ${formData.is_active ? 'text-green-600' : 'text-gray-400'}`} />
                            <div>
                                <p className="font-semibold text-gray-900">Estado del Espacio</p>
                                <p className="text-xs text-gray-600">
                                    {formData.is_active ? 'Activo - Visible para anunciantes' : 'Inactivo - No disponible'}
                                </p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition ${formData.is_active ? 'bg-green-600' : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition ${formData.is_active ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t">
                        <button
                            onClick={onClose}
                            disabled={saving}
                            className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
