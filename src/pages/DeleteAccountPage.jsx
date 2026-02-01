// src/pages/DeleteAccountPage.jsx
// Página para solicitar eliminación de cuenta - requerida por Google Play

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import SEO from '../components/SEO';

const DeleteAccountPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [confirmText, setConfirmText] = useState('');
    const [reason, setReason] = useState('');
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        if (confirmText !== 'ELIMINAR') {
            toast.error('Por favor escribe ELIMINAR para confirmar');
            return;
        }

        setLoading(true);
        try {
            // 1. Marcar negocios como inactivos
            await supabase
                .from('businesses')
                .update({ status: 'deleted', updated_at: new Date() })
                .eq('owner_id', user.id);

            // 2. Registrar solicitud de eliminación
            await supabase
                .from('account_deletion_requests')
                .insert({
                    user_id: user.id,
                    email: user.email,
                    reason: reason || 'No especificado',
                    status: 'pending',
                    requested_at: new Date().toISOString()
                });

            // 3. Marcar perfil como eliminado
            await supabase
                .from('user_profiles')
                .update({
                    deleted_at: new Date().toISOString(),
                    full_name: '[Cuenta Eliminada]'
                })
                .eq('id', user.id);

            toast.success('Solicitud de eliminación enviada. Tu cuenta será eliminada en 30 días.');

            // 4. Cerrar sesión
            await logout();
            navigate('/');

        } catch (error) {
            console.error('Error al solicitar eliminación:', error);
            toast.error('Error al procesar la solicitud. Intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Eliminar Cuenta</h1>
                    <p className="text-gray-600 mb-6">Debes iniciar sesión para eliminar tu cuenta.</p>
                    <Link to="/login" className="text-blue-600 hover:underline">
                        Iniciar Sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <SEO
                title="Eliminar Cuenta | Geobooker"
                description="Solicita la eliminación de tu cuenta de Geobooker"
            />

            <div className="max-w-lg mx-auto">
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <div className="text-center mb-8">
                        <span className="text-5xl">⚠️</span>
                        <h1 className="text-2xl font-bold text-gray-900 mt-4">Eliminar mi cuenta</h1>
                        <p className="text-gray-600 mt-2">
                            Esta acción no se puede deshacer
                        </p>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <h3 className="font-bold text-red-800 mb-2">¿Qué sucederá?</h3>
                                <ul className="text-sm text-red-700 space-y-1">
                                    <li>• Tus negocios registrados serán eliminados</li>
                                    <li>• Tus reseñas y comentarios serán anonimizados</li>
                                    <li>• Perderás tu historial de referidos</li>
                                    <li>• Esta acción es permanente</li>
                                </ul>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <h3 className="font-bold text-blue-800 mb-2">Periodo de gracia</h3>
                                <p className="text-sm text-blue-700">
                                    Tu cuenta será eliminada en <strong>30 días</strong>.
                                    Durante este periodo puedes contactarnos para cancelar la solicitud.
                                </p>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition"
                            >
                                Continuar con la eliminación
                            </button>

                            <Link
                                to="/dashboard"
                                className="block text-center text-gray-600 hover:text-gray-800"
                            >
                                ← Cancelar y volver al Dashboard
                            </Link>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    ¿Por qué nos dejas? (opcional)
                                </label>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                >
                                    <option value="">Selecciona una razón</option>
                                    <option value="no_uso">Ya no uso el servicio</option>
                                    <option value="otra_plataforma">Uso otra plataforma</option>
                                    <option value="privacidad">Preocupaciones de privacidad</option>
                                    <option value="mal_servicio">Mal servicio</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Escribe <strong className="text-red-600">ELIMINAR</strong> para confirmar
                                </label>
                                <input
                                    type="text"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    placeholder="ELIMINAR"
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                                />
                            </div>

                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading || confirmText !== 'ELIMINAR'}
                                className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Procesando...' : '🗑️ Eliminar mi cuenta permanentemente'}
                            </button>

                            <button
                                onClick={() => setStep(1)}
                                className="w-full text-gray-600 hover:text-gray-800"
                            >
                                ← Volver
                            </button>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
                        <p>¿Tienes dudas? Contáctanos en <a href="mailto:contacto@geobooker.com.mx" className="text-blue-600 hover:underline">contacto@geobooker.com.mx</a></p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteAccountPage;
