// src/components/admin/Sidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Home,
    Store,
    Users,
    TrendingUp,
    Settings,
    LogOut,
    BarChart3,
    DollarSign
} from 'lucide-react';

const Sidebar = ({ onLogout }) => {
    const location = useLocation();

    const menuItems = [
        { path: '/admin/dashboard', icon: Home, label: 'Vista General' },
        { path: '/admin/businesses', icon: Store, label: 'Negocios' },
        { path: '/admin/users', icon: Users, label: 'Usuarios' },
        { path: '/admin/ads', icon: TrendingUp, label: '🚀 Geobooker Ads' },
        { path: '/admin/analytics', icon: BarChart3, label: 'Analytics' },
        { path: '/admin/revenue', icon: DollarSign, label: 'Ingresos' },
        { path: '/admin/settings', icon: Settings, label: 'Configuración' },
    ];

    const isActive = (path) => location.pathname === path;

    return (
        <div className="h-screen w-64 bg-gray-900 text-white flex flex-col fixed left-0 top-0">
            {/* Logo */}
            <div className="p-6 border-b border-gray-800">
                <img
                    src="/images/geobooker-logo.png"
                    alt="Geobooker"
                    className="h-10 w-auto mb-2"
                />
                <p className="text-xs text-gray-400">Panel de Administración</p>
            </div>

            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto py-4">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center px-6 py-3 transition-colors ${isActive(item.path)
                                ? 'bg-blue-600 text-white border-l-4 border-blue-400'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                }`}
                        >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-3 text-gray-300 hover:bg-red-600 hover:text-white rounded-lg transition-colors"
                >
                    <LogOut className="w-5 h-5 mr-3" />
                    <span className="font-medium">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
