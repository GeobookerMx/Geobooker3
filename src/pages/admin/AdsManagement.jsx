// src/pages/admin/AdsManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  DollarSign,
  Eye,
  MousePointer,
  Plus,
  Clock,
  AlertCircle,
  Image,
  Info,
} from 'lucide-react';
import CampaignDetailsModal from '../../components/admin/CampaignDetailsModal';
import EditAdSpaceModal from '../../components/admin/EditAdSpaceModal';
import ImpressionsChart from '../../components/admin/charts/ImpressionsChart';
import SpacePerformanceChart from '../../components/admin/charts/SpacePerformanceChart';
import TopCampaignsTable from '../../components/admin/charts/TopCampaignsTable';
import RevenueChart from '../../components/admin/charts/RevenueChart';

const AdsManagement = () => {
  const [adSpaces, setAdSpaces] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // ID de la campaña siendo procesada
  const [activeTab, setActiveTab] = useState('spaces');
  const [statusFilter, setStatusFilter] = useState('active'); // filtro controlado
  const [selectedCampaign, setSelectedCampaign] = useState(null); // Para el modal de detalles
  const [editingSpace, setEditingSpace] = useState(null); // Para el modal de editar espacio
  const [spaceFilter, setSpaceFilter] = useState('all'); // Filtro por espacio
  const [analyticsData, setAnalyticsData] = useState({ // Datos para gráficas
    impressionsOverTime: [],
    spacePerformance: [],
    topCampaigns: [],
    revenueBySpace: [],
  });

  useEffect(() => {
    loadData(statusFilter);
    loadAnalyticsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAnalyticsData = async () => {
    try {
      // Obtener todas las campañas con stats
      const { data: allCampaigns, error } = await supabase
        .from('ad_campaigns')
        .select(`*, ad_spaces (name, display_name)`)
        .eq('status', 'active');

      if (error) throw error;

      // Procesar datos para gráficas
      // 1. Top 5 campañas por CTR
      const topCampaigns = [...(allCampaigns || [])]
        .sort((a, b) => {
          const ctrA = a.impressions > 0 ? (a.clicks / a.impressions) : 0;
          const ctrB = b.impressions > 0 ? (b.clicks / b.impressions) : 0;
          return ctrB - ctrA;
        })
        .slice(0, 5);

      // 2. Performance por espacio
      const spacePerformance = Object.values(
        (allCampaigns || []).reduce((acc, campaign) => {
          const spaceName = campaign.ad_spaces?.display_name || 'Sin espacio';
          if (!acc[spaceName]) {
            acc[spaceName] = {
              space_name: spaceName,
              impressions: 0,
              clicks: 0,
            };
          }
          acc[spaceName].impressions += campaign.impressions || 0;
          acc[spaceName].clicks += campaign.clicks || 0;
          return acc;
        }, {})
      );

      // 3. Revenue por espacio
      const revenueBySpace = Object.values(
        (allCampaigns || []).reduce((acc, campaign) => {
          const spaceName = campaign.ad_spaces?.display_name || 'Sin espacio';
          if (!acc[spaceName]) {
            acc[spaceName] = {
              name: spaceName,
              value: 0,
            };
          }
          acc[spaceName].value += parseFloat(campaign.budget || 0);
          return acc;
        }, {})
      );

      // 4. Impresiones por día (últimos 7 días - simulado por ahora)
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return {
          date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
          impressions: Math.floor(Math.random() * 1000) + 500, // Simulado
          clicks: Math.floor(Math.random() * 100) + 20, // Simulado
        };
      });

      setAnalyticsData({
        impressionsOverTime: last7Days,
        spacePerformance,
        topCampaigns,
        revenueBySpace,
      });
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  const loadData = async (status = 'active', filterBySpace = 'all') => {
    try {
      setLoading(true);

      // Cargar espacios
      const { data: spacesData, error: spacesError } = await supabase
        .from('ad_spaces')
        .select('*')
        .order('type', { ascending: true });

      if (spacesError) throw spacesError;

      // Cargar campañas
      let query = supabase
        .from('ad_campaigns')
        .select(`*, ad_spaces (name, display_name, type)`)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      if (filterBySpace !== 'all') {
        query = query.eq('ad_space_id', filterBySpace);
      }

      const { data: campaignsData, error: campaignsError } = await query;
      if (campaignsError) throw campaignsError;

      setAdSpaces(spacesData || []);
      setCampaigns(campaignsData || []);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast.error('Error al cargar datos. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (campaignId) => {
    setActionLoading(campaignId);
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña aprobada y activa 🚀');
      await loadData('pending_review'); // Recargar lista de pendientes
    } catch (error) {
      console.error('Error aprobando:', error);
      toast.error('Error al aprobar: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (campaignId) => {
    if (!window.confirm('¿Confirmar rechazo?')) return;

    setActionLoading(campaignId);
    try {
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: 'rejected' })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña rechazada');
      await loadData('pending_review');
    } catch (error) {
      console.error('Error rechazando:', error);
      toast.error('Error al rechazar: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Calcular estadísticas
  const totalRevenue = campaigns.reduce(
    (sum, c) => sum + parseFloat(c.budget || 0),
    0
  );
  const totalImpressions = campaigns.reduce(
    (sum, c) => sum + (c.impressions || 0),
    0
  );
  const totalClicks = campaigns.reduce(
    (sum, c) => sum + (c.clicks || 0),
    0
  );
  const avgCTR =
    totalImpressions > 0
      ? ((totalClicks / totalImpressions) * 100).toFixed(2)
      : 0;

  return (
    <div className="space-y-8">
      {/* Título */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Geobooker Ads</h1>
        <p className="text-gray-600 mt-2">Sistema de gestión de publicidad</p>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Pendientes"
          value={campaigns.filter(c => c.status === 'pending_review').length}
          icon={Clock}
          color="yellow"
          highlight={campaigns.filter(c => c.status === 'pending_review').length > 0}
        />
        <StatsCard
          title="Activas"
          value={campaigns.filter(c => c.status === 'active').length}
          icon={TrendingUp}
          color="blue"
        />
        <StatsCard
          title="Ingresos"
          value={`$${totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          color="green"
        />
        <StatsCard
          title="Impresiones"
          value={totalImpressions.toLocaleString()}
          icon={Eye}
          color="purple"
        />
        <StatsCard
          title="CTR"
          value={`${avgCTR}%`}
          icon={MousePointer}
          color="orange"
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('spaces')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'spaces'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Espacios Publicitarios
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'campaigns'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            Campañas
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'analytics'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            📊 Analytics
          </button>
          <button
            onClick={() => setActiveTab('byType')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'byType'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
          >
            🎯 Por Tipo
          </button>
        </nav>
      </div>

      {/* Contenido según tab */}
      {activeTab === 'spaces' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">
              Espacios Disponibles
            </h2>
            <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Espacio
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adSpaces.map((space) => (
              <div
                key={space.id}
                className="bg-white rounded-xl shadow-md p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">
                    {space.display_name}
                  </h3>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${space.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {space.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-semibold">Tipo:</span> {space.type}
                  </p>
                  <p>
                    <span className="font-semibold">Desktop:</span>{' '}
                    {space.size_desktop}
                  </p>
                  <p>
                    <span className="font-semibold">Mobile:</span>{' '}
                    {space.size_mobile}
                  </p>
                  <p>
                    <span className="font-semibold">Precio:</span> $
                    {space.price_monthly}/mes
                  </p>
                  <p>
                    <span className="font-semibold">Slots:</span>{' '}
                    {space.max_slots}
                  </p>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  {space.description}
                </p>

                <div className="mt-4 flex space-x-2">
                  <button
                    onClick={() => setEditingSpace(space)}
                    className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('campaigns');
                      setSpaceFilter(space.id);
                      loadData(statusFilter, space.id);
                      toast.success(`Mostrando campañas de: ${space.display_name}`);
                    }}
                    className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-100 transition"
                  >
                    Ver Campañas
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-bold text-gray-900">
              Gestión de Campañas
            </h2>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              {/* Filtro de Estado */}
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={statusFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setStatusFilter(value);
                  loadData(value, spaceFilter);
                }}
              >
                <option value="all">Todos los estados</option>
                <option value="pending_review">Pendientes de Revisión</option>
                <option value="active">Activas</option>
                <option value="paused">Pausadas</option>
                <option value="rejected">Rechazadas</option>
              </select>

              {/* Filtro por Espacio */}
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                value={spaceFilter}
                onChange={(e) => {
                  const value = e.target.value;
                  setSpaceFilter(value);
                  loadData(statusFilter, value);
                }}
              >
                <option value="all">Todos los espacios</option>
                {adSpaces.map((space) => (
                  <option key={space.id} value={space.id}>
                    {space.display_name}
                  </option>
                ))}
              </select>

              <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition whitespace-nowrap">
                <Plus className="w-4 h-4 mr-2" />
                Nueva Campaña
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Anunciante
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Espacio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Segmentación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fechas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Performance
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaigns.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="px-6 py-12 text-center text-gray-500"
                    >
                      No se encontraron campañas con los filtros actuales
                    </td>
                  </tr>
                ) : (
                  campaigns.map((campaign) => (
                    <tr
                      key={campaign.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full items-center
                          ${campaign.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : campaign.status === 'pending_review'
                                ? 'bg-yellow-100 text-yellow-800'
                                : campaign.status === 'paused'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                            }`}
                        >
                          {campaign.status === 'active' && (
                            <span className="w-2 h-2 mr-1.5 bg-green-500 rounded-full" />
                          )}
                          {campaign.status === 'pending_review' && (
                            <span className="w-2 h-2 mr-1.5 bg-yellow-500 rounded-full animate-pulse" />
                          )}
                          {campaign.status === 'active'
                            ? 'Activa'
                            : campaign.status === 'pending_review'
                              ? 'Pendiente'
                              : campaign.status === 'paused'
                                ? 'Pausada'
                                : 'Rechazada'}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {campaign.advertiser_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {campaign.advertiser_email}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {campaign.ad_spaces?.display_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {campaign.ad_spaces?.type}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-gray-900 flex items-center">
                            {campaign.geographic_scope === 'global'
                              ? '🌍 Global'
                              : campaign.target_location === 'Mexico'
                                ? '🇲🇽 México'
                                : campaign.target_location === 'USA'
                                  ? '🇺🇸 USA'
                                  : campaign.target_location === 'Spain'
                                    ? '🇪🇸 España'
                                    : campaign.target_location
                                      ? '📍 ' + campaign.target_location
                                      : '—'}
                          </span>
                          {campaign.audience_targeting &&
                            Object.keys(campaign.audience_targeting).length >
                            0 && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-1 rounded mt-1 w-fit">
                                + Segmentación Avanzada
                              </span>
                            )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {campaign.start_date && campaign.end_date ? (
                          <>
                            <div>
                              {new Date(
                                campaign.start_date
                              ).toLocaleDateString()}
                            </div>
                            <div className="text-xs">
                              hasta{' '}
                              {new Date(
                                campaign.end_date
                              ).toLocaleDateString()}
                            </div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-4">
                          <div>
                            <div className="text-xs text-gray-500">Impr.</div>
                            <div className="font-semibold text-gray-700">
                              {campaign.impressions ?? 0}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500">CTR</div>
                            <div className="font-semibold text-gray-700">
                              {campaign.ctr != null
                                ? `${campaign.ctr}%`
                                : '0%'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          {campaign.status === 'pending_review' && (
                            <>
                              <button
                                disabled={actionLoading === campaign.id}
                                onClick={() => handleApprove(campaign.id)}
                                className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded hover:bg-green-100 transition disabled:opacity-60"
                              >
                                Aprobar
                              </button>
                              <button
                                disabled={actionLoading === campaign.id}
                                onClick={() => handleReject(campaign.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition disabled:opacity-60"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          <button
                            onClick={async () => {
                              // Cargar creativos de la campaña
                              const { data: creatives, error } = await supabase
                                .from('ad_creatives')
                                .select('*')
                                .eq('campaign_id', campaign.id);

                              if (!error && creatives) {
                                setSelectedCampaign({ ...campaign, ad_creatives: creatives });
                              } else {
                                setSelectedCampaign({ ...campaign, ad_creatives: [] });
                              }
                            }}
                            className="text-blue-600 hover:text-blue-900 border border-blue-200 px-3 py-1 rounded hover:bg-blue-50 transition"
                          >
                            Ver Detalle
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab de Analytics */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            📊 Analytics y Estadísticas
          </h2>

          {/* Gráficas superiores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ImpressionsChart data={analyticsData.impressionsOverTime} />
            <SpacePerformanceChart data={analyticsData.spacePerformance} />
          </div>

          {/* Gráficas inferiores */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <TopCampaignsTable campaigns={analyticsData.topCampaigns} />
            <RevenueChart
              data={analyticsData.revenueBySpace}
              totalRevenue={campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0)}
            />
          </div>
        </div>
      )}

      {/* Tab: Por Tipo */}
      {activeTab === 'byType' && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            🎯 Campañas por Tipo de Espacio
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adSpaces.map((space) => {
              // Filtrar campañas de este espacio
              const spaceCampaigns = campaigns.filter(c => c.ad_space_id === space.id);
              const activeCampaigns = spaceCampaigns.filter(c => c.status === 'active');
              const pendingCampaigns = spaceCampaigns.filter(c => c.status === 'pending_review');
              const totalRevenue = spaceCampaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0);
              const totalImpressions = spaceCampaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
              const totalClicks = spaceCampaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
              const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

              return (
                <div key={space.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
                    <h3 className="text-lg font-bold text-white">{space.display_name}</h3>
                    <p className="text-blue-100 text-sm">{space.type}</p>
                  </div>

                  <div className="p-6 space-y-4">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{activeCampaigns.length}</div>
                        <div className="text-xs text-gray-500">Activas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">{pendingCampaigns.length}</div>
                        <div className="text-xs text-gray-500">Pendientes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">${totalRevenue.toLocaleString()}</div>
                        <div className="text-xs text-gray-500">Ingresos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">{ctr}%</div>
                        <div className="text-xs text-gray-500">CTR</div>
                      </div>
                    </div>

                    {/* Metrics Bar */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>👁 {totalImpressions.toLocaleString()} imp</span>
                        <span>👆 {totalClicks.toLocaleString()} clicks</span>
                      </div>
                    </div>

                    {/* Especificaciones del Espacio */}
                    <div className="pt-4 border-t border-gray-200">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 mb-2">
                        <Info className="w-3 h-3" />
                        Especificaciones para Publicitantes
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-500">📐 Desktop:</span>
                          <span className="font-medium text-gray-700">{space.size_desktop || 'Flexible'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">📱 Mobile:</span>
                          <span className="font-medium text-gray-700">{space.size_mobile || 'Responsive'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">🖼️ Formatos:</span>
                          <span className="font-medium text-gray-700">JPG, PNG, WebP</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">📦 Máximo:</span>
                          <span className="font-medium text-gray-700">5 MB</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">💰 Precio:</span>
                          <span className="font-medium text-green-600">${space.price_monthly?.toLocaleString()}/mes</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button
                      onClick={() => {
                        setSpaceFilter(space.id);
                        setActiveTab('campaigns');
                      }}
                      className="w-full bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition text-sm font-medium"
                    >
                      Ver Campañas →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {adSpaces.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No hay espacios publicitarios configurados
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalles */}
      {selectedCampaign && (
        <CampaignDetailsModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
        />
      )}

      {/* Modal de Editar Espacio */}
      {editingSpace && (
        <EditAdSpaceModal
          space={editingSpace}
          onClose={() => setEditingSpace(null)}
          onSave={() => {
            setEditingSpace(null);
            loadData(statusFilter, spaceFilter);
          }}
        />
      )}
    </div>
  );
};

export default AdsManagement;

/** Card simple para las estadísticas de arriba */
function StatsCard({ title, value, icon: Icon, color = 'blue', highlight = false }) {
  const colorMap = {
    blue: 'text-blue-600 bg-blue-50',
    green: 'text-green-600 bg-green-50',
    purple: 'text-purple-600 bg-purple-50',
    orange: 'text-orange-600 bg-orange-50',
    yellow: 'text-yellow-600 bg-yellow-50',
  };

  return (
    <div className={`bg-white rounded-xl shadow-md p-4 border ${highlight ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-gray-100'} flex items-center`}>
      <div
        className={`p-3 rounded-full mr-4 ${colorMap[color] || colorMap.blue}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <div className="text-sm text-gray-500">{title}</div>
        <div className={`text-xl font-bold ${highlight ? 'text-yellow-600' : 'text-gray-900'}`}>{value}</div>
      </div>
    </div>
  );
}
