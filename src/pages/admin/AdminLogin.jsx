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
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center px-4 relative overflow-hidden">
            {/* Patrón de fondo - Círculos y líneas de mapa */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {/* Grid pattern */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />

                {/* Floating map pins */}
                <div className="absolute top-20 left-[10%] text-blue-400/30 animate-pulse">
                    <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>
                <div className="absolute top-40 right-[15%] text-cyan-400/20 animate-pulse" style={{ animationDelay: '1s' }}>
                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>
                <div className="absolute bottom-32 left-[20%] text-purple-400/20 animate-pulse" style={{ animationDelay: '2s' }}>
                    <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>
                <div className="absolute bottom-20 right-[25%] text-blue-300/25 animate-pulse" style={{ animationDelay: '0.5s' }}>
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                    </svg>
                </div>

                {/* Glowing orbs */}
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-600/15 rounded-full filter blur-3xl" />
            </div>

            <div className="max-w-md w-full relative z-10">
                {/* Logo y título */}
                <div className="text-center mb-8">
                    <div className="relative inline-block mb-6">
                        <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl scale-150" />
                        <img
                            src="/images/geobooker-logo.png"
                            alt="Geobooker"
                            className="h-24 w-auto mx-auto relative drop-shadow-2xl"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-lg">Panel de Administración</h1>
                    <p className="text-blue-300 text-lg">Geobooker Control Center</p>
                </div>

                {/* Card del formulario con glassmorphism */}
                <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Acceso Seguro</h2>
                            <p className="text-blue-200 text-sm">Ingresa tus credenciales</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                                Email de Administrador
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-white placeholder-blue-300/50 backdrop-blur-sm"
                                placeholder="admin@geobooker.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-blue-200 mb-2">
                                Contraseña
                            </label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition text-white placeholder-blue-300/50 backdrop-blur-sm"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-4 rounded-xl hover:from-blue-500 hover:to-purple-500 transition-all duration-300 font-bold text-lg shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Verificando...
                                </span>
                            ) : 'Ingresar al Dashboard →'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <a href="/" className="text-blue-300 hover:text-white transition-colors text-sm flex items-center justify-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Volver a Geobooker
                        </a>
                    </div>
                </div>

                {/* Footer de seguridad */}
                <div className="mt-8 text-center">
                    <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10">
                        <svg className="w-4 h-4 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-blue-200 text-sm">Conexión segura SSL</span>
                    </div>
                    <p className="text-blue-400/60 text-xs mt-3">
                        © 2024 Geobooker • Acceso exclusivo para administradores
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminLogin;
