import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { Lock, Eye, EyeOff, Check, X } from 'lucide-react';

const ResetPasswordPage = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState({
        password: '',
        confirmPassword: ''
    });

    const [validations, setValidations] = useState({
        minLength: false,
        hasNumber: false,
        hasLetter: false,
        passwordsMatch: false
    });

    // Validar contraseña en tiempo real
    useEffect(() => {
        const { password, confirmPassword } = formData;

        setValidations({
            minLength: password.length >= 6,
            hasNumber: /\d/.test(password),
            hasLetter: /[a-zA-Z]/.test(password),
            passwordsMatch: password === confirmPassword && password.length > 0
        });
    }, [formData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!validations.minLength || !validations.hasNumber || !validations.hasLetter) {
            toast.error('La contraseña no cumple con los requisitos mínimos');
            return;
        }

        if (!validations.passwordsMatch) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (error) throw error;

            toast.success('¡Contraseña actualizada exitosamente!');

            // Redirigir al login después de 1.5 segundos
            setTimeout(() => {
                navigate('/login');
            }, 1500);

        } catch (error) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Error al actualizar la contraseña');
        } finally {
            setLoading(false);
        }
    };

    const ValidationItem = ({ valid, text }) => (
        <div className={`flex items-center gap-2 text-xs ${valid ? 'text-green-600' : 'text-gray-500'}`}>
            {valid ? (
                <Check className="w-4 h-4" />
            ) : (
                <X className="w-4 h-4" />
            )}
            <span>{text}</span>
        </div>
    );

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
                        🔐 Nueva Contraseña
                    </h1>
                    <p className="text-gray-600">
                        Crea una contraseña segura para tu cuenta
                    </p>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Nueva Contraseña */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Nueva Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    placeholder="Ingresa tu nueva contraseña"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Confirmar Contraseña
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    placeholder="Confirma tu nueva contraseña"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? (
                                        <EyeOff className="h-5 w-5" />
                                    ) : (
                                        <Eye className="h-5 w-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Validaciones */}
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <p className="text-sm font-medium text-gray-700 mb-2">
                                Tu contraseña debe cumplir con:
                            </p>
                            <ValidationItem valid={validations.minLength} text="Mínimo 6 caracteres" />
                            <ValidationItem valid={validations.hasLetter} text="Al menos una letra" />
                            <ValidationItem valid={validations.hasNumber} text="Al menos un número" />
                            <ValidationItem valid={validations.passwordsMatch} text="Las contraseñas coinciden" />
                        </div>

                        {/* Botón Submit */}
                        <button
                            type="submit"
                            disabled={loading || !Object.values(validations).every(Boolean)}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Actualizando...
                                </span>
                            ) : (
                                'Actualizar contraseña'
                            )}
                        </button>
                    </form>
                </div>

                {/* Volver */}
                <div className="mt-6 text-center">
                    <Link to="/login" className="text-blue-600 hover:underline text-sm">
                        ← Volver al inicio de sesión
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
