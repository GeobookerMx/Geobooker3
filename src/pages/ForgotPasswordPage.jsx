import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Mail, ArrowLeft, Check } from 'lucide-react';

const ForgotPasswordPage = () => {
    useTranslation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    // ✅ FIX Bug #5: Rate limiting en cliente — previene "Limit Exceeded"
    const [cooldown, setCooldown] = useState(0); // Segundos restantes de espera
    const cooldownRef = React.useRef(null);

    React.useEffect(() => {
        return () => {
            if (cooldownRef.current) {
                clearInterval(cooldownRef.current);
            }
        };
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email.trim()) {
            toast.error('Por favor ingresa tu correo electrónico');
            return;
        }

        // ✅ FIX Bug #5: No enviar si hay cooldown activo
        if (cooldown > 0) {
            toast.error(`Espera ${cooldown} segundos antes de intentar de nuevo.`);
            return;
        }

        setLoading(true);

        try {
            const normalizedEmail = email.trim().toLowerCase();
            const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
                redirectTo: `${window.location.origin}/reset-password`
            });

            if (error) throw error;

            setEmailSent(true);
            toast.success('¡Correo enviado! Revisa tu bandeja de entrada.');

            // ✅ FIX Bug #5: Activar cooldown de 60 segundos tras enviar exitosamente
            setCooldown(60);
            cooldownRef.current = setInterval(() => {
                setCooldown(prev => {
                    if (prev <= 1) {
                        clearInterval(cooldownRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

        } catch (error) {
            console.error('Error sending reset email:', error);

            // ✅ FIX Bug #5: Mensajes de error amigables según el código de error
            const msg = error.message || '';
            const code = error.code || error.status || '';

            if (msg.includes('rate') || msg.includes('limit') || msg.includes('Limit') || code === 'over_email_send_rate_limit') {
                toast.error('⏳ Demasiados intentos. Espera unos minutos e intenta de nuevo.', { duration: 6000 });
            } else if (msg.includes('Invalid email') || msg.includes('invalid')) {
                toast.error('El correo ingresado no es válido.');
            } else if (msg.includes('User not found') || msg.includes('not found')) {
                // Por seguridad mostramos éxito aunque el correo no exista
                setEmailSent(true);
                toast.success('¡Correo enviado! Revisa tu bandeja de entrada.');
            } else {
                toast.error('Error al enviar el correo. Inténtalo de nuevo en unos minutos.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-12">
            <div className="max-w-md w-full">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/welcome" className="inline-block mb-4">
                        <img
                            src="/images/geobooker-logo.png"
                            alt="Geobooker"
                            className="h-16 w-auto mx-auto"
                        />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {emailSent ? '✉️ Correo Enviado' : '🔑 Recuperar Contraseña'}
                    </h1>
                    <p className="text-gray-600">
                        {emailSent
                            ? 'Te hemos enviado un enlace de recuperación'
                            : 'Ingresa tu correo para recibir un enlace de recuperación'
                        }
                    </p>
                </div>

                {/* Formulario o mensaje de éxito */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    {emailSent ? (
                        // Mensaje de éxito
                        <div className="text-center space-y-6">
                            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>

                            <div className="space-y-3">
                                <h3 className="text-xl font-semibold text-gray-900">
                                    ¡Revisa tu correo!
                                </h3>
                                <p className="text-gray-600 text-sm">
                                    Te enviamos un enlace a <span className="font-semibold text-blue-600">{email}</span>
                                </p>
                                <p className="text-gray-500 text-xs">
                                    Si no ves el correo, revisa tu carpeta de spam o correo no deseado.
                                </p>
                            </div>

                            <div className="pt-4 space-y-3">
                                <button
                                    onClick={() => {
                                        setEmailSent(false);
                                        setEmail('');
                                    }}
                                    className="w-full text-blue-600 hover:text-blue-700 font-medium text-sm py-2"
                                >
                                    Cambiar correo electrónico
                                </button>

                                <Link
                                    to="/login"
                                    className="block w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold text-center"
                                >
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </div>
                    ) : (
                        // Formulario
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-gray-700 font-medium mb-2">
                                    Correo Electrónico
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <Mail className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        placeholder="tu@email.com"
                                    />
                                </div>
                                <p className="mt-2 text-xs text-gray-500">
                                    Te enviaremos un enlace para restablecer tu contraseña.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={loading || cooldown > 0}
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Enviando...
                                    </span>
                                ) : cooldown > 0 ? (
                                    <span>⏳ Espera {cooldown}s para reintentar</span>
                                ) : (
                                    'Enviar enlace de recuperación'
                                )}
                            </button>

                            <div className="text-center">
                                <Link
                                    to="/login"
                                    className="inline-flex items-center text-sm text-blue-600 hover:underline"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-1" />
                                    Volver al inicio de sesión
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                {/* Ayuda adicional */}
                {!emailSent && (
                    <div className="mt-6 text-center bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">
                            ¿No tienes cuenta?{' '}
                            <Link to="/signup" className="text-blue-600 font-semibold hover:underline">
                                Regístrate gratis
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;
