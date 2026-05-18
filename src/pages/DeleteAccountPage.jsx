// src/pages/DeleteAccountPage.jsx
// ✅ Apple Guideline 5.1.1(v): Eliminación REAL de cuenta dentro de la app

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import SEO from '../components/SEO';
import { Trash2, AlertTriangle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

const DeleteAccountPage = () => {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=advertencia, 2=confirmar, 3=eliminada
    const [loading, setLoading] = useState(false);

    // ✅ Llamada al backend seguro (Netlify Function con service_role)
    const handleDeleteAccount = async () => {
        setLoading(true);
        try {
            // 1. Obtener token JWT del usuario actual
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                toast.error('Tu sesión ha expirado. Inicia sesión de nuevo.');
                navigate('/login');
                return;
            }

            // 2. Llamar a Netlify Function segura con el JWT
            const response = await fetch('/.netlify/functions/delete-account', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                }
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(result.error || 'Error al eliminar la cuenta');
            }

            // 3. Mostrar pantalla de confirmación
            setStep(3);

            // 4. Cerrar sesión localmente
            await signOut();

        } catch (error) {
            console.error('Error al eliminar cuenta:', error);
            toast.error('Error: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Pantalla: cuenta eliminada exitosamente
    if (step === 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
                <SEO title="Cuenta eliminada | Geobooker" description="Tu cuenta ha sido eliminada correctamente." />
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-10 h-10 text-green-600" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-3">Cuenta eliminada</h1>
                    <p className="text-gray-600 mb-8">
                        Tu cuenta y tus datos personales han sido eliminados correctamente de Geobooker.
                        Gracias por haber sido parte de nuestra comunidad.
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                    >
                        Ir al inicio
                    </button>
                </div>
            </div>
        );
    }

    // Redirigir a login si no hay usuario
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
                <div className="text-center max-w-sm">
                    <h1 className="text-2xl font-bold text-gray-800 mb-4">Eliminar cuenta</h1>
                    <p className="text-gray-600 mb-6">Debes iniciar sesión para eliminar tu cuenta.</p>
                    <Link
                        to="/login"
                        className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition"
                    >
                        Iniciar sesión
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <SEO
                title="Eliminar mi cuenta | Geobooker"
                description="Elimina permanentemente tu cuenta y datos de Geobooker."
            />

            <div className="max-w-lg mx-auto">

                {/* PASO 1: Advertencia */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Eliminar mi cuenta</h1>
                            <p className="text-gray-500 mt-2 text-sm">
                                Sesión activa: <strong>{user.email}</strong>
                            </p>
                        </div>

                        {/* Advertencia */}
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-6">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <h3 className="font-bold text-red-800 mb-2">¿Qué pasará con tu cuenta?</h3>
                                    <ul className="text-sm text-red-700 space-y-1.5">
                                        <li>• Tu perfil y datos personales serán eliminados permanentemente</li>
                                        <li>• Tus negocios registrados serán dados de baja</li>
                                        <li>• Tu historial de actividad será borrado</li>
                                        <li>• No podrás recuperar tu cuenta</li>
                                        <li>• Podrás crear una cuenta nueva en el futuro</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 text-sm text-blue-700">
                            <strong>Nota legal:</strong> Conservaremos únicamente la información que debamos mantener
                            por obligaciones legales, fiscales o de seguridad. El resto se eliminará
                            de forma permanente.
                        </div>

                        {/* Botones */}
                        <div className="space-y-3">
                            <button
                                onClick={() => setStep(2)}
                                className="w-full bg-red-600 text-white py-3.5 rounded-xl font-semibold hover:bg-red-700 transition flex items-center justify-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                Continuar con la eliminación
                            </button>
                            <Link
                                to="/dashboard"
                                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 py-3 transition"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Cancelar — volver al dashboard
                            </Link>
                        </div>
                    </div>
                )}

                {/* PASO 2: Confirmación final */}
                {step === 2 && (
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-600" />
                            </div>
                            <h1 className="text-2xl font-bold text-gray-900">Confirmar eliminación</h1>
                            <p className="text-gray-600 mt-2">
                                Esta acción es <strong>permanente e irreversible</strong>.
                            </p>
                        </div>

                        <div className="bg-gray-50 rounded-xl p-4 mb-8 text-sm text-gray-700 text-center">
                            Se eliminará la cuenta de:<br />
                            <strong className="text-gray-900 text-base">{user.email}</strong>
                        </div>

                        <div className="space-y-3">
                            <button
                                onClick={handleDeleteAccount}
                                disabled={loading}
                                className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Eliminando cuenta...
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-5 h-5" />
                                        Eliminar mi cuenta definitivamente
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => setStep(1)}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-800 py-3 transition disabled:opacity-50"
                            >
                                <ArrowLeft className="w-4 h-4" />
                                Regresar
                            </button>
                        </div>

                        <p className="text-center text-xs text-gray-400 mt-6">
                            ¿Tienes dudas? Contáctanos en{' '}
                            <a href="mailto:ventasgeobooker@gmail.com" className="text-blue-600 hover:underline">
                                ventasgeobooker@gmail.com
                            </a>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default DeleteAccountPage;
