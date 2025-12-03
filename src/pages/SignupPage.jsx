import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const SignupPage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        acceptTerms: false
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones
        if (!formData.fullName.trim()) {
            toast.error('Por favor ingresa tu nombre completo');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error('Las contraseñas no coinciden');
            return;
        }

        if (!formData.acceptTerms) {
            toast.error('Debes aceptar los términos y condiciones');
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.fullName
                    }
                }
            });

            if (error) throw error;

            toast.success('¡Cuenta creada exitosamente! Revisa tu email para confirmar.');

            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (error) {
            console.error('Error al registrarse:', error);
            if (error.message.includes('already registered')) {
                toast.error('Este email ya está registrado');
            } else {
                toast.error(error.message || 'Error al crear la cuenta');
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
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear Cuenta</h1>
                    <p className="text-gray-600">Únete a Geobooker hoy</p>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-2xl shadow-xl p-8">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Nombre Completo */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                name="fullName"
                                value={formData.fullName}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="Juan Pérez"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Correo Electrónico
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="tu@email.com"
                            />
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                minLength={8}
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="Mínimo 8 caracteres"
                            />
                        </div>

                        {/* Confirmar Contraseña */}
                        <div>
                            <label className="block text-gray-700 font-medium mb-2">
                                Confirmar Contraseña
                            </label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                placeholder="Repite tu contraseña"
                            />
                        </div>

                        {/* Términos y Condiciones */}
                        <div className="flex items-start">
                            <input
                                type="checkbox"
                                name="acceptTerms"
                                checked={formData.acceptTerms}
                                onChange={handleChange}
                                required
                                className="mt-1 mr-2 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <label className="text-sm text-gray-600">
                                Acepto los{' '}
                                <Link to="/terms" className="text-blue-600 hover:underline">
                                    Términos de Servicio
                                </Link>{' '}
                                y la{' '}
                                <Link to="/privacy" className="text-blue-600 hover:underline">
                                    Política de Privacidad
                                </Link>
                            </label>
                        </div>

                        {/* Botón Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Creando cuenta...
                                </span>
                            ) : (
                                'Crear Cuenta'
                            )}
                        </button>
                    </form>

                    {/* Link a Login */}
                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            ¿Ya tienes cuenta?{' '}
                            <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                                Inicia Sesión
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SignupPage;
