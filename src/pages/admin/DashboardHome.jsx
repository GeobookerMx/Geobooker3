// src/pages/admin/DashboardHome.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
  Users,
  Store,
  TrendingUp,
  DollarSign,
  Eye,
  Calendar,
  CheckCircle,
  Clock,
  ArrowUpRight,
  Activity,
  Search,
  Smartphone,
  Monitor,
  Globe,
  ExternalLink,
  Flame,
  Video
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsSummary,
  getTopSearches,
  getDeviceBreakdown
} from '../../services/analyticsService';

export default function DashboardHome() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    activeCampaigns: 0,
    monthlyRevenue: 0,
    loading: true
  });

  const [analyticsStats, setAnalyticsStats] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    searches: 0,
    todayPageViews: 0,
    todaySearches: 0
  });

  const [topSearches, setTopSearches] = useState([]);
  const [deviceBreakdown, setDeviceBreakdown] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    loadDashboardData();
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      const [summary, searches, devices] = await Promise.all([
        getAnalyticsSummary(7),
        getTopSearches(5, 7),
        getDeviceBreakdown(30)
      ]);
      setAnalyticsStats(summary);
      setTopSearches(searches);
      setDeviceBreakdown(devices);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      // Total de usuarios
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      // Total de negocios
      const { count: businessesCount } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true });

      // Campañas activas
      const { count: activeCampaignsCount } = await supabase
        .from('ad_campaigns')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      // Ingresos del mes (suma de presupuestos de campañas activas)
      const { data: campaigns } = await supabase
        .from('ad_campaigns')
        .select('budget')
        .eq('status', 'active');

      const monthlyRevenue = campaigns?.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0) || 0;

      // Actividad reciente (últimas 10 campañas)
      const { data: recentCampaigns } = await supabase
        .from('ad_campaigns')
        .select('*, ad_spaces(display_name)')
        .order('created_at', { ascending: false })
        .limit(10);

      setStats({
        totalUsers: usersCount || 0,
        totalBusinesses: businessesCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        monthlyRevenue: monthlyRevenue,
        loading: false
      });

      setRecentActivity(recentCampaigns || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'bg-green-100 text-green-700',
      pending_review: 'bg-yellow-100 text-yellow-700',
      paused: 'bg-gray-100 text-gray-700',
      rejected: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getStatusLabel = (status) => {
    const labels = {
      active: 'Activa',
      pending_review: 'Pendiente',
      paused: 'Pausada',
      rejected: 'Rechazada',
    };
    return labels[status] || status;
  };

  if (stats.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Vista General</h1>
        <p className="text-gray-600 mt-1">Resumen de actividad y métricas principales</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Usuarios Totales"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="blue"
          link="/admin/users"
        />
        <KPICard
          title="Negocios Registrados"
          value={stats.totalBusinesses.toLocaleString()}
          icon={Store}
          color="green"
          link="/admin/businesses"
        />
        <KPICard
          title="Campañas Activas"
          value={stats.activeCampaigns.toLocaleString()}
          icon={TrendingUp}
          color="purple"
          link="/admin/ads"
        />
        <KPICard
          title="Ingresos del Mes"
          value={`$${stats.monthlyRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="orange"
          link="/admin/revenue"
        />
      </div>

      {/* Analytics KPIs - Tráfico en tiempo real */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Eye className="w-5 h-5" />
          📊 Analytics en Tiempo Real (últimos 7 días)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-indigo-100 text-sm">Visitas Totales</p>
            <p className="text-2xl font-bold mt-1">{analyticsStats.pageViews.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-indigo-100 text-sm">Visitantes Únicos</p>
            <p className="text-2xl font-bold mt-1">{analyticsStats.uniqueVisitors.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-indigo-100 text-sm">Búsquedas</p>
            <p className="text-2xl font-bold mt-1">{analyticsStats.searches.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-indigo-100 text-sm">Visitas Hoy</p>
            <p className="text-2xl font-bold mt-1">{analyticsStats.todayPageViews.toLocaleString()}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4">
            <p className="text-indigo-100 text-sm">Búsquedas Hoy</p>
            <p className="text-2xl font-bold mt-1">{analyticsStats.todaySearches.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Dispositivos y Búsquedas Populares */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Dispositivos */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-purple-600" />
            Dispositivos
          </h3>
          <div className="space-y-3">
            {deviceBreakdown.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos aún</p>
            ) : (
              deviceBreakdown.map(item => (
                <div key={item.device} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.device === 'mobile' && <Smartphone className="w-4 h-4 text-blue-500" />}
                    {item.device === 'desktop' && <Monitor className="w-4 h-4 text-green-500" />}
                    {item.device === 'tablet' && <Smartphone className="w-4 h-4 text-orange-500" />}
                    <span className="capitalize text-gray-700">{item.device}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-12 text-right">{item.percentage}%</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Búsquedas Populares */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            Búsquedas Populares
          </h3>
          <div className="space-y-2">
            {topSearches.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin búsquedas aún</p>
            ) : (
              topSearches.map((item, idx) => (
                <div key={item.query} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-sm">#{idx + 1}</span>
                    <span className="text-gray-800 font-medium">{item.query}</span>
                  </div>
                  <span className="text-sm text-blue-600 font-semibold">{item.count} veces</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Actividad Reciente */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Actividad Reciente
            </h2>
            <Link
              to="/admin/ads"
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
            >
              Ver todas
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay actividad reciente</p>
            ) : (
              recentActivity.map((campaign) => (
                <div
                  key={campaign.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{campaign.advertiser_name}</p>
                    <p className="text-sm text-gray-600">{campaign.ad_spaces?.display_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(campaign.status)}`}>
                      {getStatusLabel(campaign.status)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(campaign.created_at).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Acciones Rápidas</h2>

          <div className="space-y-2">
            <QuickLink
              to="/admin/ads"
              icon={TrendingUp}
              label="Gestionar Anuncios"
              color="blue"
            />
            <QuickLink
              to="/admin/businesses"
              icon={Store}
              label="Aprobar Negocios"
              color="green"
            />
            <QuickLink
              to="/admin/revenue"
              icon={DollarSign}
              label="Ver Ingresos"
              color="orange"
            />
            <QuickLink
              to="/admin/users"
              icon={Users}
              label="Gestionar Usuarios"
              color="purple"
            />
          </div>

          {/* Analytics Externos */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              📊 Analytics Externos
            </h3>
            <div className="space-y-2">
              <a
                href="https://analytics.google.com/analytics/web/#/p123456789/reports/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
              >
                <div className="p-2 rounded-lg bg-orange-50 text-orange-600">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Google Analytics</span>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
              <a
                href="https://clarity.microsoft.com/projects/view/v1j8dut5lg/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
              >
                <div className="p-2 rounded-lg bg-red-50 text-red-600">
                  <Flame className="w-4 h-4" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Heatmaps (Clarity)</span>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
              <a
                href="https://clarity.microsoft.com/projects/view/v1j8dut5lg/recordings"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
              >
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Video className="w-4 h-4" />
                </div>
                <span className="text-gray-700 group-hover:text-gray-900 font-medium">Grabaciones</span>
                <ExternalLink className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">📊 Resumen Rápido</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Impresiones Totales</p>
            <p className="text-2xl font-bold mt-1">
              {recentActivity.reduce((sum, c) => sum + (c.impressions || 0), 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Clics Totales</p>
            <p className="text-2xl font-bold mt-1">
              {recentActivity.reduce((sum, c) => sum + (c.clicks || 0), 0).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">CTR Promedio</p>
            <p className="text-2xl font-bold mt-1">
              {(() => {
                const totalImpressions = recentActivity.reduce((sum, c) => sum + (c.impressions || 0), 0);
                const totalClicks = recentActivity.reduce((sum, c) => sum + (c.clicks || 0), 0);
                return totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
              })()}%
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Pendientes Revisión</p>
            <p className="text-2xl font-bold mt-1">
              {recentActivity.filter(c => c.status === 'pending_review').length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// KPI Card Component
function KPICard({ title, value, icon: Icon, color, link }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Link
      to={link}
      className="bg-white rounded-xl shadow-md border border-gray-200 p-6 hover:shadow-lg transition group"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div className={`p-3 rounded-full ${colors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div className="mt-4 flex items-center text-sm text-gray-500 group-hover:text-blue-600 transition">
        Ver detalles
        <ArrowUpRight className="w-4 h-4 ml-1" />
      </div>
    </Link>
  );
}

// Quick Link Component
function QuickLink({ to, icon: Icon, label, color }) {
  const colors = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    orange: 'text-orange-600 bg-orange-50',
    purple: 'text-purple-600 bg-purple-50',
  };

  return (
    <Link
      to={to}
      className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition group"
    >
      <div className={`p-2 rounded-lg ${colors[color]}`}>
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-gray-700 group-hover:text-gray-900 font-medium">{label}</span>
      <ArrowUpRight className="w-4 h-4 text-gray-400 ml-auto group-hover:text-blue-600" />
    </Link>
  );
}