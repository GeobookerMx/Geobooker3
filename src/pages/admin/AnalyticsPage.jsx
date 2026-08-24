import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowRight, BarChart3, Clock, Download, MapPin, Monitor, Navigation,
    RefreshCw, Search, Smartphone, Star, Target, TrendingUp, Users, Zap
} from 'lucide-react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
    ResponsiveContainer, Tooltip, XAxis, YAxis
} from 'recharts';
import { supabase } from '../../lib/supabase';
import {
    getAnalyticsSummary, getCountryTraffic, getDeviceBreakdown, getHourlyTraffic
} from '../../services/analyticsService';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
const DEVICE_LABELS = { mobile: 'Móvil', desktop: 'Desktop', tablet: 'Tablet', unknown: 'Sin clasificar' };
const DEVICE_COLORS = { mobile: '#3B82F6', desktop: '#10B981', tablet: '#F59E0B', unknown: '#94A3B8' };

const number = (value) => Number(value || 0);
const ratio = (value, total) => total > 0 ? Math.round((number(value) / total) * 100) : 0;
const dayKey = (value) => new Date(value).toLocaleDateString('en-CA', { timeZone: 'America/Mexico_City' });

const trend = (current, previous) => {
    if (!previous) return current ? { label: 'Nueva', direction: 'up' } : { label: '0%', direction: 'flat' };
    const change = Math.round(((current - previous) / previous) * 100);
    return { label: `${change > 0 ? '+' : ''}${change}%`, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'flat' };
};

const trendClass = (direction) => direction === 'up'
    ? 'bg-green-100 text-green-700'
    : direction === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600';

const formatDay = (value) => new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', {
    weekday: 'short', day: 'numeric'
});

const normalizeOverview = (payload = {}) => ({
    totalUsers: number(payload.total_users),
    premiumUsers: number(payload.premium_users),
    businessesRegistered: number(payload.businesses_registered),
    recentSignups: number(payload.recent_signups),
    recentBusinesses: number(payload.recent_businesses),
    pageViews: number(payload.page_views),
    uniqueVisitors: number(payload.unique_visitors),
    searches: number(payload.searches),
    routes: number(payload.routes),
    profileViews: number(payload.profile_views),
    pwaInstalls: number(payload.pwa_installs),
    todayPageViews: number(payload.today_page_views),
    todaySearches: number(payload.today_searches),
    daily: (payload.daily || []).map((row) => ({
        date: formatDay(row.date),
        usuarios: number(row.unique_sessions),
        busquedas: number(row.searches),
        navegaciones: number(row.routes)
    })),
    hourly: (payload.hourly || []).map((row) => ({
        hora: `${String(row.hour).padStart(2, '0')}:00`,
        usuarios: number(row.unique_visitors),
        busquedas: number(row.searches)
    })),
    searchesList: (payload.top_searches || []).map((row) => ({
        term: row.query ? row.query.charAt(0).toUpperCase() + row.query.slice(1) : 'Sin término',
        count: number(row.current_count),
        trend: trend(number(row.current_count), number(row.previous_count))
    })),
    devices: (payload.devices || []).map((row) => ({
        name: DEVICE_LABELS[row.device] || row.device,
        value: number(row.percentage),
        count: number(row.count),
        color: DEVICE_COLORS[row.device] || '#8B5CF6'
    })),
    countries: (payload.countries || []).map((row) => ({
        name: row.country || row.country_code || 'Desconocido',
        value: number(row.percentage),
        searches: number(row.searches),
        pageViews: number(row.page_views)
    })),
    categories: (payload.categories || []).map((row) => ({ name: row.name, count: number(row.count) })),
    subcategories: (payload.subcategories || []).map((row) => ({ name: row.name, count: number(row.count) }))
});

async function loadCompatibilityOverview() {
    const now = new Date();
    const start7 = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const start14 = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));
    const [
        users, premium, businesses, recentSignups, recentBusinesses, categoriesResult,
        subcategoriesResult, pages, searchesResult, routes, profiles, installs,
        summary, hourly, countries, devices
    ] = await Promise.all([
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).eq('is_premium_owner', true),
        supabase.from('businesses').select('*', { count: 'exact', head: true }),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', start7.toISOString()),
        supabase.from('businesses').select('*', { count: 'exact', head: true }).gte('created_at', start7.toISOString()),
        supabase.from('businesses').select('category').eq('status', 'approved'),
        supabase.from('businesses').select('subcategory').eq('status', 'approved').not('subcategory', 'is', null),
        supabase.from('page_analytics').select('created_at,session_id').gte('created_at', start7.toISOString()),
        supabase.from('search_analytics').select('query,created_at').gte('created_at', start14.toISOString()),
        supabase.from('route_analytics').select('created_at').gte('created_at', start7.toISOString()),
        supabase.from('business_intent_logs').select('*', { count: 'exact', head: true }).eq('event_name', 'view_business_profile').gte('created_at', start7.toISOString()),
        supabase.from('app_download_events').select('*', { count: 'exact', head: true }).eq('target', 'pwa_install').gte('created_at', start7.toISOString()),
        getAnalyticsSummary(7), getHourlyTraffic(7), getCountryTraffic(30), getDeviceBreakdown(30)
    ]);

    const errors = [users, premium, businesses, recentSignups, recentBusinesses, categoriesResult,
        subcategoriesResult, pages, searchesResult, routes, profiles, installs]
        .map((result) => result?.error?.message).filter(Boolean);

    const aggregate = (rows, field, fallback) => Object.entries((rows || []).reduce((acc, row) => {
        const key = row[field] || fallback;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {})).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);

    const current = {};
    const previous = {};
    (searchesResult.data || []).forEach((row) => {
        const query = row.query?.trim().toLowerCase();
        if (!query) return;
        const bucket = new Date(row.created_at) >= start7 ? current : previous;
        bucket[query] = (bucket[query] || 0) + 1;
    });

    const dates = Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return { key: dayKey(date), date: formatDay(dayKey(date)), sessions: new Set(), busquedas: 0, navegaciones: 0 };
    });
    const byDate = new Map(dates.map((entry) => [entry.key, entry]));
    (pages.data || []).forEach((row) => { if (row.session_id) byDate.get(dayKey(row.created_at))?.sessions.add(row.session_id); });
    (searchesResult.data || []).filter((row) => new Date(row.created_at) >= start7)
        .forEach((row) => { const entry = byDate.get(dayKey(row.created_at)); if (entry) entry.busquedas += 1; });
    (routes.data || []).forEach((row) => { const entry = byDate.get(dayKey(row.created_at)); if (entry) entry.navegaciones += 1; });

    return {
        overview: normalizeOverview({
            total_users: users.count, premium_users: premium.count, businesses_registered: businesses.count,
            recent_signups: recentSignups.count, recent_businesses: recentBusinesses.count,
            page_views: summary.pageViews, unique_visitors: summary.uniqueVisitors, searches: summary.searches,
            routes: (routes.data || []).length, profile_views: profiles.count, pwa_installs: installs.count,
            today_page_views: summary.todayPageViews, today_searches: summary.todaySearches,
            daily: dates.map((entry) => ({ date: entry.key, unique_sessions: entry.sessions.size, searches: entry.busquedas, routes: entry.navegaciones })),
            hourly, countries, devices,
            top_searches: Object.entries(current).sort((a, b) => b[1] - a[1]).slice(0, 10)
                .map(([query, count]) => ({ query, current_count: count, previous_count: previous[query] || 0 })),
            categories: aggregate(categoriesResult.data, 'category', 'Sin categoría').slice(0, 8),
            subcategories: aggregate(subcategoriesResult.data, 'subcategory', 'Sin subcategoría').slice(0, 10)
        }),
        errors
    };
}

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [overview, setOverview] = useState(() => normalizeOverview());
    const [warnings, setWarnings] = useState([]);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('get_admin_analytics_observed_v1', { p_days: 7, p_geo_days: 30 });
            if (!error && data) {
                setOverview(normalizeOverview(data));
                setWarnings([]);
            } else {
                const fallback = await loadCompatibilityOverview();
                setOverview(fallback.overview);
                setWarnings([
                    'El agregado eficiente de Analytics aún no está aplicado; se usó el modo de compatibilidad.',
                    ...fallback.errors
                ]);
            }
        } catch (error) {
            console.error('Error loading analytics:', error);
            setWarnings([error.message || 'No se pudieron cargar las métricas.']);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const peakHour = overview.hourly.reduce((best, row) => (!best || row.usuarios > best.usuarios ? row : best), null);
    const journey = [
        { label: 'Visitantes únicos', value: overview.uniqueVisitors, rate: 100 },
        { label: 'Búsquedas realizadas', value: overview.searches, rate: ratio(overview.searches, overview.uniqueVisitors) },
        { label: 'Perfiles consultados', value: overview.profileViews, rate: ratio(overview.profileViews, overview.uniqueVisitors) },
        { label: 'Rutas solicitadas', value: overview.routes, rate: ratio(overview.routes, overview.uniqueVisitors) },
        { label: 'Registros nuevos', value: overview.recentSignups, rate: ratio(overview.recentSignups, overview.uniqueVisitors) },
        { label: 'Negocios nuevos', value: overview.recentBusinesses, rate: ratio(overview.recentBusinesses, overview.uniqueVisitors) }
    ];

    if (loading) return <div className="flex h-64 items-center justify-center bg-gray-50"><RefreshCw className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen space-y-6 bg-gray-50 p-6">
            <header className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div><h1 className="flex items-center gap-3 text-3xl font-bold text-gray-900"><BarChart3 className="h-8 w-8 text-blue-600" />Analytics del Sitio</h1><p className="mt-1 text-gray-600">Datos observados de Geobooker; sin proyecciones ni valores simulados.</p></div>
                <div className="flex gap-3"><button onClick={loadData} className="flex items-center gap-2 rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"><RefreshCw className="h-4 w-4" /> Actualizar</button><Link to="/admin/ads" className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700">Ver publicidad</Link></div>
            </header>

            {warnings.length > 0 ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Analytics funciona en modo de compatibilidad.</p><p className="mt-1">Aplica la migración indicada para reducir solicitudes y evitar límites de paginación. No se generaron datos ficticios.</p></div> : null}

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
                <Metric title="Usuarios totales" value={overview.totalUsers} icon={Users} color="blue" />
                <Metric title="Visitantes 7d" value={overview.uniqueVisitors} icon={TrendingUp} color="green" />
                <Metric title="Búsquedas 7d" value={overview.searches} icon={Search} color="purple" />
                <Metric title="Rutas 7d" value={overview.routes} icon={Navigation} color="orange" />
                <Metric title="PWA 7d" value={overview.pwaInstalls} icon={Download} color="cyan" />
                <Metric title="Premium" value={overview.premiumUsers} icon={Star} color="yellow" />
                <Metric title="Negocios" value={overview.businessesRegistered} icon={MapPin} color="pink" />
            </div>

            <Panel title="Señales observadas" icon={Zap}>
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">{[
                    ['Páginas vistas (7d)', overview.pageViews], ['Visitantes únicos (7d)', overview.uniqueVisitors],
                    ['Búsquedas (7d)', overview.searches], ['Páginas hoy', overview.todayPageViews],
                    ['Búsquedas hoy', overview.todaySearches], ['Rutas (7d)', overview.routes]
                ].map(([label, value]) => <div key={label} className="rounded-xl bg-gray-50 p-4 text-center"><p className="text-2xl font-bold text-gray-900">{number(value).toLocaleString()}</p><p className="mt-1 text-xs text-gray-600">{label}</p></div>)}</div>
            </Panel>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Actividad real de los últimos 7 días"><ResponsiveContainer width="100%" height={280}><LineChart data={overview.daily}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="date" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="usuarios" stroke="#3B82F6" strokeWidth={2} name="Sesiones únicas" /><Line type="monotone" dataKey="busquedas" stroke="#10B981" strokeWidth={2} name="Búsquedas" /><Line type="monotone" dataKey="navegaciones" stroke="#F59E0B" strokeWidth={2} name="Rutas" /></LineChart></ResponsiveContainer></Panel>
                <Panel title="Actividad real por hora (7 días)">{overview.hourly.length ? <ResponsiveContainer width="100%" height={280}><BarChart data={overview.hourly}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="hora" tick={{ fontSize: 10 }} interval={2} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="usuarios" fill="#3B82F6" name="Visitantes únicos" /><Bar dataKey="busquedas" fill="#10B981" name="Búsquedas" /></BarChart></ResponsiveContainer> : <Empty text="Todavía no hay datos horarios." />}<p className="mt-3 flex items-center gap-2 text-xs text-gray-500"><Clock className="h-4 w-4" /> Zona horaria: America/Mexico_City</p></Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Negocios aprobados por categoría" icon={Target}>{overview.categories.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={overview.categories} dataKey="count" nameKey="name" outerRadius={85} label={({ name, count }) => `${name}: ${count}`}>{overview.categories.map((entry, index) => <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty text="No hay categorías aprobadas." />}</Panel>
                <Panel title="Top subcategorías" icon={Search}>{overview.subcategories.length ? <div className="max-h-[260px] space-y-2 overflow-y-auto">{overview.subcategories.map((item, index) => <div key={item.name} className="flex justify-between rounded-lg bg-gray-50 p-3 text-sm"><span>{index + 1}. {item.name}</span><strong>{item.count.toLocaleString()}</strong></div>)}</div> : <Empty text="No hay subcategorías aprobadas." />}</Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Búsquedas: 7 días contra los 7 anteriores" icon={Search}>{overview.searchesList.length ? <div className="space-y-3">{overview.searchesList.map((item, index) => <div key={item.term} className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><span className="font-medium">{index + 1}. {item.term}</span><div className="flex items-center gap-3"><strong>{item.count}</strong><span className={`rounded px-2 py-1 text-xs font-bold ${trendClass(item.trend.direction)}`}>{item.trend.label}</span></div></div>)}</div> : <Empty text="No hubo búsquedas registradas." />}</Panel>
                <Panel title="Indicadores del recorrido (7 días)" icon={ArrowRight}><p className="mb-4 text-xs text-gray-500">Son volúmenes del mismo periodo, no una atribución secuencial por persona. La barra indica acciones por cada 100 visitantes.</p><div className="space-y-3">{journey.map((item) => <div key={item.label}><div className="mb-1 flex justify-between text-sm"><span>{item.label}</span><span>{item.value.toLocaleString()} · {item.rate} por 100</span></div><div className="h-3 rounded-full bg-gray-200"><div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${Math.min(item.rate, 100)}%` }} /></div></div>)}</div></Panel>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Panel title="Distribución geográfica real (30 días)" icon={MapPin}>{overview.countries.length ? <div className="space-y-3">{overview.countries.map((item, index) => <div key={`${item.name}-${index}`} className="flex justify-between rounded-lg bg-gray-50 p-3"><span className="font-medium">{item.name}</span><span className="text-right text-sm"><strong>{item.value.toFixed(1)}%</strong><br />{item.searches} búsquedas · {item.pageViews} páginas</span></div>)}</div> : <Empty text="Todavía no hay geografía suficiente." />}</Panel>
                <Panel title="Dispositivos reales (30 días)" icon={Smartphone}>{overview.devices.some((item) => item.count > 0) ? <><ResponsiveContainer width="100%" height={210}><PieChart><Pie data={overview.devices} dataKey="count" nameKey="name" innerRadius={50} outerRadius={80}>{overview.devices.map((item) => <Cell key={item.name} fill={item.color} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="space-y-2">{overview.devices.map((item) => <div key={item.name} className="flex justify-between text-sm"><span className="flex items-center gap-2">{item.name === 'Desktop' ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}{item.name}</span><strong>{item.count.toLocaleString()} · {item.value}%</strong></div>)}</div></> : <Empty text="Todavía no hay dispositivos clasificados." />}</Panel>
            </div>

            <section className="rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white"><h2 className="mb-4 text-xl font-bold">Insights verificables</h2><div className="grid gap-4 md:grid-cols-3"><Insight title="Horario con más visitantes" value={peakHour ? `${peakHour.hora} · ${peakHour.usuarios} visitantes` : 'Sin datos suficientes'} /><Insight title="Categoría con más perfiles" value={overview.categories[0] ? `${overview.categories[0].name} · ${overview.categories[0].count}` : 'Sin datos suficientes'} /><Insight title="País con más actividad" value={overview.countries[0] ? `${overview.countries[0].name} · ${overview.countries[0].value.toFixed(1)}%` : 'Sin datos suficientes'} /></div></section>
        </div>
    );
}

function Panel({ title, icon, children }) {
    return <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-900">{icon ? React.createElement(icon, { className: 'h-5 w-5 text-blue-600' }) : null}{title}</h2>{children}</section>;
}

function Empty({ text }) {
    return <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 px-4 text-center text-sm text-gray-500">{text}</div>;
}

function Insight({ title, value }) {
    return <div className="rounded-lg bg-white/10 p-4"><h3 className="font-bold">{title}</h3><p className="mt-2 text-sm text-blue-100">{value}</p></div>;
}

function Metric({ title, value, icon, color }) {
    const colors = { blue: 'border-blue-200 bg-blue-50 text-blue-600', green: 'border-green-200 bg-green-50 text-green-600', purple: 'border-purple-200 bg-purple-50 text-purple-600', orange: 'border-orange-200 bg-orange-50 text-orange-600', cyan: 'border-cyan-200 bg-cyan-50 text-cyan-600', yellow: 'border-yellow-200 bg-yellow-50 text-yellow-700', pink: 'border-pink-200 bg-pink-50 text-pink-600' };
    return <div className={`rounded-xl border-2 p-4 ${colors[color]}`}>{React.createElement(icon, { className: 'mb-2 h-5 w-5 opacity-70' })}<p className="text-2xl font-bold">{number(value).toLocaleString()}</p><p className="text-xs opacity-70">{title}</p></div>;
}
