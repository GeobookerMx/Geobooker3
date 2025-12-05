import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Building2, User, Crown, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

const UserSidebar = () => {
    const location = useLocation();
    const { user } = useAuth();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const menuItems = [
        {
            name: 'Panel Principal',
            path: '/dashboard',
            icon: Home
        },
        {
            name: 'Mis Negocios',
            path: '/dashboard',
            icon: Building2,
            badge: 'Tab'
        },
        {
            name: 'Mi Perfil',
            path: '/dashboard',
            icon: User,
            badge: 'Tab'
        },
        {
            name: 'Actualizar a Premium',
            path: '/dashboard/upgrade',
            icon: Crown,
            highlight: true
        }
    ];

    const isActive = (path) => {
        if (path === '/dashboard') {
            return location.pathname === '/dashboard';
        }
        return location.pathname.startsWith(path);
    };

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
                <Link to="/" className="flex items-center">
                    <img
                        src="/images/geobooker-logo-horizontal.png"
                        alt="Geobooker"
                        className="h-8 w-auto"
                    />
                </Link>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user?.user_metadata?.full_name?.[0] || user?.email?.[0].toUpperCase()}
                    </div>
                    <div className="ml-3 flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                            {user?.user_metadata?.full_name || 'Usuario'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <Link
                            key={item.name}
                            to={item.path}
                            className={`flex items-center px-4 py-3 rounded-lg transition-colors ${active
                                    ? 'bg-blue-50 text-blue-600'
                                    : item.highlight
                                        ? 'bg-gradient-to-r from-yellow-50 to-orange-50 text-orange-600 hover:from-yellow-100 hover:to-orange-100'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            <Icon className={`w-5 h-5 mr-3 ${item.highlight ? 'fill-yellow-500' : ''}`} />
                            <span className="font-medium">{item.name}</span>
                            {item.badge && (
                                <span className="ml-auto text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                                    {item.badge}
                                </span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Quick Actions */}
            <div className="p-4 border-t border-gray-200">
                <Link
                    to="/"
                    className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition mb-2"
                >
                    Ver Mapa
                </Link>
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full text-gray-700 hover:text-red-600 py-2 rounded-lg font-medium transition"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default UserSidebar;
