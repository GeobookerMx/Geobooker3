// src/components/admin/Sidebar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Store,
    Users,
    TrendingUp,
    Settings,
    LogOut,
    BarChart3,
    DollarSign,
    Menu,
    X,
    Newspaper,
    Gift,
    Database,
    Mail,
    Globe
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Sidebar = ({ onLogout }) => {
    const location = useLocation();
    const [pendingBusinesses, setPendingBusinesses] = useState(0);
    const [pendingCampaigns, setPendingCampaigns] = useState(0);
    const [pendingRecommendations, setPendingRecommendations] = useState(0);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Cerrar menú al cambiar de ruta
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    // Cargar conteos de pendientes
    useEffect(() => {
        loadPendingCounts();
        const interval = setInterval(loadPendingCounts, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadPendingCounts = async () => {
        try {
            const { count: businessCount } = await supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            setPendingBusinesses(businessCount || 0);

            const { count: campaignCount } = await supabase
                .from('ad_campaigns')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending_review');
            setPendingCampaigns(campaignCount || 0);

            const { count: recsCount } = await supabase
                .from('user_recommendations')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');
            setPendingRecommendations(recsCount || 0);
        } catch (error) {
            console.error('Error loading pending counts:', error);
        }
    };

    // Sidebar organizado en secciones
    const menuSections = [
        {
            title: '📊 General',
            items: [
                { path: '/admin/dashboard', icon: Home, label: 'Vista General' },
                { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
                { path: '/admin/revenue', icon: DollarSign, label: 'Ingresos' },
                { path: 'https://clarity.microsoft.com/projects', icon: BarChart3, label: '🔥 Clarity (Heatmaps)', external: true },
            ]
        },
        {
            title: '🏪 Negocios & Usuarios',
            items: [
                { path: '/admin/businesses', icon: Store, label: 'Negocios', badge: pendingBusinesses, badgeColor: 'yellow' },
                { path: '/admin/users', icon: Users, label: 'Usuarios' },
                { path: '/admin/reports', icon: BarChart3, label: '⚠️ Reportes Negocios' },
            ]
        },
        {
            title: '📢 Publicidad',
            items: [
                { path: '/admin/ads', icon: TrendingUp, label: '🚀 Geobooker Ads', badge: pendingCampaigns, badgeColor: 'red' },
                { path: '/admin/ads-qa', icon: BarChart3, label: '🧪 Ads QA Tool' },
                { path: '/admin/inventory', icon: BarChart3, label: '📦 Ad Inventory' },
                { path: '/admin/ad-reports', icon: BarChart3, label: '🚩 Reportes Anuncios' },
            ]
        },
        {
            title: '⭐ Comunidad',
            items: [
                { path: '/admin/recommendations', icon: Store, label: '⭐ Recomendaciones', badge: pendingRecommendations, badgeColor: 'yellow' },
                { path: '/admin/referrals', icon: Gift, label: '🎁 Referidos' },
                { path: '/admin/blog', icon: Newspaper, label: '📝 Blog' },
            ]
        },
        {
            title: '🎯 Marketing & CRM',
            items: [
                { path: '/admin/marketing', icon: Mail, label: '🎯 CRM & Marketing' },
                { path: '/admin/scan-invite', icon: Users, label: '🇲🇽 Scan Local' },
                { path: '/admin/scraper', icon: Globe, label: '🌍 Apify Scraper ($)' },
                { path: '/admin/scraper-history', icon: Database, label: '📂 Leads x Scrapping' },
            ]
        },
        {
            title: '⚙️ Sistema',
            items: [
                { path: '/admin/import', icon: Database, label: '📥 Importar Datos' },
                { path: '/admin/fiscal', icon: Database, label: '🧾 Control Fiscal' },
                { path: '/admin/settings', icon: Settings, label: 'Configuración' },
            ]
        },
    ];



    const isActive = (path) => location.pathname === path;

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-6 border-b border-gray-800 dark:border-gray-700">
                <img
                    src="/images/geobooker-logo.png"
                    alt="Geobooker"
                    className="h-10 w-auto mb-2"
                />
                <p className="text-xs text-gray-400">Panel de Administración</p>
            </div>

            {/* Navegación por secciones */}
            <nav className="flex-1 overflow-y-auto py-2">
                {menuSections.map((section, sIdx) => (
                    <div key={section.title}>
                        {/* Section Header */}
                        {sIdx > 0 && <div className="border-t border-gray-700/50 mx-4 my-2" />}
                        <p className="px-6 pt-3 pb-1 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                            {section.title}
                        </p>
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            const linkClass = `flex items-center justify-between px-6 py-2.5 transition-colors text-sm ${isActive(item.path)
                                ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`;

                            const content = (
                                <>
                                    <div className="flex items-center">
                                        <Icon className="w-4 h-4 mr-3" />
                                        <span className="font-medium">{item.label}</span>
                                    </div>
                                    {item.badge > 0 && (
                                        <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${item.badgeColor === 'red'
                                            ? 'bg-red-500 text-white animate-pulse'
                                            : 'bg-yellow-400 text-gray-900'
                                            }`}>
                                            {item.badge}
                                        </span>
                                    )}
                                </>
                            );

                            if (item.external) {
                                return (
                                    <a
                                        key={item.path}
                                        href={item.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={linkClass}
                                    >
                                        {content}
                                    </a>
                                );
                            }

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={linkClass}
                                >
                                    {content}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>


            {/* Logout */}
            <div className="p-4 border-t border-gray-800 dark:border-gray-700">
                <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Botón hamburger para móvil */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-lg shadow-lg"
                aria-label="Abrir menú"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Overlay para móvil */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Sidebar móvil (drawer) */}
            <div className={`
                md:hidden fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white flex flex-col
                transform transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent />
            </div>

            {/* Sidebar desktop (siempre visible) */}
            <div className="hidden md:flex h-screen w-64 bg-gray-900 text-white flex-col fixed left-0 top-0">
                <SidebarContent />
            </div>
        </>
    );
};

export default Sidebar;
