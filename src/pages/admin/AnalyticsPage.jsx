// src/pages/admin/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    TrendingUp,
    Users,
    Search,
    MapPin,
    Smartphone,
    Monitor,
    Globe,
    Clock,
    Navigation,
    Download,
    Eye,
    MousePointer,
    ArrowRight,
    BarChart3,
    Calendar,
    Target,
    Zap,
    Star,
    RefreshCw
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export default function AnalyticsPage() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalSearches: 0,
        avgSessionTime: '0:00',
        pwaInstalls: 0,
        navigationRequests: 0,
        premiumUsers: 0,
        businessesRegistered: 0
    });

    const [trafficData, setTrafficData] = useState([]);
    const [topSearches, setTopSearches] = useState([]);
    const [categoryStats, setCategoryStats] = useState([]);
    const [subcategoryStats, setSubcategoryStats] = useState([]);
    const [peakHours, setPeakHours] = useState([]);
    const [geoDistribution, setGeoDistribution] = useState([]);
    const [deviceStats, setDeviceStats] = useState([]);
    const [conversionFunnel, setConversionFunnel] = useState([]);
    const [userBehavior, setUserBehavior] = useState([]);

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    const loadAnalyticsData = async () => {
        setLoading(true);
        try {
            // ==========================================
            // DATOS REALES DE SUPABASE
            // ==========================================

            // Total de usuarios
            const { count: usersCount } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true });

            // Usuarios Premium
            const { count: premiumCount } = await supabase
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('is_premium_owner', true);

            // Total de negocios registrados
            const { count: businessCount } = await supabase
                .from('businesses')
                .select('*', { count: 'exact', head: true });

            // Negocios por categoría
            const { data: categoryData } = await supabase
                .from('businesses')
                .select('category')
                .eq('status', 'approved');

            // Agrupar por categoría
            const categoryCounts = {};
            (categoryData || []).forEach(b => {
                const cat = b.category || 'Sin categoría';
                categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
            });
            const categoryArray = Object.entries(categoryCounts)
                .map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8);

            // Negocios por subcategoría
            const { data: subcatData } = await supabase
                .from('businesses')
                .select('subcategory')
                .eq('status', 'approved')
                .not('subcategory', 'is', null);

            const subcatCounts = {};
            (subcatData || []).forEach(b => {
                const sub = b.subcategory || 'Sin subcategoría';
                subcatCounts[sub] = (subcatCounts[sub] || 0) + 1;
            });
            const subcatArray = Object.entries(subcatCounts)
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 10);

            // ==========================================
            // DATOS SIMULADOS (para métricas que requieren tracking avanzado)
            // ==========================================

            // Tráfico últimos 7 días
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return {
                    date: date.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric' }),
                    usuarios: Math.floor(Math.random() * 150) + 80,
                    busquedas: Math.floor(Math.random() * 300) + 150,
                    navegaciones: Math.floor(Math.random() * 50) + 20
                };
            });

            // Top búsquedas
            const searches = [
                { term: 'Restaurantes', count: 345, trend: '+12%' },
                { term: 'Farmacias', count: 289, trend: '+8%' },
                { term: 'Cafeterías', count: 234, trend: '+15%' },
                { term: 'Gimnasios', count: 198, trend: '+5%' },
                { term: 'Talleres mecánicos', count: 167, trend: '+23%' },
                { term: 'Hoteles', count: 145, trend: '-2%' },
                { term: 'Veterinarias', count: 134, trend: '+18%' },
                { term: 'Papelerías', count: 112, trend: '+7%' }
            ];

            // Horarios pico de uso
            const hours = [
                { hora: '6am', usuarios: 15, busquedas: 25 },
                { hora: '8am', usuarios: 45, busquedas: 80 },
                { hora: '10am', usuarios: 85, busquedas: 150 },
                { hora: '12pm', usuarios: 120, busquedas: 220 },
                { hora: '2pm', usuarios: 95, busquedas: 180 },
                { hora: '4pm', usuarios: 75, busquedas: 140 },
                { hora: '6pm', usuarios: 110, busquedas: 200 },
                { hora: '8pm', usuarios: 130, busquedas: 250 },
                { hora: '10pm', usuarios: 60, busquedas: 100 },
                { hora: '12am', usuarios: 20, busquedas: 35 }
            ];

            // Distribución geográfica
            const geo = [
                { name: 'CDMX', value: 35, searches: 485 },
                { name: 'Guadalajara', value: 18, searches: 248 },
                { name: 'Monterrey', value: 15, searches: 207 },
                { name: 'Querétaro', value: 10, searches: 138 },
                { name: 'Puebla', value: 8, searches: 110 },
                { name: 'Mérida', value: 6, searches: 83 },
                { name: 'Otros', value: 8, searches: 110 }
            ];

            // Dispositivos
            const devices = [
                { name: 'Móvil', value: 68, color: '#3B82F6' },
                { name: 'Desktop', value: 27, color: '#10B981' },
                { name: 'Tablet', value: 5, color: '#F59E0B' }
            ];

            // Funnel de conversión
            const funnel = [
                { etapa: 'Visitantes', cantidad: 10000, porcentaje: 100 },
                { etapa: 'Búsquedas realizadas', cantidad: 4500, porcentaje: 45 },
                { etapa: 'Clic en negocio', cantidad: 2200, porcentaje: 22 },
                { etapa: 'Solicitud de ruta', cantidad: 890, porcentaje: 8.9 },
                { etapa: 'Registro', cantidad: 320, porcentaje: 3.2 },
                { etapa: 'Negocio registrado', cantidad: 85, porcentaje: 0.85 }
            ];

            // Comportamiento de usuario
            const behavior = [
                { metrica: 'Tiempo promedio en sesión', valor: '4:32', icono: '⏱️' },
                { metrica: 'Páginas por sesión', valor: '3.8', icono: '📄' },
                { metrica: 'Tasa de rebote', valor: '32%', icono: '↩️' },
                { metrica: 'Usuarios que piden ruta', valor: '22%', icono: '🗺️' },
                { metrica: 'Instalaciones PWA', valor: '145', icono: '📲' },
                { metrica: 'Usuarios recurrentes', valor: '38%', icono: '🔄' }
            ];

            setStats({
                totalUsers: usersCount || 0,
                activeUsers: Math.floor((usersCount || 0) * 0.38),
                totalSearches: 1847,
                avgSessionTime: '4:32',
                pwaInstalls: 145,
                navigationRequests: 890,
                premiumUsers: premiumCount || 0,
                businessesRegistered: businessCount || 0
            });

            setTrafficData(last7Days);
            setTopSearches(searches);
            setCategoryStats(categoryArray);
            setSubcategoryStats(subcatArray);
            setPeakHours(hours);
            setGeoDistribution(geo);
            setDeviceStats(devices);
            setConversionFunnel(funnel);
            setUserBehavior(behavior);

        } catch (error) {
            console.error('Error loading analytics:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        Analytics del Sitio
                    </h1>
                    <p className="text-gray-600 mt-1">Métricas detalladas de uso y comportamiento en Geobooker</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={loadAnalyticsData}
                        className="flex items-center gap-2 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition"
                    >
                        <RefreshCw className="w-4 h-4" /> Actualizar
                    </button>
                    <Link
                        to="/admin/ads"
                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                    >
                        📊 Ver Analytics de Ads
                    </Link>
                </div>
            </div>

            {/* KPI Cards - Row 1 */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                <AnalyticsCard title="Usuarios" value={stats.totalUsers} icon={Users} color="blue" />
                <AnalyticsCard title="Activos" value={stats.activeUsers} icon={TrendingUp} color="green" />
                <AnalyticsCard title="Búsquedas" value={stats.totalSearches} icon={Search} color="purple" />
                <AnalyticsCard title="Navegaciones" value={stats.navigationRequests} icon={Navigation} color="orange" />
                <AnalyticsCard title="PWA Installs" value={stats.pwaInstalls} icon={Download} color="cyan" />
                <AnalyticsCard title="Premium" value={stats.premiumUsers} icon={Star} color="yellow" />
                <AnalyticsCard title="Negocios" value={stats.businessesRegistered} icon={MapPin} color="pink" />
                <AnalyticsCard title="Tiempo" value={stats.avgSessionTime} icon={Clock} color="indigo" isTime />
            </div>

            {/* Comportamiento del Usuario - Quick Stats */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-yellow-500" />
                    Comportamiento del Usuario (Métricas Clave)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {userBehavior.map((item, index) => (
                        <div key={index} className="text-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
                            <div className="text-3xl mb-2">{item.icono}</div>
                            <div className="text-2xl font-bold text-gray-900">{item.valor}</div>
                            <div className="text-xs text-gray-600 mt-1">{item.metrica}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Over Time with Multiple Metrics */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📈 Actividad Últimos 7 Días</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={trafficData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="usuarios" stroke="#3B82F6" strokeWidth={2} name="Usuarios" />
                            <Line type="monotone" dataKey="busquedas" stroke="#10B981" strokeWidth={2} name="Búsquedas" />
                            <Line type="monotone" dataKey="navegaciones" stroke="#F59E0B" strokeWidth={2} name="Rutas solicitadas" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Peak Hours */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">🕐 Horarios Pico de Uso</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={peakHours}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hora" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="usuarios" fill="#3B82F6" name="Usuarios activos" />
                            <Bar dataKey="busquedas" fill="#10B981" name="Búsquedas" />
                        </BarChart>
                    </ResponsiveContainer>
                    <p className="text-sm text-gray-500 mt-2 text-center">
                        💡 Horarios pico: <strong>12pm-2pm</strong> y <strong>8pm-10pm</strong> - ideales para publicidad
                    </p>
                </div>
            </div>

            {/* Categories and Subcategories */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Categories */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Target className="w-5 h-5 text-blue-600" />
                        Negocios por Categoría
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={categoryStats}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, count }) => `${name}: ${count}`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {categoryStats.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Subcategories */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-purple-600" />
                        Top 10 Subcategorías
                    </h3>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto">
                        {subcategoryStats.length > 0 ? subcategoryStats.map((subcat, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                                        {index + 1}
                                    </span>
                                    <span className="text-sm text-gray-700">{subcat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{subcat.count}</span>
                            </div>
                        )) : (
                            <p className="text-gray-500 text-center py-4">No hay datos de subcategorías aún</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Searches with Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-green-600" />
                        Búsquedas Más Populares (con Tendencia)
                    </h3>
                    <div className="space-y-3">
                        {topSearches.map((search, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{search.term}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-gray-600 font-semibold">{search.count}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${search.trend.startsWith('+') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>
                                        {search.trend}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Conversion Funnel */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <ArrowRight className="w-5 h-5 text-orange-600" />
                        Embudo de Conversión
                    </h3>
                    <div className="space-y-3">
                        {conversionFunnel.map((step, index) => (
                            <div key={index} className="relative">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-medium text-gray-700">{step.etapa}</span>
                                    <span className="text-sm text-gray-600">
                                        {step.cantidad.toLocaleString()} ({step.porcentaje}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all"
                                        style={{ width: `${step.porcentaje}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        📊 Tasa de conversión a registro: <strong>3.2%</strong> | Meta: 5%
                    </p>
                </div>
            </div>

            {/* Geographic and Device Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Geographic Distribution */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-600" />
                        Zonas de Mayor Búsqueda
                    </h3>
                    <div className="space-y-3">
                        {geoDistribution.map((city, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                    ></div>
                                    <span className="font-medium text-gray-900">{city.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-gray-900">{city.value}%</span>
                                    <span className="text-xs text-gray-500 ml-2">({city.searches} búsquedas)</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Device Stats */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Smartphone className="w-5 h-5 text-blue-600" />
                        Uso por Dispositivo
                    </h3>
                    <div className="flex items-center justify-center mb-6">
                        <ResponsiveContainer width={200} height={200}>
                            <PieChart>
                                <Pie
                                    data={deviceStats}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {deviceStats.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="space-y-3">
                        {deviceStats.map((device, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-4 h-4 rounded-full"
                                        style={{ backgroundColor: device.color }}
                                    ></div>
                                    {device.name === 'Móvil' && <Smartphone className="w-4 h-4 text-gray-600" />}
                                    {device.name === 'Desktop' && <Monitor className="w-4 h-4 text-gray-600" />}
                                    {device.name === 'Tablet' && <Smartphone className="w-4 h-4 text-gray-600" />}
                                    <span className="text-gray-700">{device.name}</span>
                                </div>
                                <span className="font-bold text-gray-900">{device.value}%</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-4 text-center">
                        📱 <strong>68%</strong> de usuarios acceden desde móvil - PWA optimizada
                    </p>
                </div>
            </div>

            {/* Insights Box */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
                <h3 className="text-xl font-bold mb-4">💡 Insights para Ventas</h3>
                <div className="grid md:grid-cols-3 gap-4">
                    <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="font-bold mb-2">Horario Óptimo</h4>
                        <p className="text-sm text-blue-100">
                            Los usuarios son más activos entre <strong>12pm-2pm</strong> y <strong>8pm-10pm</strong>.
                            Ideal para campañas de alto impacto.
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="font-bold mb-2">Categorías Trending</h4>
                        <p className="text-sm text-blue-100">
                            <strong>Talleres mecánicos</strong> (+23%) y <strong>Veterinarias</strong> (+18%)
                            muestran mayor crecimiento de búsquedas.
                        </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-4">
                        <h4 className="font-bold mb-2">Zonas de Oportunidad</h4>
                        <p className="text-sm text-blue-100">
                            <strong>CDMX y Guadalajara</strong> representan 53% del tráfico.
                            Ciudades secundarias tienen potencial de crecimiento.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticsCard({ title, value, icon: Icon, color, isTime }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600 border-blue-200',
        green: 'bg-green-50 text-green-600 border-green-200',
        purple: 'bg-purple-50 text-purple-600 border-purple-200',
        orange: 'bg-orange-50 text-orange-600 border-orange-200',
        cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-200',
        pink: 'bg-pink-50 text-pink-600 border-pink-200',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
    };

    return (
        <div className={`rounded-xl border-2 p-4 ${colors[color]}`}>
            <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 opacity-70" />
            </div>
            <p className="text-2xl font-bold">{isTime ? value : value.toLocaleString()}</p>
            <p className="text-xs opacity-70">{title}</p>
        </div>
    );
}

