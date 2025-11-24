import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const DashboardHome = () => {
  const [stats, setStats] = useState({
    totalBusinesses: 0,
    totalUsers: 0,
    pendingApprovals: 0,
    activeAds: 0,
    revenue: 0
  });

  const [recentActivity, setRecentActivity] = useState([]);

  // Cargar estadísticas
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Obtener estadísticas de negocios
      const { count: businessCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      // Obtener estadísticas de usuarios (necesitarás una tabla 'profiles')
      const { count: userCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Simular datos de actividad reciente
      const mockActivity = [
        { id: 1, type: 'new_business', message: 'Nuevo negocio "Café Central" registrado', time: 'Hace 5 min' },
        { id: 2, type: 'user_signup', message: 'Nuevo usuario registrado', time: 'Hace 12 min' },
        { id: 3, type: 'ad_purchase', message: 'Anuncio premium comprado', time: 'Hace 25 min' },
      ];

      setStats({
        totalBusinesses: businessCount || 0,
        totalUsers: userCount || 0,
        pendingApprovals: 5, // Simulado
        activeAds: 12, // Simulado
        revenue: 2450 // Simulado
      });

      setRecentActivity(mockActivity);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard Principal</h1>
        <p className="text-gray-600">Resumen general de la plataforma Geobooker</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Negocios</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.totalBusinesses}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">🏢</span>
            </div>
          </div>
          <p className="text-green-500 text-sm mt-2">+12% este mes</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Usuarios Registrados</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.totalUsers}</h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">👥</span>
            </div>
          </div>
          <p className="text-green-500 text-sm mt-2">+8% este mes</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Anuncios Activos</p>
              <h3 className="text-2xl font-bold text-gray-800">{stats.activeAds}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">📢</span>
            </div>
          </div>
          <p className="text-green-500 text-sm mt-2">+3 nuevos hoy</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ingresos Mensuales</p>
              <h3 className="text-2xl font-bold text-gray-800">${stats.revenue}</h3>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <span className="text-yellow-600 text-xl">💰</span>
            </div>
          </div>
          <p className="text-green-500 text-sm mt-2">+15% vs mes anterior</p>
        </div>
      </div>

      {/* Actividad Reciente y Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Actividad Reciente */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Actividad Reciente</h3>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 text-sm">📌</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gráfico de Crecimiento (Placeholder) */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800 mb-4">Crecimiento de la Plataforma</h3>
          <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
            <p className="text-gray-500">Gráfico de crecimiento se integrará aquí</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome; // Después de la función const DashboardHome = () => { ... };