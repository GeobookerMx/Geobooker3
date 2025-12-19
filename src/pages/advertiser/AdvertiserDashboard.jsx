// src/pages/advertiser/AdvertiserDashboard.jsx
/**
 * Dashboard for Enterprise Advertisers
 * Shows: Campaign metrics, performance, PDF export
 * Access: /advertiser/dashboard (authenticated advertisers)
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
    BarChart3, Eye, MousePointer, Percent, Calendar,
    Download, TrendingUp, RefreshCw, ChevronRight,
    FileText, Clock, MapPin, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import CampaignReport from '../../components/enterprise/CampaignReport';

export default function AdvertiserDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [campaigns, setCampaigns] = useState([]);
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showReport, setShowReport] = useState(false);
    const [stats, setStats] = useState({
        totalImpressions: 0,
        totalClicks: 0,
        avgCtr: 0,
        activeCampaigns: 0
    });

    useEffect(() => {
        if (user?.email) loadCampaigns();
    }, [user]);

    const loadCampaigns = async () => {
        setLoading(true);
        try {
            // Get campaigns for this advertiser
            const { data, error } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('advertiser_email', user.email)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCampaigns(data || []);

            // Calculate aggregate stats
            const active = (data || []).filter(c => c.status === 'active').length;
            let totalImpressions = 0;
            let totalClicks = 0;

            // Load metrics for each campaign
            for (const campaign of data || []) {
                const { data: metrics } = await supabase
                    .from('ad_campaign_metrics')
                    .select('impressions, clicks')
                    .eq('campaign_id', campaign.id);

                if (metrics) {
                    totalImpressions += metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
                    totalClicks += metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
                }
            }

            setStats({
                totalImpressions,
                totalClicks,
                avgCtr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0,
                activeCampaigns: active
            });

        } catch (error) {
            console.error('Error loading campaigns:', error);
            toast.error('Error loading your campaigns');
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'active': return 'bg-green-500/20 text-green-400';
            case 'pending_review': return 'bg-yellow-500/20 text-yellow-400';
            case 'draft': return 'bg-gray-500/20 text-gray-400';
            case 'paused': return 'bg-orange-500/20 text-orange-400';
            case 'completed': return 'bg-blue-500/20 text-blue-400';
            default: return 'bg-gray-500/20 text-gray-400';
        }
    };

    const getStatusLabel = (status) => {
        switch (status) {
            case 'active': return '🟢 Active';
            case 'pending_review': return '🟡 Pending Review';
            case 'draft': return '⚪ Draft';
            case 'paused': return '🟠 Paused';
            case 'completed': return '🔵 Completed';
            default: return status;
        }
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
                    <h2 className="text-xl text-white mb-2">Login Required</h2>
                    <p className="text-gray-400">Please login to view your campaigns</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-12">
                <div className="container mx-auto px-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-white">📊 Advertiser Dashboard</h1>
                            <p className="text-blue-100 mt-1">Welcome back, {user.email}</p>
                        </div>
                        <button
                            onClick={loadCampaigns}
                            className="flex items-center gap-2 bg-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/30"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Eye className="w-4 h-4" />
                            Total Impressions
                        </div>
                        <div className="text-3xl font-bold text-white">{formatNumber(stats.totalImpressions)}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <MousePointer className="w-4 h-4" />
                            Total Clicks
                        </div>
                        <div className="text-3xl font-bold text-white">{formatNumber(stats.totalClicks)}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Percent className="w-4 h-4" />
                            Avg. CTR
                        </div>
                        <div className="text-3xl font-bold text-white">{stats.avgCtr}%</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <TrendingUp className="w-4 h-4" />
                            Active Campaigns
                        </div>
                        <div className="text-3xl font-bold text-green-400">{stats.activeCampaigns}</div>
                    </div>
                </div>

                {/* Campaigns List */}
                <div className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden">
                    <div className="p-6 border-b border-gray-700">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-blue-400" />
                            Your Campaigns
                        </h2>
                    </div>

                    {campaigns.length === 0 ? (
                        <div className="p-12 text-center">
                            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <h3 className="text-lg text-white mb-2">No campaigns yet</h3>
                            <p className="text-gray-400 mb-4">Create your first Enterprise ad campaign</p>
                            <a
                                href="/enterprise/checkout"
                                className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                            >
                                Create Campaign
                                <ChevronRight className="w-4 h-4" />
                            </a>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-700">
                            {campaigns.map(campaign => (
                                <div key={campaign.id} className="p-6 hover:bg-gray-700/50 transition">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-white text-lg">
                                                    {campaign.advertiser_name || 'Untitled Campaign'}
                                                </h3>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(campaign.status)}`}>
                                                    {getStatusLabel(campaign.status)}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-3 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-4 h-4" />
                                                    {campaign.target_cities?.length || 0} cities
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-4 h-4" />
                                                    {campaign.start_date} → {campaign.end_date || 'Ongoing'}
                                                </span>
                                                <span className="text-green-400 font-medium">
                                                    ${campaign.total_budget?.toLocaleString() || 0} USD
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedCampaign(campaign.id);
                                                    setShowReport(true);
                                                }}
                                                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                                            >
                                                <BarChart3 className="w-4 h-4" />
                                                View Report
                                            </button>
                                            <button
                                                onClick={() => window.print()}
                                                className="flex items-center gap-2 bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                                            >
                                                <Download className="w-4 h-4" />
                                                PDF
                                            </button>
                                        </div>
                                    </div>

                                    {/* Preview of the ad */}
                                    {campaign.creative_url && (
                                        <div className="mt-4 flex items-center gap-4">
                                            {campaign.creative_url.match(/\.(mp4|webm)$/i) ? (
                                                <video
                                                    src={campaign.creative_url}
                                                    className="w-24 h-16 object-cover rounded"
                                                    muted
                                                />
                                            ) : (
                                                <img
                                                    src={campaign.creative_url}
                                                    alt="Ad preview"
                                                    className="w-24 h-16 object-cover rounded"
                                                />
                                            )}
                                            <div className="text-sm">
                                                <p className="text-white font-medium">{campaign.headline}</p>
                                                <p className="text-gray-400 truncate max-w-md">{campaign.description}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Help Section */}
                <div className="mt-8 bg-gradient-to-r from-gray-800 to-gray-700 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-white mb-2">Need Help?</h3>
                    <p className="text-gray-400 mb-4">
                        Contact our Enterprise support team for campaign optimization, creative assistance, or any questions.
                    </p>
                    <a
                        href="mailto:enterprise@geobooker.com.mx"
                        className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300"
                    >
                        enterprise@geobooker.com.mx
                        <ChevronRight className="w-4 h-4" />
                    </a>
                </div>
            </div>

            {/* Report Modal */}
            {showReport && selectedCampaign && (
                <CampaignReport
                    campaignId={selectedCampaign}
                    onClose={() => {
                        setShowReport(false);
                        setSelectedCampaign(null);
                    }}
                />
            )}
        </div>
    );
}
