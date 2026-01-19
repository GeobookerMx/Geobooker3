// src/pages/admin/ReferralManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Users,
    Gift,
    Trophy,
    Search,
    Filter,
    ArrowUpRight,
    TrendingUp,
    Star,
    CheckCircle,
    Clock,
    ChevronRight,
    Copy,
    ExternalLink,
    ShoppingBag,
    Rocket
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ReferralManagement() {
    const [referrals, setReferrals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [stats, setStats] = useState({
        total: 0,
        converted: 0,
        pointsAwarded: 0,
        topReferrer: null
    });
    const [filterStatus, setFilterStatus] = useState('all');
    const [activeTab, setActiveTab] = useState('referrals'); // 'referrals', 'rewards', 'campaigns'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Cargar los referidos base
            const { data: referralsData, error: referralsError } = await supabase
                .from('referrals')
                .select('*')
                .order('created_at', { ascending: false });

            if (referralsError) throw referralsError;

            // Obtener IDs únicos de todos los involucrados para cargar perfiles en una sola ráfaga
            const userIds = [...new Set([
                ...(referralsData || []).map(r => r.referrer_id),
                ...(referralsData || []).map(r => r.referred_id)
            ])].filter(Boolean);

            const { data: profiles, error: profilesError } = await supabase
                .from('user_profiles')
                .select('id, full_name, email, referral_code')
                .in('id', userIds);

            if (profilesError) throw profilesError;

            // Crear mapa de perfiles para acceso rápido
            const profileMap = (profiles || []).reduce((acc, p) => ({ ...acc, [p.id]: p }), {});

            // Enriquecer datos de referidos
            const enrichedReferrals = (referralsData || []).map(ref => ({
                ...ref,
                referrer: profileMap[ref.referrer_id],
                referred: profileMap[ref.referred_id]
            }));

            setReferrals(enrichedReferrals);

            // Calcular estadísticas
            const converted = enrichedReferrals.filter(r => r.status === 'business_added').length;

            // Obtener top referrer
            const referrerCounts = {};
            enrichedReferrals.forEach(r => {
                const name = r.referrer?.full_name || 'Desconocido';
                referrerCounts[name] = (referrerCounts[name] || 0) + 1;
            });

            let topName = 'N/A';
            let topCount = 0;
            Object.entries(referrerCounts).forEach(([name, count]) => {
                if (count > topCount) {
                    topCount = count;
                    topName = name;
                }
            });

            setStats({
                total: enrichedReferrals.length,
                converted,
                pointsAwarded: enrichedReferrals.reduce((acc, curr) => acc + (curr.reward_given ? 1 : 0), 0),
                topReferrer: { name: topName, count: topCount }
            });

        } catch (error) {
            console.error('Error loading referrals:', error);
            toast.error('Error al cargar datos de referidos');
        } finally {
            setLoading(false);
        }
    };

    const filteredReferrals = referrals.filter(ref => {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
            ref.referrer?.full_name?.toLowerCase().includes(searchLower) ||
            ref.referrer?.email?.toLowerCase().includes(searchLower) ||
            ref.referred?.full_name?.toLowerCase().includes(searchLower) ||
            ref.referred?.email?.toLowerCase().includes(searchLower);

        const matchesFilter =
            filterStatus === 'all' ? true :
                filterStatus === 'business_added' ? ref.status === 'business_added' :
                    filterStatus === 'registered' ? ref.status === 'registered' : true;

        return matchesSearch && matchesFilter;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Programa de Referidos</h1>
                <p className="text-gray-600 mt-1">Gestión y monitoreo del crecimiento orgánico</p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-8">
                    <button
                        onClick={() => setActiveTab('referrals')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'referrals'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            Referidos
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('rewards')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rewards'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5" />
                            Tienda de Premios
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('campaigns')}
                        className={`pb-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'campaigns'
                            ? 'border-purple-600 text-purple-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <Rocket className="w-5 h-5" />
                            Campañas Activas
                        </div>
                    </button>
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'referrals' && (
                <>
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard
                            title="Total Invitados"
                            value={stats.total}
                            icon={Users}
                            color="blue"
                        />
                        <StatCard
                            title="Convertidos (Negocio)"
                            value={stats.converted}
                            icon={CheckCircle}
                            color="green"
                            subtitle={`${((stats.converted / stats.total) * 100 || 0).toFixed(1)}% conversión`}
                        />
                        <StatCard
                            title="Premios Otorgados"
                            value={stats.pointsAwarded}
                            icon={Gift}
                            color="purple"
                        />
                        <StatCard
                            title="Top Referidor"
                            value={stats.topReferrer?.count || 0}
                            icon={Trophy}
                            color="yellow"
                            subtitle={stats.topReferrer?.name || 'N/A'}
                        />
                    </div>

                    {/* Filters */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Buscar por referidor o invitado..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                            >
                                <option value="all">Todos los estados</option>
                                <option value="business_added">Negocio Agregado (Convertido)</option>
                                <option value="registered">Solo Registro</option>
                            </select>
                        </div>
                    </div>

                    {/* Referrals Table */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Referidor (Quién invita)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invitado (Quién llega)</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recompensa</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredReferrals.map((ref) => (
                                        <tr key={ref.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-bold">
                                                        {ref.referrer?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{ref.referrer?.full_name || 'Desconocido'}</div>
                                                        <div className="text-xs text-gray-500">{ref.referrer?.email}</div>
                                                        <div className="text-xs font-mono text-purple-600 bg-purple-50 inline-block px-1 rounded mt-1">
                                                            Code: {ref.referrer?.referral_code}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                                                        {ref.referred?.full_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">{ref.referred?.full_name || 'Nuevo Usuario'}</div>
                                                        <div className="text-xs text-gray-500">{ref.referred?.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {ref.status === 'business_added' ? (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                        Convertido
                                                    </span>
                                                ) : (
                                                    <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                                                        Registrado
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(ref.created_at).toLocaleDateString('es-MX')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {ref.reward_given ? (
                                                    <span className="flex items-center text-purple-600">
                                                        <Gift className="w-4 h-4 mr-1" /> Otorgada
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">Pendiente</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredReferrals.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-10 text-center text-gray-500 italic">
                                                No se encontraron registros de referidos
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <h3 className="text-lg font-bold text-blue-800 mb-2 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5" /> ¿Cómo escalar el programa?
                        </h3>
                        <p className="text-blue-700 text-sm mb-4">
                            El sistema de referidos es el motor de crecimiento orgánico de Geobooker.
                            Actualmente, los usuarios ganan puntos por cada conversión (negocio agregado).
                        </p>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div className="bg-white/50 p-3 rounded-lg border border-blue-100">
                                <p className="font-bold text-blue-900 text-xs mb-1">Costo de Adquisición</p>
                                <p className="text-blue-800 text-sm font-medium">$0.00 (Orgánico)</p>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg border border-blue-100">
                                <p className="font-bold text-blue-900 text-xs mb-1">Incentivo Actual</p>
                                <p className="text-blue-800 text-sm font-medium">Días Premium / Puntos</p>
                            </div>
                            <div className="bg-white/50 p-3 rounded-lg border border-blue-100">
                                <p className="font-bold text-blue-900 text-xs mb-1">Próximo Paso</p>
                                <p className="text-blue-800 text-sm font-medium">Bounty en Efectivo / Ads Gratuitas</p>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Tab: Tienda de Premios */}
            {activeTab === 'rewards' && (
                <div className="space-y-6">
                    {/* Catálogo de Premios */}
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h3 className="text-xl font-bold text-gray-900 mb-4">🛍️ Catálogo de Premios Canjeables</h3>
                        <p className="text-gray-600 mb-6">
                            Los usuarios pueden canjear sus puntos de referidos por estos premios de publicidad:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {[
                                { name: 'Anuncio Básico', points: 3, duration: '7 días', color: 'blue', icon: '🎯' },
                                { name: 'Segmentado por Ciudad', points: 5, duration: '14 días', color: 'green', icon: '📍' },
                                { name: 'Resultado Patrocinado', points: 10, duration: '30 días', color: 'purple', icon: '⭐' },
                                { name: 'Slot Premium', points: 20, duration: '60 días', color: 'yellow', icon: '👑' },
                                { name: 'Campaña VIP', points: 50, duration: '180 días', color: 'red', icon: '🚀' },
                            ].map((reward) => (
                                <div key={reward.name} className={`border-2 border-${reward.color}-200 rounded-xl p-4 bg-${reward.color}-50`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-2xl">{reward.icon}</span>
                                        <span className={`text-xl font-bold text-${reward.color}-600`}>{reward.points} pts</span>
                                    </div>
                                    <h4 className="font-bold text-gray-800">{reward.name}</h4>
                                    <p className="text-sm text-gray-600">{reward.duration} de campaña</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Explicación del Sistema */}
                    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
                        <h3 className="font-bold text-purple-900 mb-3">💡 ¿Cómo ganan puntos los usuarios?</h3>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                            <div className="bg-white rounded-lg p-4 text-center">
                                <p className="text-3xl mb-2">📤</p>
                                <p className="font-medium text-gray-800">Comparten su código</p>
                                <p className="text-gray-500 text-xs">Código único por usuario</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 text-center">
                                <p className="text-3xl mb-2">👤</p>
                                <p className="font-medium text-gray-800">Alguien se registra</p>
                                <p className="text-green-600 font-bold">+0.5 puntos</p>
                            </div>
                            <div className="bg-white rounded-lg p-4 text-center">
                                <p className="text-3xl mb-2">🏪</p>
                                <p className="font-medium text-gray-800">Agrega un negocio</p>
                                <p className="text-yellow-600 font-bold">+0.5 puntos</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tab: Campañas Activas */}
            {activeTab === 'campaigns' && (
                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6 text-center">
                        <Rocket className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Campañas de Referidos</h3>
                        <p className="text-gray-500 mb-4">
                            Aquí podrás crear campañas especiales con bonos extra para incentivar referidos.
                        </p>
                        <p className="text-sm text-gray-400">
                            Ej: "Refiere 5 amigos este mes y gana 1 mes Premium gratis"
                        </p>
                        <button className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition">
                            🚀 Crear Primera Campaña
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StatCard({ title, value, icon: Icon, color, subtitle }) {
    const colors = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600',
        yellow: 'bg-yellow-50 text-yellow-600',
    };

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
            <div className="flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-3xl font-bold text-gray-900">{value}</p>
                        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
                    </div>
                </div>
                <div className={`p-3 rounded-full ${colors[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
}
