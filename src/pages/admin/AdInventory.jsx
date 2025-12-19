// src/pages/admin/AdInventory.jsx
/**
 * Enterprise Ad Inventory Dashboard
 * Shows: Slot availability, Calendar view, Campaign metrics, Revenue tracking
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Globe, MapPin, Calendar, TrendingUp, DollarSign,
    BarChart3, Eye, MousePointer, Percent, Download,
    ChevronDown, ChevronRight, AlertCircle, CheckCircle,
    Filter, RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdInventory() {
    const [loading, setLoading] = useState(true);
    const [inventory, setInventory] = useState([]);
    const [campaigns, setCampaigns] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [selectedPeriod, setSelectedPeriod] = useState('month');
    const [expandedLevels, setExpandedLevels] = useState(['global', 'region']);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Load inventory status
            const { data: invData, error: invError } = await supabase.rpc('get_ad_inventory_status');
            if (invError) throw invError;
            setInventory(invData || []);

            // Load active/recent campaigns
            const { data: campData, error: campError } = await supabase
                .from('ad_campaigns')
                .select('*')
                .in('status', ['active', 'pending_review', 'draft'])
                .order('created_at', { ascending: false })
                .limit(50);
            if (!campError) setCampaigns(campData || []);

            // Calculate aggregate metrics
            calculateMetrics(campData || []);

        } catch (error) {
            console.error('Error loading inventory:', error);
            toast.error('Error loading inventory data');
        } finally {
            setLoading(false);
        }
    };

    const calculateMetrics = (camps) => {
        const active = camps.filter(c => c.status === 'active');
        const pending = camps.filter(c => c.status === 'pending_review');
        const totalRevenue = camps.reduce((sum, c) => sum + (parseFloat(c.total_budget) || 0), 0);

        setMetrics({
            totalCampaigns: camps.length,
            activeCampaigns: active.length,
            pendingReview: pending.length,
            totalRevenue,
            avgCampaignValue: camps.length > 0 ? totalRevenue / camps.length : 0
        });
    };

    const getSlotStatus = (available, max) => {
        const ratio = available / max;
        if (ratio === 0) return { color: 'text-red-400', bg: 'bg-red-500/20', label: 'FULL' };
        if (ratio <= 0.3) return { color: 'text-yellow-400', bg: 'bg-yellow-500/20', label: 'LOW' };
        return { color: 'text-green-400', bg: 'bg-green-500/20', label: 'OK' };
    };

    const groupedInventory = inventory.reduce((acc, item) => {
        if (!acc[item.level]) acc[item.level] = [];
        acc[item.level].push(item);
        return acc;
    }, {});

    const toggleLevel = (level) => {
        setExpandedLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const levelIcons = {
        global: <Globe className="w-5 h-5" />,
        region: <MapPin className="w-5 h-5" />,
        country: <MapPin className="w-5 h-5" />,
        city: <MapPin className="w-5 h-5" />
    };

    const levelColors = {
        global: 'from-purple-500 to-blue-500',
        region: 'from-blue-500 to-cyan-500',
        country: 'from-cyan-500 to-green-500',
        city: 'from-green-500 to-emerald-500'
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                            <BarChart3 className="w-8 h-8 text-blue-400" />
                            Enterprise Ad Inventory
                        </h1>
                        <p className="text-gray-400 mt-1">Manage slots, track availability, and monitor performance</p>
                    </div>
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Quick Stats */}
                {metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <Calendar className="w-4 h-4" />
                                Total Campaigns
                            </div>
                            <div className="text-2xl font-bold text-white">{metrics.totalCampaigns}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <CheckCircle className="w-4 h-4 text-green-400" />
                                Active
                            </div>
                            <div className="text-2xl font-bold text-green-400">{metrics.activeCampaigns}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                Pending Review
                            </div>
                            <div className="text-2xl font-bold text-yellow-400">{metrics.pendingReview}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <DollarSign className="w-4 h-4 text-emerald-400" />
                                Total Revenue
                            </div>
                            <div className="text-2xl font-bold text-emerald-400">{formatCurrency(metrics.totalRevenue)}</div>
                        </div>
                        <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
                                <TrendingUp className="w-4 h-4 text-blue-400" />
                                Avg. Campaign
                            </div>
                            <div className="text-2xl font-bold text-blue-400">{formatCurrency(metrics.avgCampaignValue)}</div>
                        </div>
                    </div>
                )}

                {/* Inventory Grid */}
                <div className="grid lg:grid-cols-2 gap-6">
                    {/* Slot Availability */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-400" />
                            Slot Availability
                        </h2>

                        <div className="space-y-4">
                            {['global', 'region', 'country', 'city'].map(level => (
                                <div key={level} className="border border-gray-700 rounded-lg overflow-hidden">
                                    <button
                                        onClick={() => toggleLevel(level)}
                                        className={`w-full flex items-center justify-between p-4 bg-gradient-to-r ${levelColors[level]} bg-opacity-20`}
                                    >
                                        <div className="flex items-center gap-3">
                                            {levelIcons[level]}
                                            <span className="font-semibold text-white capitalize">{level}</span>
                                            <span className="text-sm text-gray-300">
                                                ({groupedInventory[level]?.length || 0} locations)
                                            </span>
                                        </div>
                                        {expandedLevels.includes(level)
                                            ? <ChevronDown className="w-5 h-5 text-white" />
                                            : <ChevronRight className="w-5 h-5 text-white" />
                                        }
                                    </button>

                                    {expandedLevels.includes(level) && (
                                        <div className="p-4 space-y-2 bg-gray-900/50">
                                            {(groupedInventory[level] || []).map(slot => {
                                                const status = getSlotStatus(Number(slot.available_slots), slot.max_slots);
                                                return (
                                                    <div key={slot.location_code || 'global'} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                                                        <div>
                                                            <div className="text-white font-medium">{slot.location_name}</div>
                                                            <div className="text-gray-400 text-sm">{formatCurrency(slot.price_usd)}/month</div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-right">
                                                                <div className={`font-bold ${status.color}`}>
                                                                    {Number(slot.available_slots)}/{slot.max_slots}
                                                                </div>
                                                                <div className="text-xs text-gray-500">available</div>
                                                            </div>
                                                            <span className={`px-2 py-1 rounded text-xs font-bold ${status.bg} ${status.color}`}>
                                                                {status.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Campaigns */}
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-green-400" />
                            Recent Campaigns
                        </h2>

                        <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {campaigns.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">
                                    No campaigns yet
                                </div>
                            ) : (
                                campaigns.map(campaign => (
                                    <div key={campaign.id} className="flex items-center justify-between p-4 bg-gray-900 rounded-lg hover:bg-gray-900/80 transition">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">{campaign.advertiser_name || 'Unknown'}</span>
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${campaign.status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                        campaign.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' :
                                                            'bg-gray-500/20 text-gray-400'
                                                    }`}>
                                                    {campaign.status}
                                                </span>
                                            </div>
                                            <div className="text-sm text-gray-400 mt-1">
                                                {campaign.target_cities?.join(', ') || campaign.target_countries?.join(', ') || 'Not specified'}
                                            </div>
                                            <div className="text-xs text-gray-500 mt-1">
                                                {campaign.start_date} → {campaign.end_date || 'Ongoing'}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-emerald-400">
                                                {formatCurrency(campaign.total_budget || 0)}
                                            </div>
                                            <div className="text-xs text-gray-500">{campaign.currency || 'USD'}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Calendar View (Simple) */}
                <div className="mt-6 bg-gray-800 border border-gray-700 rounded-xl p-6">
                    <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-400" />
                        Campaign Calendar
                    </h2>

                    <div className="overflow-x-auto">
                        <div className="min-w-[800px]">
                            {/* Timeline Header */}
                            <div className="flex border-b border-gray-700 pb-2 mb-4">
                                <div className="w-48 text-gray-400 text-sm">Campaign</div>
                                <div className="flex-1 flex">
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <div key={i} className="flex-1 text-center text-gray-500 text-xs">
                                            {new Date(2025, i, 1).toLocaleDateString('en', { month: 'short' })}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Campaign Bars */}
                            {campaigns.filter(c => c.start_date).slice(0, 10).map(campaign => {
                                const start = new Date(campaign.start_date);
                                const end = campaign.end_date ? new Date(campaign.end_date) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
                                const startMonth = start.getMonth();
                                const duration = Math.ceil((end - start) / (30 * 24 * 60 * 60 * 1000));

                                return (
                                    <div key={campaign.id} className="flex items-center py-2">
                                        <div className="w-48 text-white text-sm truncate pr-4">
                                            {campaign.advertiser_name}
                                        </div>
                                        <div className="flex-1 flex relative h-6">
                                            <div
                                                className={`absolute h-full rounded ${campaign.status === 'active' ? 'bg-green-500' :
                                                        campaign.status === 'pending_review' ? 'bg-yellow-500' :
                                                            'bg-blue-500'
                                                    }`}
                                                style={{
                                                    left: `${(startMonth / 12) * 100}%`,
                                                    width: `${Math.min(duration, 12 - startMonth) / 12 * 100}%`
                                                }}
                                                title={`${campaign.advertiser_name}: ${campaign.start_date} - ${campaign.end_date || 'Ongoing'}`}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Export Section */}
                <div className="mt-6 flex justify-end gap-4">
                    <button className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                        <Download className="w-4 h-4" />
                        Export Inventory CSV
                    </button>
                </div>
            </div>
        </div>
    );
}
