// src/pages/admin/AdsManagement.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { TrendingUp, DollarSign, Eye, MousePointer, Plus } from 'lucide-react';
import StatsCard from '../../components/admin/StatsCard';

const AdsManagement = () => {
    const [adSpaces, setAdSpaces] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('spaces'); // 'spaces' | 'campaigns'

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            // Cargar espacios publicitarios
            const { data: spacesData, error: spacesError } = await supabase
                .from('ad_spaces')
                .select('*')
                .order('type', { ascending: true });

            if (spacesError) throw spacesError;

            // Cargar campañas activas
            const { data: campaignsData, error: campaignsError } = await supabase
                .from('ad_campaigns')
                .select(`
          *,
          ad_spaces (name, display_name)
        `)
                .eq('status', 'active')
                .order('created_at', { ascending: false });

            if (campaignsError) throw campaignsError;

            setAdSpaces(spacesData || []);
            setCampaigns(campaignsData || []);
            setLoading(false);
        } catch (error) {
            console.error('Error cargando datos:', error);
            setLoading(false);
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
    const totalRevenue = campaigns.reduce((sum, c) => sum + parseFloat(c.budget || 0), 0);
    const totalImpressions = campaigns.reduce((sum, c) => sum + (c.impressions || 0), 0);
    const totalClicks = campaigns.reduce((sum, c) => sum + (c.clicks || 0), 0);
    const avgCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;

    return (
        <div className="space-y-8">
            {/* Título */}
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Geobooker Ads</h1>
                <p className="text-gray-600 mt-2">Sistema de gestión de publicidad</p>
            </div>

            {/* Estadísticas */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Campañas Activas"
                    value={campaigns.length}
                    icon={TrendingUp}
                    color="blue"
                />
                <StatsCard
                    title="Ingresos del Mes"
                    value={`$${totalRevenue.toLocaleString()}`}
                    icon={DollarSign}
                    color="green"
                />
                <StatsCard
                    title="Impresiones Totales"
                    value={totalImpressions.toLocaleString()}
                    icon={Eye}
                    color="purple"
                />
                <StatsCard
                    title="CTR Promedio"
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
                        Campañas Activas
                    </button>
                </nav>
            </div>

            {/* Contenido según tab */}
            {activeTab === 'spaces' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Espacios Disponibles</h2>
                        <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <Plus className="w-4 h-4 mr-2" />
                            Nuevo Espacio
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {adSpaces.map((space) => (
                            <div key={space.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-bold text-gray-900">{space.display_name}</h3>
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${space.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                        }`}>
                                        {space.is_active ? 'Activo' : 'Inactivo'}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm text-gray-600">
                                    <p><span className="font-semibold">Tipo:</span> {space.type}</p>
                                    <p><span className="font-semibold">Desktop:</span> {space.size_desktop}</p>
                                    <p><span className="font-semibold">Mobile:</span> {space.size_mobile}</p>
                                    <p><span className="font-semibold">Precio:</span> ${space.price_monthly}/mes</p>
                                    <p><span className="font-semibold">Slots:</span> {space.max_slots}</p>
                                </div>

                                <p className="text-xs text-gray-500 mt-3">{space.description}</p>

                                <div className="mt-4 flex space-x-2">
                                    <button className="flex-1 bg-blue-50 text-blue-600 px-3 py-2 rounded text-sm hover:bg-blue-100 transition">
                                        Editar
                                    </button>
                                    <button className="flex-1 bg-gray-50 text-gray-600 px-3 py-2 rounded text-sm hover:bg-gray-100 transition">
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
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Campañas Activas</h2>
                        <button className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                            <Plus className="w-4 h-4 mr-2" />
                            Nueva Campaña
                        </button>
                    </div>

                    <div className="bg-white rounded-xl shadow-md overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Anunciante
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Espacio
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ubicación
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Fechas
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Presupuesto
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Performance
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {campaigns.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            No hay campañas activas
                                        </td>
                                    </tr>
                                ) : (
                                    campaigns.map((campaign) => (
                                        <tr key={campaign.id} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{campaign.advertiser_name}</div>
                                                <div className="text-sm text-gray-500">{campaign.advertiser_email}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{campaign.ad_spaces?.display_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                                    {campaign.geographic_scope}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {new Date(campaign.start_date).toLocaleDateString()} - {new Date(campaign.end_date).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                ${parseFloat(campaign.budget).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900">{campaign.impressions} imp.</div>
                                                <div className="text-sm text-gray-500">{campaign.clicks} clicks</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button className="text-blue-600 hover:text-blue-900 mr-3">Ver</button>
                                                <button className="text-gray-600 hover:text-gray-900">Editar</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdsManagement;
