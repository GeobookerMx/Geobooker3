// src/pages/admin/DashboardLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Moon, Sun } from 'lucide-react';
import Sidebar from '../../components/admin/Sidebar';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);
    const [darkMode, setDarkMode] = useState(() => {
        // Leer preferencia guardada o preferencia del sistema
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('admin-dark-mode');
            if (saved !== null) return saved === 'true';
            return window.matchMedia('(prefers-color-scheme: dark)').matches;
        }
        return false;
    });

    // Aplicar/remover clase dark al documento
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('admin-dark-mode', darkMode.toString());
    }, [darkMode]);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/admin/login');
                return;
            }

            const { data: adminData, error } = await supabase
                .from('admin_users')
                .select('*')
                .eq('id', session.user.id)
                .single();

            if (error || !adminData) {
                toast.error('No tienes permisos de administrador');
                await supabase.auth.signOut();
                navigate('/admin/login');
                return;
            }

            setUser(adminData);
            setLoading(false);
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            navigate('/admin/login');
        }
    };

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            toast.success('Sesión cerrada correctamente');
            navigate('/admin/login');
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
            toast.error('Error al cerrar sesión');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-300">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            {/* Main Content - responsive: sin margen en móvil, con margen en desktop */}
            <div className="flex-1 md:ml-64 overflow-y-auto overflow-x-hidden min-h-screen">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                    <div className="px-4 md:px-8 py-4 flex justify-between items-center">
                        {/* Espacio para hamburger en móvil */}
                        <div className="ml-10 md:ml-0">
                            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">Dashboard</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400 hidden md:block">Bienvenido, {user?.email}</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            {/* Toggle Dark Mode */}
                            <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-yellow-400 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                aria-label={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
                            >
                                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                            </button>
                            <span className="hidden md:inline-block px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs font-semibold">
                                {user?.role || 'Admin'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content - allow horizontal scroll in tables */}
                <main className="p-4 md:p-8 overflow-x-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
