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
    Globe
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Link } from 'react-router-dom';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function AnalyticsPage() {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalSearches: 0,
        avgSessionTime: '5:23',
        loading: true
    });

    const [trafficData, setTrafficData] = useState([]);
    const [topSearches, setTopSearches] = useState([]);
    const [geoDistribution, setGeoDistribution] = useState([]);
    const [deviceStats, setDeviceStats] = useState([]);

    useEffect(() => {
        loadAnalyticsData();
    }, []);

    const loadAnalyticsData = async () => {
        try {
            // Total de usuarios
            const { count: usersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true });

            // Datos de tráfico simulados (últimos 7 días)
            const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return {
                    date: date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' }),
                    users: Math.floor(Math.random() * 200) + 100
                };
            });

            // Top búsquedas (simulado)
            const searches = [
                { term: 'Restaurantes', count: 245 },
                { term: 'Cafeterías', count: 189 },
                { term: 'Gimnasios', count: 156 },
                { term: 'Farmacias', count: 143 },
                { term: 'Hoteles', count: 128 }
            ];

            // Distribución geográfica
            const geo = [
                { name: 'Ciudad de México', value: 35 },
                { name: 'Guadalajara', value: 25 },
                { name: 'Monterrey', value: 20 },
                { name: 'Querétaro', value: 12 },
                { name: 'Otros', value: 8 }
            ];

            // Dispositivos
            const devices = [
                { name: 'Móvil', value: 65 },
                { name: 'Desktop', value: 30 },
                { name: 'Tablet', value: 5 }
            ];

            setStats({
                totalUsers: usersCount || 0,
                activeUsers: Math.floor((usersCount || 0) * 0.35), // 35% activos
                totalSearches: 1245,
                avgSessionTime: '5:23',
                loading: false
            });

            setTrafficData(last7Days);
            setTopSearches(searches);
            setGeoDistribution(geo);
            setDeviceStats(devices);
        } catch (error) {
            console.error('Error loading analytics:', error);
            setStats(prev => ({ ...prev, loading: false }));
        }
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
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Analytics del Sitio</h1>
                    <p className="text-gray-600 mt-1">Métricas de la plataforma Geobooker</p>
                </div>
                <Link
                    to="/admin/ads"
                    className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
                >
                    📊 Ver Analytics de Ads
                </Link>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <AnalyticsCard
                    title="Usuarios Totales"
                    value={stats.totalUsers.toLocaleString()}
                    icon={Users}
                    color="blue"
                />
                <AnalyticsCard
                    title="Usuarios Activos"
                    value={stats.activeUsers.toLocaleString()}
                    icon={TrendingUp}
                    color="green"
                />
                <AnalyticsCard
                    title="Búsquedas Totales"
                    value={stats.totalSearches.toLocaleString()}
                    icon={Search}
                    color="purple"
                />
                <AnalyticsCard
                    title="Tiempo Promedio"
                    value={stats.avgSessionTime}
                    icon={Globe}
                    color="orange"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Traffic Over Time */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Tráfico Últimos 7 Días</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={trafficData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="users" stroke="#3B82F6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Geographic Distribution */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Distribución Geográfica</h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                            <Pie
                                data={geoDistribution}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {geoDistribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Searches */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Search className="w-5 h-5 text-purple-600" />
                        Búsquedas Más Populares
                    </h3>
                    <div className="space-y-3">
                        {topSearches.map((search, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-sm">
                                        {index + 1}
                                    </span>
                                    <span className="font-medium text-gray-900">{search.term}</span>
                                </div>
                                <span className="text-gray-600 font-semibold">{search.count}</span>
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
                    <div className="space-y-4">
                        {deviceStats.map((device, index) => (
                            <div key={index}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        {device.name === 'Móvil' && <Smartphone className="w-4 h-4 text-gray-600" />}
                                        {device.name === 'Desktop' && <Monitor className="w-4 h-4 text-gray-600" />}
                                        {device.name === 'Tablet' && <Smartphone className="w-4 h-4 text-gray-600" />}
                                        <span className="text-gray-700">{device.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-900">{device.value}%</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${device.value}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnalyticsCard({ title, value, icon: Icon, color }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        orange: 'bg-orange-50 text-orange-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{value}</p>
                </div>
                <div className={`p-3 rounded-full ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
