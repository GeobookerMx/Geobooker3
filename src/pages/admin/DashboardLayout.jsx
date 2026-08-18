// src/pages/admin/DashboardLayout.jsx
import React, { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Moon, Sun } from 'lucide-react';
import Sidebar from '../../components/admin/Sidebar';

const ADMIN_PAGE_META = [
    ['/admin/crm2-operations', 'CRM 2.0 · Operaciones', 'Pipeline, tareas, oportunidades y scoring'],
    ['/admin/crm2-directory', 'CRM 2.0 · Directorio', 'Cuentas y contactos con acceso restringido'],
    ['/admin/crm2-imports', 'CRM 2.0 · Importación', 'Staging, deduplicación y procedencia'],
    ['/admin/scraper-history', 'Historial de leads', 'Resultados y trazabilidad de captación'],
    ['/admin/smart-campaigns', 'Campañas inteligentes', 'Preparación y control de campañas'],
    ['/admin/recommendations', 'Recomendaciones', 'Moderación de recomendaciones comunitarias'],
    ['/admin/businesses', 'Negocios', 'Aprobación y administración de negocios'],
    ['/admin/analytics', 'Analítica', 'Indicadores de uso y rendimiento'],
    ['/admin/revenue', 'Ingresos', 'Resumen financiero y monetización'],
    ['/admin/inventory', 'Inventario publicitario', 'Disponibilidad y espacios publicitarios'],
    ['/admin/scan-invite', 'Scan Local', 'Captación local y seguimiento asistido'],
    ['/admin/security', 'Seguridad', 'Controles, auditoría y alertas'],
    ['/admin/reports', 'Reportes', 'Moderación de reportes de negocios'],
    ['/admin/ad-reports', 'Reportes de anuncios', 'Incidencias de publicidad'],
    ['/admin/referrals', 'Referidos', 'Programa de referencias'],
    ['/admin/scraper', 'Apify Scraper', 'Captación global de prospectos'],
    ['/admin/fiscal', 'Control fiscal', 'Configuración y seguimiento fiscal'],
    ['/admin/settings', 'Configuración', 'Ajustes administrativos'],
    ['/admin/users', 'Usuarios', 'Administración de cuentas'],
    ['/admin/ads', 'Publicidad', 'Campañas y anuncios'],
    ['/admin/blog', 'Contenido', 'Administración editorial'],
    ['/admin/import', 'Importación', 'Carga controlada de datos'],
    ['/admin/crm', 'CRM y Marketing', 'Contactos, colas y seguimiento comercial'],
    ['/admin/dashboard', 'Dashboard', 'Vista general de la operación']
];

const getAdminPageMeta = (pathname) => {
    const match = ADMIN_PAGE_META.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
    return match
        ? { title: match[1], description: match[2] }
        : { title: 'Administración', description: 'Centro de control Geobooker' };
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
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
    const pageMeta = getAdminPageMeta(location.pathname);

    // Aplicar/remover clase dark al documento
    useEffect(() => {
        if (darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('admin-dark-mode', darkMode.toString());
    }, [darkMode]);

    const checkAuth = useCallback(async () => {
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
    }, [navigate]);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

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
        <div className="min-h-screen overflow-x-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
            {/* Sidebar */}
            <Sidebar onLogout={handleLogout} />

            {/* Main Content - responsive: sin margen en móvil, con margen en desktop */}
            <div id="geobooker-screen" className="md:ml-64 min-h-screen min-w-0 overflow-y-auto">
                {/* Header */}
                <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 pt-[var(--safe-area-inset-top)]">
                    <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-4 px-4 py-4 md:px-6 xl:px-8">
                        {/* Espacio para hamburger en móvil */}
                        <div className="ml-10 min-w-0 md:ml-0">
                            <h2 className="truncate text-xl font-bold text-gray-800 dark:text-white md:text-2xl">{pageMeta.title}</h2>
                            <p className="hidden truncate text-sm text-gray-600 dark:text-gray-400 md:block">
                                {pageMeta.description} · {user?.email}
                            </p>
                        </div>
                        <div className="flex shrink-0 items-center space-x-3">
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
                <main className="w-full max-w-full px-3 py-4 md:px-5 md:py-6 xl:px-8">
                    <div className="mx-auto w-full max-w-[1600px] min-w-0">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
