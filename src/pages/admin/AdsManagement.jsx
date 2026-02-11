// src/pages/admin/AdsManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
  BarChart3, Users, Building, MousePointer2, MousePointer,
  Calendar, CheckCircle2, AlertCircle, Clock,
  ChevronRight, Filter, Search, Plus, Eye,
  Settings, Trash2, Edit2, Play, Pause, X,
  TrendingUp, DollarSign, Info, RefreshCw
} from 'lucide-react';
import { sendCampaignApprovedEmail } from '../../services/notificationService';
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
  const [previewCampaign, setPreviewCampaign] = useState(null); // Para el modal de vista previa
  const [editingSpace, setEditingSpace] = useState(null); // Para el modal de editar espacio
  const [spaceFilter, setSpaceFilter] = useState('all'); // Filtro por espacio
  // Rejection modal state
  const [rejectModal, setRejectModal] = useState({ open: false, campaignId: null });
  const [rejectReason, setRejectReason] = useState('');
  const [rejectCustom, setRejectCustom] = useState('');
  // Metrics viewer state
  const [metricsModal, setMetricsModal] = useState({ open: false, campaign: null, metrics: null, loading: false });
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

      // 4. Impresiones por día (últimos 7 días - datos REALES)
      let impressionsOverTime = [];
      try {
        const { data: trendData, error: trendError } = await supabase.rpc('get_global_ad_activity_trend', { p_days: 7 });
        if (!trendError && trendData) {
          impressionsOverTime = trendData.map(d => ({
            date: new Date(d.date).toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            impressions: parseInt(d.impressions) || 0,
            clicks: parseInt(d.clicks) || 0,
          }));
        }
      } catch (e) {
        console.warn('Could not load trend data from RPC, using fallback');
      }

      // Fallback si no hay datos reales
      if (impressionsOverTime.length === 0) {
        impressionsOverTime = Array.from({ length: 7 }, (_, i) => {
          const date = new Date();
          date.setDate(date.getDate() - (6 - i));
          return {
            date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
            impressions: 0,
            clicks: 0,
          };
        });
      }

      setAnalyticsData({
        impressionsOverTime,
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
      const campaign = campaigns.find(c => c.id === campaignId);

      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: 'active' })
        .eq('id', campaignId);

      if (error) throw error;

      // Enviar notificación por correo
      const email = campaign?.advertiser_email;
      const name = campaign?.advertiser_name || 'Anunciante';
      const adSpace = campaign?.ad_spaces?.display_name || 'Espacio Publicitario';

      if (email) {
        await sendCampaignApprovedEmail(
          email,
          name,
          adSpace,
          campaign?.start_date || 'Inmediato',
          campaign?.total_budget || 0
        );
      }

      toast.success('Campaña aprobada y activa 🚀');
      await loadData('pending_review'); // Recargar lista de pendientes
    } catch (error) {
      console.error('Error aprobando:', error);
      toast.error('Error al aprobar: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (campaignId, reason) => {
    setActionLoading(campaignId);
    try {
      const finalReason = reason || rejectReason === 'otra' ? rejectCustom : rejectReason;
      const { error } = await supabase
        .from('ad_campaigns')
        .update({ status: 'rejected', rejection_reason: finalReason || null })
        .eq('id', campaignId);

      if (error) throw error;

      toast.success('Campaña rechazada');
      setRejectModal({ open: false, campaignId: null });
      setRejectReason('');
      setRejectCustom('');
      await loadData('pending_review');
    } catch (error) {
      console.error('Error rechazando:', error);
      toast.error('Error al rechazar: ' + error.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Abrir modal de rechazo
  const openRejectModal = (campaignId) => {
    setRejectModal({ open: true, campaignId });
    setRejectReason('');
    setRejectCustom('');
  };

  // Cargar métricas de una campaña (para admin metrics viewer)
  const openMetricsModal = async (campaign) => {
    setMetricsModal({ open: true, campaign, metrics: null, loading: true });
    try {
      const { data: metrics } = await supabase
        .from('ad_campaign_metrics')
        .select('*')
        .eq('campaign_id', campaign.id)
        .order('date', { ascending: false });

      const totalImpressions = (metrics || []).reduce((sum, m) => sum + (m.impressions || 0), 0);
      const totalClicks = (metrics || []).reduce((sum, m) => sum + (m.clicks || 0), 0);
      const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

      // Also load the creative
      const { data: creatives } = await supabase
        .from('ad_creatives')
        .select('*')
        .eq('campaign_id', campaign.id);

      setMetricsModal({
        open: true,
        campaign: { ...campaign, ad_creatives: creatives || [] },
        metrics: { totalImpressions, totalClicks, ctr, daily: metrics || [] },
        loading: false
      });
    } catch (err) {
      console.error('Error loading metrics:', err);
      setMetricsModal(prev => ({ ...prev, loading: false }));
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

                  {/* Precio con soporte para promoción */}
                  {space.promo_price_monthly && space.promo_price_monthly < space.price_monthly ? (
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200">
                      <p className="text-xs font-bold text-green-700 mb-1">
                        {space.promo_label || '🔥 Oferta Especial'}
                      </p>
                      <p>
                        <span className="font-semibold">Precio:</span>{' '}
                        <span className="line-through text-gray-400 text-sm">${space.price_monthly}/mes</span>
                        <span className="ml-2 text-lg font-bold text-green-600">${space.promo_price_monthly}/mes</span>
                      </p>
                      {space.promo_end_date && (
                        <p className="text-xs text-green-600 mt-1">
                          ⏰ Válido hasta: {new Date(space.promo_end_date).toLocaleDateString('es-MX')}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p>
                      <span className="font-semibold">Precio:</span> $
                      {space.price_monthly}/mes
                    </p>
                  )}

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

          <div className="bg-white rounded-xl shadow-md overflow-x-auto">
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
                                onClick={() => openRejectModal(campaign.id)}
                                className="text-red-600 hover:text-red-900 bg-red-50 px-3 py-1 rounded hover:bg-red-100 transition disabled:opacity-60"
                              >
                                Rechazar
                              </button>
                            </>
                          )}
                          {/* Botón Vista Previa */}
                          <button
                            onClick={async () => {
                              const { data: creatives } = await supabase
                                .from('ad_creatives')
                                .select('*')
                                .eq('campaign_id', campaign.id);
                              setPreviewCampaign({ ...campaign, ad_creatives: creatives || [] });
                            }}
                            className="text-purple-600 hover:text-purple-900 bg-purple-50 px-3 py-1 rounded hover:bg-purple-100 transition flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          {/* Botón Métricas (NUEVO) */}
                          <button
                            onClick={() => openMetricsModal(campaign)}
                            className="text-green-600 hover:text-green-900 bg-green-50 px-3 py-1 rounded hover:bg-green-100 transition flex items-center gap-1"
                          >
                            <BarChart3 className="w-4 h-4" />
                            Métricas
                          </button>
                          <button
                            onClick={async () => {
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

      {/* Modal de Vista Previa */}
      {previewCampaign && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewCampaign(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6 rounded-t-2xl">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">👁️ Vista Previa del Anuncio</h3>
                  <p className="text-purple-200 text-sm mt-1">Así se verá en el sitio una vez aprobado</p>
                </div>
                <button
                  onClick={() => setPreviewCampaign(null)}
                  className="text-white/80 hover:text-white text-2xl font-bold"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Preview Content */}
            <div className="p-6 space-y-6">
              {/* Tipo de Espacio */}
              <div className="bg-gray-50 rounded-lg p-3 text-center">
                <span className="text-xs font-semibold text-gray-500 uppercase">Espacio Publicitario</span>
                <p className="text-lg font-bold text-gray-800">{previewCampaign.ad_spaces?.display_name || 'Sin especificar'}</p>
              </div>

              {/* Creativo Preview */}
              {previewCampaign.ad_creatives?.[0] ? (
                <div className="border-2 border-dashed border-purple-300 rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
                  <div className="bg-purple-100 px-3 py-1 text-xs text-purple-700 font-semibold">Vista Previa del Creativo</div>

                  {/* Imagen */}
                  {previewCampaign.ad_creatives[0].image_url ? (
                    <div className="p-4">
                      <img
                        src={previewCampaign.ad_creatives[0].image_url}
                        alt="Preview"
                        className="w-full max-h-64 object-contain rounded-lg shadow-md mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-gray-400">
                      <Image className="w-16 h-16 mx-auto mb-2 opacity-50" />
                      <p>Sin imagen cargada</p>
                    </div>
                  )}

                  {/* Título y Descripción */}
                  <div className="p-4 space-y-2 bg-white">
                    <h4 className="font-bold text-lg text-gray-900">
                      {previewCampaign.ad_creatives[0].title || 'Sin título'}
                    </h4>
                    {previewCampaign.ad_creatives[0].description && (
                      <p className="text-gray-600 text-sm">
                        {previewCampaign.ad_creatives[0].description}
                      </p>
                    )}

                    {/* CTA Button Preview */}
                    {previewCampaign.ad_creatives[0].cta_text && (
                      <button className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition inline-flex items-center gap-2">
                        {previewCampaign.ad_creatives[0].cta_text}
                        <span className="text-xs opacity-70">→</span>
                      </button>
                    )}

                    {/* URL destino */}
                    {previewCampaign.ad_creatives[0].cta_url && (
                      <p className="text-xs text-gray-400 mt-2 truncate">
                        🔗 {previewCampaign.ad_creatives[0].cta_url}
                      </p>
                    )}
                  </div>
                </div>
              ) : previewCampaign.creative_url ? (
                // Fallback: usa creative_url directamente de la campaña
                <div className="border-2 border-dashed border-purple-300 rounded-xl overflow-hidden bg-gradient-to-br from-purple-50 to-indigo-50">
                  <div className="bg-purple-100 px-3 py-1 text-xs text-purple-700 font-semibold">Vista Previa del Creativo</div>

                  <div className="p-4">
                    {previewCampaign.creative_url.includes('youtube') ? (
                      // YouTube embed
                      <div className="aspect-video bg-black rounded-lg overflow-hidden">
                        <iframe
                          src={previewCampaign.creative_url.replace('youtube.com/shorts/', 'youtube.com/embed/').replace('watch?v=', 'embed/')}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : previewCampaign.creative_url.match(/\.(mp4|webm|mov)$/i) ? (
                      // Video file
                      <video
                        src={previewCampaign.creative_url}
                        controls
                        className="w-full max-h-64 rounded-lg shadow-md mx-auto"
                      />
                    ) : (
                      // Image
                      <img
                        src={previewCampaign.creative_url}
                        alt="Preview"
                        className="w-full max-h-64 object-contain rounded-lg shadow-md mx-auto"
                      />
                    )}
                  </div>

                  {/* Info de la campaña */}
                  <div className="p-4 space-y-2 bg-white">
                    <h4 className="font-bold text-lg text-gray-900">
                      {previewCampaign.advertiser_name || 'Sin título'}
                    </h4>
                    {previewCampaign.description && (
                      <p className="text-gray-600 text-sm">{previewCampaign.description}</p>
                    )}
                    {previewCampaign.cta_text && (
                      <button className="mt-3 bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold">
                        {previewCampaign.cta_text}
                      </button>
                    )}
                    {previewCampaign.cta_url && (
                      <p className="text-xs text-gray-400 mt-2 truncate">🔗 {previewCampaign.cta_url}</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
                  <p className="text-gray-600 font-semibold">Sin creativos</p>
                  <p className="text-gray-400 text-sm">Esta campaña no tiene imágenes o creativos asociados</p>
                </div>
              )}

              {/* Info del Anunciante */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Anunciante:</span>
                    <p className="font-semibold text-gray-800">{previewCampaign.advertiser_name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Segmentación:</span>
                    <p className="font-semibold text-gray-800">
                      {previewCampaign.geographic_scope === 'global' ? '🌍 Global' : `📍 ${previewCampaign.target_location || 'Local'}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              {previewCampaign.status === 'pending_review' && (
                <div className="flex gap-3 pt-4 border-t">
                  <button
                    onClick={() => {
                      handleApprove(previewCampaign.id);
                      setPreviewCampaign(null);
                    }}
                    className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition"
                  >
                    ✅ Aprobar Campaña
                  </button>
                  <button
                    onClick={() => {
                      handleReject(previewCampaign.id);
                      setPreviewCampaign(null);
                    }}
                    className="flex-1 bg-red-100 text-red-600 py-3 rounded-xl font-bold hover:bg-red-200 transition"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Rechazo con Razón */}
      {rejectModal.open && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal({ open: false, campaignId: null })}>
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-5 rounded-t-2xl">
              <h3 className="text-lg font-bold">❌ Rechazar Campaña</h3>
              <p className="text-red-100 text-sm mt-1">Selecciona la razón del rechazo</p>
            </div>
            <div className="p-6 space-y-4">
              {[
                { value: 'imagen_inapropiada', label: '🖼️ Imagen inapropiada o de baja calidad' },
                { value: 'url_no_funciona', label: '🔗 URL de destino no funciona' },
                { value: 'contenido_engañoso', label: '⚠️ Contenido engañoso o falso' },
                { value: 'politica_contenido', label: '📋 No cumple políticas de contenido' },
                { value: 'otra', label: '✍️ Otra razón...' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setRejectReason(opt.value)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition ${rejectReason === opt.value
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}

              {rejectReason === 'otra' && (
                <textarea
                  value={rejectCustom}
                  onChange={(e) => setRejectCustom(e.target.value)}
                  placeholder="Describe la razón del rechazo..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-red-500"
                />
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setRejectModal({ open: false, campaignId: null })}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition"
                >
                  Cancelar
                </button>
                <button
                  disabled={!rejectReason || (rejectReason === 'otra' && !rejectCustom.trim())}
                  onClick={() => handleReject(rejectModal.campaignId)}
                  className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition disabled:opacity-50"
                >
                  Confirmar Rechazo
                </button>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Modal: Métricas del Anunciante (Admin ve lo que ve el cliente) */}
      {
        metricsModal.open && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setMetricsModal({ open: false, campaign: null, metrics: null, loading: false })}>
            <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">📊 Métricas del Anunciante</h3>
                    <p className="text-blue-100 text-sm mt-1">
                      Así ve el cliente {metricsModal.campaign?.advertiser_name || ''} su dashboard
                    </p>
                  </div>
                  <button
                    onClick={() => setMetricsModal({ open: false, campaign: null, metrics: null, loading: false })}
                    className="text-white/80 hover:text-white text-2xl font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                {metricsModal.loading ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                    <p className="mt-4 text-gray-600">Cargando métricas...</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* KPIs Grid */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-blue-600 text-sm mb-1">
                          <Eye className="w-4 h-4" /> Impressions
                        </div>
                        <div className="text-3xl font-bold text-blue-700">
                          {metricsModal.metrics?.totalImpressions?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-green-600 text-sm mb-1">
                          <MousePointer className="w-4 h-4" /> Clicks
                        </div>
                        <div className="text-3xl font-bold text-green-700">
                          {metricsModal.metrics?.totalClicks?.toLocaleString() || 0}
                        </div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4 text-center">
                        <div className="flex items-center justify-center gap-1 text-purple-600 text-sm mb-1">
                          <TrendingUp className="w-4 h-4" /> CTR
                        </div>
                        <div className="text-3xl font-bold text-purple-700">
                          {metricsModal.metrics?.ctr || '0.00'}%
                        </div>
                      </div>
                    </div>

                    {/* Info de la Campaña */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <h4 className="font-semibold text-gray-800 mb-3">Detalles de la Campaña</h4>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">Anunciante:</span>
                          <p className="font-medium">{metricsModal.campaign?.advertiser_name}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <p className="font-medium">{metricsModal.campaign?.advertiser_email}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Segmentación:</span>
                          <p className="font-medium">
                            {metricsModal.campaign?.geographic_scope === 'global' ? '🌍 Global' : `📍 ${metricsModal.campaign?.target_location || 'Local'}`}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Budget:</span>
                          <p className="font-medium text-green-600">${metricsModal.campaign?.budget?.toLocaleString() || 0} MXN</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Inicio:</span>
                          <p className="font-medium">{metricsModal.campaign?.start_date ? new Date(metricsModal.campaign.start_date).toLocaleDateString('es-MX') : 'TBD'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Fin:</span>
                          <p className="font-medium">{metricsModal.campaign?.end_date ? new Date(metricsModal.campaign.end_date).toLocaleDateString('es-MX') : 'en curso'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Creative Preview */}
                    {metricsModal.campaign?.ad_creatives?.[0] && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 text-xs font-semibold text-gray-600">Creativo Activo</div>
                        {metricsModal.campaign.ad_creatives[0].image_url && (
                          <img
                            src={metricsModal.campaign.ad_creatives[0].image_url}
                            alt="Ad creative"
                            className="w-full max-h-48 object-contain bg-white"
                          />
                        )}
                        <div className="p-4 bg-white">
                          <h5 className="font-bold text-gray-900">{metricsModal.campaign.ad_creatives[0].title}</h5>
                          <p className="text-sm text-gray-600 mt-1">{metricsModal.campaign.ad_creatives[0].description}</p>
                          <p className="text-xs text-blue-500 mt-2">🔗 {metricsModal.campaign.ad_creatives[0].cta_url}</p>
                        </div>
                      </div>
                    )}

                    {/* Últimas métricas diarias */}
                    {metricsModal.metrics?.daily?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-3">Últimos 7 días</h4>
                        <div className="space-y-2">
                          {metricsModal.metrics.daily.slice(0, 7).map((day, i) => (
                            <div key={i} className="flex justify-between items-center bg-gray-50 rounded-lg px-4 py-2 text-sm">
                              <span className="text-gray-600">{new Date(day.date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                              <div className="flex gap-4">
                                <span className="text-blue-600">👁 {day.impressions || 0}</span>
                                <span className="text-green-600">👆 {day.clicks || 0}</span>
                                <span className="text-purple-600">{day.impressions > 0 ? ((day.clicks / day.impressions) * 100).toFixed(1) : '0.0'}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
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
