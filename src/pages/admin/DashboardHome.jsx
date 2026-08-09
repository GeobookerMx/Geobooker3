// src/pages/admin/DashboardHome.jsx
import React, { useCallback, useEffect, useState } from 'react';
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
  Video,
  MessageCircle,
  Phone,
  Navigation,
  Share2,
  Heart,
  Shield,
  AlertTriangle
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getAnalyticsSummary,
  getTopSearches
} from '../../services/analyticsService';
import { useAdminAuditLog } from '../../hooks/useAdminAuditLog';

const APPLE_CREDENTIAL_ROTATION_TARGET = '2027-02-01';
const SECURITY_REVIEW_DAY_LABEL = 'antes del dia 5 de cada mes';

function getDaysUntil(dateString) {
  const target = new Date(dateString + 'T00:00:00-06:00');
  const diffMs = target.getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export default function DashboardHome() {
  const { fetchAuditLogs } = useAdminAuditLog();
  const [auditLogs, setAuditLogs] = useState([]);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalBusinesses: 0,
    activeCampaigns: 0,
    monthlyRevenue: 0,
    pendingRecommendations: 0,
    pendingClaims: 0,
    denueCount: 0,
    claimedCount: 0,
    loading: true
  });

  // Real metrics from ad_campaign_metrics (month totals)
  const [adMetrics, setAdMetrics] = useState({
    totalImpressions: 0,
    totalClicks: 0,
    ctr: '0.00'
  });

  const [analyticsStats, setAnalyticsStats] = useState({
    pageViews: 0,
    uniqueVisitors: 0,
    searches: 0,
    todayPageViews: 0,
    todaySearches: 0
  });

  const [topSearches, setTopSearches] = useState([]);
  const [appFunnel, setAppFunnel] = useState([]);
  const [authFunnel, setAuthFunnel] = useState(null);
  const [efficiencySnapshot, setEfficiencySnapshot] = useState(null);
  const [securityOps, setSecurityOps] = useState({
    criticalEvents30d: 0,
    highEvents30d: 0,
    recentEvents: [],
    loading: true
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [intlStats, setIntlStats] = useState({
    byCountry: [],
    intlCount: 0,
    byDomain: []
  });
  const [intentMetrics, setIntentMetrics] = useState({
    whatsapp: 0,
    calls: 0,
    directions: 0,
    shares: 0,
    favorites: 0,
    total: 0,
    uniqueUsers: 0,
    topBusinesses: []
  });

  const loadAnalyticsData = useCallback(async () => {
    try {
      const [summary, searches] = await Promise.all([
        getAnalyticsSummary(7),
        getTopSearches(5, 7)
      ]);
      setAnalyticsStats(summary);
      setTopSearches(searches);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    try {
      // Total de usuarios
      const { count: usersCount } = await supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true });

      // Total de negocios
      const { count: businessesCount } = await supabase
        .from('businesses')
        .select('id', { count: 'exact', head: true });

      // Campañas activas
      const { count: activeCampaignsCount } = await supabase
        .from('ad_campaigns')
        .select('id', { count: 'exact', head: true })
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

      setStats(prev => ({
        ...prev,
        totalUsers: usersCount || 0,
        totalBusinesses: businessesCount || 0,
        activeCampaigns: activeCampaignsCount || 0,
        monthlyRevenue: monthlyRevenue,
        loading: false
      }));

      setRecentActivity(recentCampaigns || []);

      // Cargar métricas reales del mes actual desde ad_campaign_metrics
      try {
        const now = new Date();
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const { data: metricsData } = await supabase
          .from('ad_campaign_metrics')
          .select('impressions, clicks')
          .gte('date', firstOfMonth);

        const totalImpressions = (metricsData || []).reduce((sum, m) => sum + (m.impressions || 0), 0);
        const totalClicks = (metricsData || []).reduce((sum, m) => sum + (m.clicks || 0), 0);
        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
        setAdMetrics({ totalImpressions, totalClicks, ctr });
      } catch (metricsErr) {
        console.warn('Error loading ad metrics:', metricsErr);
      }

      // Recomendaciones pendientes
      try {
        const { count: pendingRecsCount } = await supabase
          .from('user_recommendations')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending');
        setStats(prev => ({ ...prev, pendingRecommendations: pendingRecsCount || 0 }));
      } catch (recsErr) {
        console.warn('Error loading pending recommendations:', recsErr);
      }

      // Reclamos pendientes
      try {
        const [nativeClaims, internationalClaims] = await Promise.all([
          supabase
            .from('business_claims')
            .select('id', { count: 'exact', head: true })
            .in('status', ['submitted', 'under_review']),
          supabase
            .from('international_business_claims')
            .select('id', { count: 'exact', head: true })
            .in('status', ['submitted', 'under_review'])
        ]);
        const claimsCount = (nativeClaims.count || 0) + (internationalClaims.count || 0);
        setStats(prev => ({ ...prev, pendingClaims: claimsCount }));
      } catch (claimsErr) {
        console.warn('Error loading pending claims:', claimsErr);
      }

      // Negocios DENUE descargados
      try {
        const { count: denueCount } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'denue');
        setStats(prev => ({ ...prev, denueCount: denueCount || 0 }));
      } catch (denueErr) {
        console.warn('Error loading DENUE count:', denueErr);
      }

      // Negocios DENUE ya reclamados (conversión)
      try {
        const { count: claimedCount } = await supabase
          .from('businesses')
          .select('id', { count: 'exact', head: true })
          .eq('source', 'denue')
          .eq('claimed', true);
        setStats(prev => ({ ...prev, claimedCount: claimedCount || 0 }));
      } catch (convErr) {
        console.warn('Error loading claimed DENUE count:', convErr);
      }

      // Cargar estadísticas internacionales
      try {
        const { data: countryStats } = await supabase.rpc('get_users_by_country');
        const { data: domainStats } = await supabase.from('v_users_by_domain').select('*');

        const intlCount = countryStats?.filter(c => c.country_code !== 'MX').reduce((sum, c) => sum + parseInt(c.user_count), 0) || 0;

        setIntlStats({
          byCountry: countryStats || [],
          intlCount: intlCount,
          byDomain: domainStats || []
        });
      } catch (intlError) {
        console.warn('Error loading international stats:', intlError);
      }

      // Embudo de app: descargas, sesiones, registros y logins
      try {
        const { data: funnelData, error: funnelError } = await supabase
          .from('admin_app_user_funnel_v1')
          .select('*')
          .order('download_clicks_30d', { ascending: false });

        if (funnelError) {
          console.warn('App funnel view not available yet:', funnelError);
          setAppFunnel([]);
        } else {
          setAppFunnel(funnelData || []);
        }
      } catch (funnelErr) {
        console.warn('Error loading app user funnel:', funnelErr);
        setAppFunnel([]);
      }

      // Embudo de autenticacion y control de eficiencia (dos filas agregadas,
      // nunca se descargan eventos crudos al navegador del administrador).
      try {
        const [authResult, efficiencyResult] = await Promise.all([
          supabase.from('admin_auth_funnel_30d_v1').select('*').maybeSingle(),
          supabase.from('admin_efficiency_snapshot_v1').select('*').maybeSingle()
        ]);

        if (!authResult.error) setAuthFunnel(authResult.data || null);
        if (!efficiencyResult.error) setEfficiencySnapshot(efficiencyResult.data || null);
      } catch (efficiencyError) {
        console.warn('Efficiency views not available yet:', efficiencyError);
      }

      // Cargar m?tricas de intenci?n de negocio
      try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: intentData } = await supabase
          .from('business_intent_logs')
          .select('event_name, device_id')
          .gte('created_at', thirtyDaysAgo);

        if (intentData && intentData.length > 0) {
          const whatsapp = intentData.filter(e => e.event_name === 'tap_whatsapp').length;
          const calls = intentData.filter(e => e.event_name === 'tap_call').length;
          const directions = intentData.filter(e => e.event_name === 'open_directions').length;
          const shares = intentData.filter(e => e.event_name === 'share_business').length;
          const favorites = intentData.filter(e => e.event_name === 'save_favorite').length;
          const uniqueDevices = new Set(intentData.map(e => e.device_id)).size;

          setIntentMetrics({
            whatsapp, calls, directions, shares, favorites,
            total: intentData.length,
            uniqueUsers: uniqueDevices,
            topBusinesses: []
          });
        }

        // Top negocios por intención
        try {
          const { data: topBiz } = await supabase.rpc('get_top_businesses_by_intent', {
            p_days: 30, p_limit: 5
          });
          if (topBiz) {
            setIntentMetrics(prev => ({ ...prev, topBusinesses: topBiz }));
          }
        } catch (topErr) {
          console.warn('RPC get_top_businesses_by_intent no available yet:', topErr);
        }
      } catch (intentErr) {
        console.warn('Error loading intent metrics:', intentErr);
      }

      // Cargar eventos sospechosos de seguridad operativa
      try {
        const thirtyDaysAgoSecurity = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data: securityEvents, error: securityEventsError } = await supabase
          .from('security_events')
          .select('id, event_type, severity, source, message, detected_at, metadata')
          .gte('detected_at', thirtyDaysAgoSecurity)
          .order('detected_at', { ascending: false })
          .limit(8);

        let healthData = null;
        try {
          const { data: health } = await supabase.from('v_security_health').select('*').maybeSingle();
          if (health) healthData = health;
        } catch (e) { /* fallback */ }

        if (securityEventsError) {
          console.warn('Security events table not available yet:', securityEventsError);
          setSecurityOps(prev => ({ ...prev, recentEvents: [], health: healthData, loading: false }));
        } else {
          setSecurityOps({
            criticalEvents30d: (securityEvents || []).filter(event => event.severity === 'critical').length,
            highEvents30d: (securityEvents || []).filter(event => event.severity === 'high').length,
            recentEvents: securityEvents || [],
            health: healthData,
            loading: false
          });
        }
      } catch (securityErr) {
        console.warn('Error loading security events:', securityErr);
        setSecurityOps(prev => ({ ...prev, recentEvents: [], loading: false }));
      }
      // Cargar logs de auditoría admin
      try {
        const logs = await fetchAuditLogs(5);
        setAuditLogs(logs || []);
      } catch (auditErr) {
        console.warn('Error loading audit logs in dashboard:', auditErr);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }, [fetchAuditLogs]);

  useEffect(() => {
    loadDashboardData();
    loadAnalyticsData();
  }, [loadAnalyticsData, loadDashboardData]);

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

  const appFunnelTotals = appFunnel.reduce((totals, row) => ({
    downloadClicks: totals.downloadClicks + Number(row.download_clicks_30d || 0),
    storeClicks: totals.storeClicks + Number(row.download_store_clicks_30d || 0),
    hubClicks: totals.hubClicks + Number(row.download_hub_clicks_30d || 0),
    sessions: totals.sessions + Number(row.app_or_web_sessions_30d || 0),
    profileSignups: totals.profileSignups + Number(row.profile_signups_30d || 0),
    trackedSignups: totals.trackedSignups + Number(row.tracked_signups_30d || 0),
    trackedLogins: totals.trackedLogins + Number(row.tracked_logins_30d || 0)
  }), {
    downloadClicks: 0,
    storeClicks: 0,
    hubClicks: 0,
    sessions: 0,
    profileSignups: 0,
    trackedSignups: 0,
    trackedLogins: 0
  });

  const appSignupRate = appFunnelTotals.downloadClicks > 0
    ? ((appFunnelTotals.profileSignups / appFunnelTotals.downloadClicks) * 100).toFixed(1)
    : '0.0';

  const authSignupRate = Number(authFunnel?.signup_submits || 0) > 0
    ? ((Number(authFunnel?.signup_successes || 0) / Number(authFunnel.signup_submits)) * 100).toFixed(1)
    : '0.0';
  const authLoginRate = Number(authFunnel?.login_submits || 0) > 0
    ? ((Number(authFunnel?.login_successes || 0) / Number(authFunnel.login_submits)) * 100).toFixed(1)
    : '0.0';

  const appleRotationDaysRemaining = getDaysUntil(APPLE_CREDENTIAL_ROTATION_TARGET);
  const appleRotationLabel = appleRotationDaysRemaining > 0 ? `${appleRotationDaysRemaining} dias restantes` : 'revision vencida';
  const hasSecurityAlerts = securityOps.criticalEvents30d > 0 || securityOps.highEvents30d > 0;
  const latestSecurityEvent = securityOps.recentEvents[0];

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

      {/* Seguridad operativa y recordatorios criticos */}
      <div className={`rounded-xl border p-5 shadow-md ${hasSecurityAlerts ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-3">
            <div className={`mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${hasSecurityAlerts ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">Seguridad operativa Geobooker</h2>
              <p className="mt-1 text-sm text-slate-700">
                Revision mensual {SECURITY_REVIEW_DAY_LABEL}. Eventos criticos 30d: <strong>{securityOps.criticalEvents30d}</strong> - eventos altos 30d: <strong>{securityOps.highEvents30d}</strong>.
              </p>
              <p className="mt-2 text-sm text-slate-700">
                Rotacion de credenciales Apple: pendiente controlado. No rotar ahora; objetivo de revision: <strong>1 de febrero de 2027</strong> ({appleRotationLabel}).
              </p>
              {securityOps.health && (
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-1 font-semibold">
                    🛡️ Cobertura RLS: {securityOps.health.tables_without_rls === 0 ? '100% (0 sin RLS)' : `${securityOps.health.tables_without_rls} tablas desprotegidas`}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 px-2 py-1 font-semibold">
                    ⚡ Rate Limits (24h): {securityOps.health.rate_limited_identifiers_24h || 0} IPs controladas
                  </span>
                  {securityOps.health.last_audit_severity && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-800 px-2 py-1 font-semibold">
                      📋 Última auditoría: {securityOps.health.last_audit_severity.toUpperCase()}
                    </span>
                  )}
                </div>
              )}
              {latestSecurityEvent ? (
                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-700">
                  Ultimo evento: {latestSecurityEvent.severity} - {latestSecurityEvent.event_type} - {new Date(latestSecurityEvent.detected_at).toLocaleString('es-MX')}
                </p>
              ) : (
                <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs font-semibold text-slate-600">
                  Sin eventos sospechosos registrados en la tabla <code>security_events</code>.
                </p>
              )}
            </div>
          </div>
          <Link
            to="/admin/security"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800"
          >
            Ver seguridad
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
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
        <KPICard
          title="Usuarios Internacionales"
          value={intlStats.intlCount.toLocaleString()}
          icon={Globe}
          color="indigo"
          link="/admin/users"
        />
        {stats.pendingRecommendations > 0 && (
          <KPICard
            title="⭐ Recomendaciones Pendientes"
            value={stats.pendingRecommendations.toLocaleString()}
            icon={CheckCircle}
            color="yellow"
            link="/admin/recommendations"
          />
        )}
        <KPICard
          title="🛡️ Reclamos Pendientes"
          value={stats.pendingClaims.toLocaleString()}
          icon={CheckCircle}
          color={stats.pendingClaims > 0 ? "red" : "blue"}
          link="/admin/claims"
        />
        <KPICard
          title="🗺️ Negocios DENUE"
          value={stats.denueCount.toLocaleString()}
          icon={Globe}
          color="teal"
          link="/admin/businesses"
        />
        {stats.denueCount > 0 && (
          <KPICard
            title="🌱 Conversión DENUE"
            value={`${((stats.claimedCount / stats.denueCount) * 100).toFixed(1)}%`}
            icon={TrendingUp}
            color="emerald"
            link="/admin/claims"
          />
        )}
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

      {/* App funnel: descargas -> sesiones -> cuentas */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Embudo App: descargas, login y negocios
            </h3>
            <p className="mt-1 text-sm text-gray-600">
              Cruza clicks de descarga, sesiones y registros para entender si Android, iOS y PWA estan convirtiendo a usuarios reales.
            </p>
          </div>
          <Link
            to="/admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100"
          >
            Ver usuarios
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Clicks descarga</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{appFunnelTotals.downloadClicks.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Store clicks</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{appFunnelTotals.storeClicks.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Sesiones</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{appFunnelTotals.sessions.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Registros</p>
            <p className="mt-1 text-2xl font-black text-slate-950">{appFunnelTotals.profileSignups.toLocaleString()}</p>
          </div>
          <div className="rounded-2xl bg-blue-50 p-4">
            <p className="text-xs font-semibold uppercase text-blue-600">Conversion</p>
            <p className="mt-1 text-2xl font-black text-blue-900">{appSignupRate}%</p>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          {appFunnel.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
              Sin datos del embudo aun. Verifica que este aplicado el SQL de <code>admin_app_user_funnel_v1</code> y que los botones de descarga/login esten recibiendo trafico.
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="py-3 pr-4">Plataforma</th>
                  <th className="py-3 pr-4">Descargas</th>
                  <th className="py-3 pr-4">Sesiones</th>
                  <th className="py-3 pr-4">Registros</th>
                  <th className="py-3 pr-4">Logins</th>
                  <th className="py-3 pr-4">Tasa</th>
                </tr>
              </thead>
              <tbody>
                {appFunnel.map((row) => (
                  <tr key={row.platform || 'unknown'} className="border-b border-slate-100 text-slate-700">
                    <td className="py-3 pr-4 font-bold text-slate-950">{row.platform || 'unknown'}</td>
                    <td className="py-3 pr-4">{Number(row.download_clicks_30d || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4">{Number(row.app_or_web_sessions_30d || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4">{Number(row.profile_signups_30d || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4">{Number(row.tracked_logins_30d || 0).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-bold text-blue-700">{Number(row.signup_rate_from_download_clicks || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Users className="h-5 w-5 text-violet-600" />Embudo de cuenta (30 dias)</h3>
          <p className="mt-1 text-sm text-gray-600">Vista, envio y resultado sin almacenar correo ni contrasena.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Registro visto', authFunnel?.signup_views || 0],
              ['Registro enviado', authFunnel?.signup_submits || 0],
              ['Exito registro', `${authSignupRate}%`],
              ['Exito login', `${authLoginRate}%`]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-violet-50 p-3 text-violet-950">
                <p className="text-xs font-bold uppercase opacity-70">{label}</p>
                <p className="mt-1 text-2xl font-black">{typeof value === 'number' ? value.toLocaleString() : value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-md">
          <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900"><Activity className="h-5 w-5 text-amber-600" />Eficiencia Supabase (30 dias)</h3>
          <p className="mt-1 text-sm text-gray-600">El indicador por pagina debe bajar despues del despliegue.</p>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Paginas', Number(efficiencySnapshot?.page_views || 0).toLocaleString()],
              ['Sesiones', Number(efficiencySnapshot?.sessions || 0).toLocaleString()],
              ['Impresiones', Number(efficiencySnapshot?.ad_impressions || 0).toLocaleString()],
              ['Por pagina', Number(efficiencySnapshot?.impressions_per_page || 0).toFixed(1)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-amber-50 p-3 text-amber-950">
                <p className="text-xs font-bold uppercase opacity-70">{label}</p>
                <p className="mt-1 text-2xl font-black">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Intent Metrics - Intenci?n de Negocio */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          🎯 Intención de Negocio (últimos 30 días)
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <MessageCircle className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.whatsapp}</p>
            <p className="text-emerald-100 text-xs">WhatsApp</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Phone className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.calls}</p>
            <p className="text-emerald-100 text-xs">Llamadas</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Navigation className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.directions}</p>
            <p className="text-emerald-100 text-xs">Direcciones</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Share2 className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.shares}</p>
            <p className="text-emerald-100 text-xs">Compartidos</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Heart className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.favorites}</p>
            <p className="text-emerald-100 text-xs">Favoritos</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.total}</p>
            <p className="text-emerald-100 text-xs">Total</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <Users className="w-5 h-5 mx-auto mb-1 opacity-80" />
            <p className="text-2xl font-bold">{intentMetrics.uniqueUsers}</p>
            <p className="text-emerald-100 text-xs">Usuarios</p>
          </div>
        </div>

        {/* Top negocios con más intención */}
        {intentMetrics.topBusinesses.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/20">
            <p className="text-sm font-semibold text-emerald-100 mb-2">🏆 Top Negocios con Más Interacción</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {intentMetrics.topBusinesses.slice(0, 6).map((biz, idx) => (
                <div key={biz.business_id} className="bg-white/10 rounded-lg p-2 flex items-center gap-2">
                  <span className="text-lg font-bold text-emerald-200">#{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{biz.business_name || 'Sin nombre'}</p>
                    <p className="text-xs text-emerald-200">
                      {biz.total_intents} acciones · {biz.unique_users} usuarios
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dispositivos y Búsquedas Populares */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registros por País */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            Registros por País
          </h3>
          <div className="space-y-3">
            {intlStats.byCountry.length === 0 ? (
              <p className="text-gray-500 text-sm">Sin datos aún</p>
            ) : (
              intlStats.byCountry.map(item => (
                <div key={item.country_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{item.country_code === 'MX' ? '🇲🇽' : item.country_code === 'US' ? '🇺🇸' : item.country_code === 'CA' ? '🇨🇦' : item.country_code === 'GB' ? '🇬🇧' : '🌍'}</span>
                    <span className="text-gray-700 font-medium">{item.country_name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-900">{item.user_count}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{item.percentage}%</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {intlStats.byDomain.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase mb-3 text-center">Registros por Dominio</p>
              <div className="flex justify-around">
                {intlStats.byDomain.map(d => (
                  <div key={d.registration_domain} className="text-center">
                    <p className="text-sm font-bold text-gray-800">{d.total_users}</p>
                    <p className="text-[10px] text-gray-500">{d.registration_domain}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
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

      {/* Sección de Auditoría y Seguridad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              Auditoría de Administradores (Últimas Acciones)
            </h2>
            <Link
              to="/admin/security"
              className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              Ver panel de seguridad
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-3">
            {auditLogs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay registros de auditoría recientes (las migraciones de base de datos están pendientes)</p>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm truncate">{log.admin_email}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${getActionColor(log.action)}`}>
                        {getActionLabel(log.action)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {log.target_type && `${log.target_type}: `}
                      <span className="font-medium text-gray-700">{log.target_name || log.target_id || 'N/A'}</span>
                      {log.details && Object.keys(log.details).length > 0 && ` · ${JSON.stringify(log.details)}`}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 font-mono ml-4 flex-shrink-0">
                    {new Date(log.created_at).toLocaleString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: 'numeric', month: 'short' })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Panel de Enlaces de Seguridad */}
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              🛡️ Estado de Seguridad
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Control de accesos y monitorización de base de datos.
            </p>
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm bg-green-50 p-2.5 rounded-lg border border-green-200">
                <span className="font-medium text-green-800">RLS (Row Level Security)</span>
                <span className="bg-green-200 text-green-900 text-xs px-2 py-0.5 rounded-full font-bold">Activo</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-blue-50 p-2.5 rounded-lg border border-blue-200">
                <span className="font-medium text-blue-800">Conexión Supabase SSL</span>
                <span className="bg-blue-200 text-blue-900 text-xs px-2 py-0.5 rounded-full font-bold">Forzado</span>
              </div>
              <div className="flex items-center justify-between text-sm bg-purple-50 p-2.5 rounded-lg border border-purple-200">
                <span className="font-medium text-purple-800">Autenticación Admin</span>
                <span className="bg-purple-200 text-purple-900 text-xs px-2 py-0.5 rounded-full font-bold">Vía RLS</span>
              </div>
            </div>
          </div>
          <Link
            to="/admin/security"
            className="mt-6 flex items-center justify-center gap-2 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition w-full text-center"
          >
            <Shield className="w-4 h-4" />
            Configuración de Seguridad
          </Link>
        </div>
      </div>

      {/* Stats Summary - métricas REALES del mes */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
        <h3 className="text-xl font-bold mb-4">📊 Resumen del Mes (métricas reales)</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-blue-100 text-sm">Impresiones Totales</p>
            <p className="text-2xl font-bold mt-1">
              {adMetrics.totalImpressions.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Clics Totales</p>
            <p className="text-2xl font-bold mt-1">
              {adMetrics.totalClicks.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">CTR Promedio</p>
            <p className="text-2xl font-bold mt-1">
              {adMetrics.ctr}%
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
function KPICard({ title, value, icon, color, link }) {
  const Icon = icon;
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    indigo: 'bg-indigo-50 text-indigo-600',
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
function QuickLink({ to, icon, label, color }) {
  const Icon = icon;
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

// Helpers for Audit Log Action formatting
const getActionLabel = (action) => {
  const actions = {
    approve_business: 'Aprobó negocio',
    reject_business: 'Rechazó negocio',
    edit_business: 'Modificó negocio',
    create_ad: 'Creó anuncio',
    delete_user: 'Eliminó usuario',
    import_contacts: 'Importó contactos',
    send_campaign: 'Lanzó campaña CRM',
    save_settings: 'Cambió configuración',
  };
  return actions[action] || action;
};

const getActionColor = (action) => {
  if (action.includes('approve') || action.includes('create') || action.includes('send')) {
    return 'bg-green-100 text-green-800';
  }
  if (action.includes('reject') || action.includes('delete')) {
    return 'bg-red-100 text-red-800';
  }
  return 'bg-blue-100 text-blue-800';
};
