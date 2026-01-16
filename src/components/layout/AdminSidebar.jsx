// src/components/Layout/AdminSidebar.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const AdminSidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊' },
    { path: '/admin/businesses', label: 'Gestión de Negocios', icon: '🏢' },
    { path: '/admin/users', label: 'Gestión de Usuarios', icon: '👥' },
    { path: '/admin/marketing-dashboard', label: 'Marketing Email', icon: '📧' },
    { path: '/admin/unified-crm', label: 'CRM WhatsApp', icon: '📱' },
    { path: '/admin/advertising', label: 'Publicidad', icon: '📢' },
    { path: '/admin/analytics', label: 'Analíticas', icon: '📈' },
  ];

  const isActive = (path) => {
    return location.pathname === path ? 'bg-blue-700 text-white' : 'text-gray-300 hover:bg-blue-600';
  };

  return (
    <div className="bg-blue-800 text-white w-64 min-h-screen p-6">
      {/* Logo del Dashboard */}
      <div className="mb-8">
        <h2 className="text-xl font-bold">Geobooker Admin</h2>
        <p className="text-blue-200 text-sm">Panel de Control</p>
      </div>

      {/* Menú de Navegación */}
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${isActive(item.path)}`}
          >
            <span className="text-lg">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Sección de Estadísticas Rápidas */}
      <div className="mt-8 pt-6 border-t border-blue-700">
        <h3 className="text-sm font-semibold text-blue-200 mb-3">Resumen Rápido</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Negocios:</span>
            <span className="font-bold">125</span>
          </div>
          <div className="flex justify-between">
            <span>Usuarios:</span>
            <span className="font-bold">892</span>
          </div>
          <div className="flex justify-between">
            <span>Ingresos:</span>
            <span className="font-bold text-green-300">$2,450</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminSidebar;