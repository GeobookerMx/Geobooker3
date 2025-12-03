// src/pages/admin/DashboardLayout.jsx
import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import Sidebar from '../../components/admin/Sidebar';

const DashboardLayout = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState(null);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            // Verificar sesión
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                navigate('/admin/login');
                return;
            }

            // Verificar si es admin
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
            <div className="min-h-screen flex items-center justify-center bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando acceso...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            {/* Main Content */}
            <div className="flex-1 ml-64 overflow-y-auto">
                {/* Header */}
                <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                    <div className="px-8 py-4 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
                            <p className="text-sm text-gray-600">Bienvenido, {user?.email}</p>
                        </div>
                        <div className="flex items-center space-x-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                                {user?.role || 'Admin'}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
