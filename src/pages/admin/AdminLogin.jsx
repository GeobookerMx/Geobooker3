// src/pages/admin/AdminLogin.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

const AdminLogin = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Login con Supabase
            const { data, error } = await supabase.auth.signInWithPassword({
                email: formData.email,
                password: formData.password
            });

            if (error) throw error;

            // Verificar si es admin (esto lo configuraremos en Supabase)
            const { data: adminData, error: adminError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (adminError || !adminData) {
                await supabase.auth.signOut();
                throw new Error('No tienes permisos de administrador');
            }

            toast.success('¡Bienvenido al Dashboard!');
            navigate('/admin/dashboard');
        } catch (error) {
            console.error('Error de login:', error);
            toast.error(error.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center px-4">
            <div className="max-w-md w-full">
                {/* Logo y título */}
                <div className="text-center mb-8">
                    <img
                        src="/images/geobooker-logo.png"
                        alt="Geobooker"
                        className="h-20 w-auto mx-auto mb-4"
                    />
                    <h1 className="text-2xl font-bold text-white mb-2">Panel de Administración</h1>
                    <p className="text-blue-100">Geobooker Admin</p>
                </div>

                {/* Formulario */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6">Iniciar Sesión</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Email de Administrador
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="admin@geobooker.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-sm text-blue-600 hover:text-blue-800">
                            ← Volver a la página principal
                        </a>
                    </div>
                </div>

                {/* Información de seguridad */}
                <div className="mt-6 text-center text-blue-100 text-sm">
                    <p>🔒 Acceso restringido solo para administradores</p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
