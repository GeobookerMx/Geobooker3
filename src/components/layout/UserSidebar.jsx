import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Building2, User, Crown, LogOut, Map, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';

const UserSidebar = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = async () => {
        try {
            await supabase.auth.signOut();
            toast.success('Sesión cerrada');
            navigate('/login');
        } catch (error) {
            console.error('Error logging out:', error);
            toast.error('Error al cerrar sesión');
        }
    };

    const handleNavigate = (path) => {
        setIsMobileMenuOpen(false);
        navigate(path);
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

    // Sidebar Content Component
    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="p-6 border-b border-gray-200">
                <button onClick={() => handleNavigate('/')} className="flex items-center">
                    <img
                        src="/images/geobooker-logo-horizontal.png"
                        alt="Geobooker"
                        className="h-8 w-auto"
                    />
                </button>
            </div>

            {/* User Info */}
            <div className="p-4 border-b border-gray-200">
                <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {user?.user_metadata?.full_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
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
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {menuItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);

                    return (
                        <button
                            key={item.name}
                            onClick={() => handleNavigate(item.path)}
                            className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors text-left ${active
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
                        </button>
                    );
                })}
            </nav>

            {/* Quick Actions */}
            <div className="p-4 border-t border-gray-200">
                <button
                    onClick={() => handleNavigate('/')}
                    className="flex items-center justify-center w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition mb-2"
                >
                    <Map className="w-4 h-4 mr-2" />
                    Ver Mapa
                </button>
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full text-gray-700 hover:text-red-600 hover:bg-red-50 py-3 rounded-lg font-medium transition"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Cerrar Sesión
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 px-4 py-3 flex items-center justify-between">
                <button onClick={() => handleNavigate('/')} className="flex items-center">
                    <img
                        src="/images/geobooker-logo-horizontal.png"
                        alt="Geobooker"
                        className="h-6 w-auto"
                    />
                </button>
                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <aside className={`
                md:hidden fixed top-0 left-0 w-72 h-full bg-white z-50 transform transition-transform duration-300 flex flex-col
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                <SidebarContent />
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 min-h-screen flex-col">
                <SidebarContent />
            </aside>

            {/* Spacer for mobile top bar */}
            <div className="md:hidden h-14" />
        </>
    );
};

export default UserSidebar;
