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
import CampaignReportButton from '../../components/ads/CampaignReportButton';
import InsightsPanel from '../../components/enterprise/InsightsPanel';
import ShareOfVoiceWidget from '../../components/enterprise/ShareOfVoiceWidget';


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
        activeCampaigns: 0,
        totalWhatsappTaps: 0,
        avgCpc: 0,
        estimatedConversions: 0,
        totalBudget: 0
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
            let totalWhatsappTaps = 0;
            let totalBudget = 0;

            // Load metrics for each campaign
            for (const campaign of data || []) {
                totalBudget += (campaign.total_budget || 0);

                const { data: metrics } = await supabase
                    .from('ad_campaign_metrics')
                    .select('impressions, clicks, whatsapp_taps')
                    .eq('campaign_id', campaign.id);

                if (metrics) {
                    totalImpressions += metrics.reduce((sum, m) => sum + (m.impressions || 0), 0);
                    totalClicks += metrics.reduce((sum, m) => sum + (m.clicks || 0), 0);
                    totalWhatsappTaps += metrics.reduce((sum, m) => sum + (m.whatsapp_taps || 0), 0);
                }
            }

            const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0;
            const avgCpc = totalClicks > 0 && totalBudget > 0 ? (totalBudget / totalClicks).toFixed(2) : 0;
            // Estimación: 3-5% de los clics se convierten
            const estimatedConversions = Math.round(totalClicks * 0.04);

            setStats({
                totalImpressions,
                totalClicks,
                avgCtr,
                activeCampaigns: active,
                totalWhatsappTaps,
                avgCpc,
                estimatedConversions,
                totalBudget
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
                {/* Stats Cards - Row 1: Core Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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

                {/* Stats Cards - Row 2: Additional KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <div className="bg-gradient-to-br from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-green-300 text-sm mb-2">
                            <span className="text-base">📱</span>
                            WhatsApp Taps
                        </div>
                        <div className="text-3xl font-bold text-green-400">{formatNumber(stats.totalWhatsappTaps)}</div>
                        <p className="text-xs text-green-400/60 mt-1">Taps a botón de WhatsApp</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-blue-300 text-sm mb-2">
                            <span className="text-base">💰</span>
                            Avg. CPC
                        </div>
                        <div className="text-3xl font-bold text-blue-400">${stats.avgCpc}</div>
                        <p className="text-xs text-blue-400/60 mt-1">Cost Per Click (USD)</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-purple-300 text-sm mb-2">
                            <span className="text-base">🎯</span>
                            Est. Conversions
                        </div>
                        <div className="text-3xl font-bold text-purple-400">{formatNumber(stats.estimatedConversions)}</div>
                        <p className="text-xs text-purple-400/60 mt-1">~4% conversion rate</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-900/50 to-amber-800/30 border border-amber-700/50 rounded-xl p-5">
                        <div className="flex items-center gap-2 text-amber-300 text-sm mb-2">
                            <span className="text-base">💳</span>
                            Total Budget
                        </div>
                        <div className="text-3xl font-bold text-amber-400">${formatNumber(stats.totalBudget)}</div>
                        <p className="text-xs text-amber-400/60 mt-1">Total invested</p>
                    </div>
                </div>

                {/* Insights Panel - NEW */}
                <div className="mb-8">
                    <InsightsPanel campaigns={campaigns} stats={stats} />
                </div>

                {/* Share of Voice - NEW (show for first active campaign) */}
                {campaigns.filter(c => c.status === 'active').length > 0 && (
                    <div className="mb-8">
                        <ShareOfVoiceWidget campaignId={campaigns.find(c => c.status === 'active')?.id} />
                    </div>
                )}

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
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[900px]">
                                <thead className="bg-gray-900/50">
                                    <tr className="text-left text-gray-400 text-sm border-b border-gray-700">
                                        <th className="p-4 font-medium">Campaign</th>
                                        <th className="p-4 font-medium">Status</th>
                                        <th className="p-4 font-medium">Plan</th>
                                        <th className="p-4 font-medium">Target</th>
                                        <th className="p-4 font-medium">Duration</th>
                                        <th className="p-4 font-medium">Budget</th>
                                        <th className="p-4 font-medium">Payment</th>
                                        <th className="p-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {campaigns.map(campaign => (
                                        <tr key={campaign.id} className="hover:bg-gray-700/30 transition">
                                            {/* Campaign Name */}
                                            <td className="p-4">
                                                <div className="font-bold text-white">
                                                    {campaign.advertiser_name || 'Untitled'}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {campaign.headline || 'No headline'}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(campaign.status)}`}>
                                                    {getStatusLabel(campaign.status)}
                                                </span>
                                            </td>

                                            {/* Plan Type */}
                                            <td className="p-4">
                                                <div className="text-white text-sm">
                                                    {campaign.ad_level === 'global' ? '🌍 Enterprise' :
                                                     campaign.ad_level === 'regional' ? '🏢 Regional' :
                                                     campaign.campaign_type === 'local' ? '📍 Local' : '📍 ' + (campaign.campaign_type || 'Standard')}
                                                </div>
                                            </td>

                                            {/* Target */}
                                            <td className="p-4">
                                                <div className="text-white text-sm">
                                                    {campaign.target_countries?.length || 0} countries
                                                </div>
                                                <div className="text-gray-400 text-xs">
                                                    {campaign.target_cities?.length || 0} cities
                                                </div>
                                            </td>

                                            {/* Duration */}
                                            <td className="p-4">
                                                <div className="text-white text-sm whitespace-nowrap">
                                                    {campaign.start_date || 'TBD'}
                                                </div>
                                                <div className="text-gray-400 text-xs whitespace-nowrap">
                                                    → {campaign.end_date || 'Ongoing'}
                                                </div>
                                            </td>

                                            {/* Budget */}
                                            <td className="p-4">
                                                <div className="text-green-400 font-bold whitespace-nowrap">
                                                    ${campaign.total_budget?.toLocaleString() || 0}
                                                </div>
                                                <div className="text-gray-500 text-xs">{campaign.currency || 'USD'}</div>
                                            </td>

                                            {/* Payment Method */}
                                            <td className="p-4">
                                                <div className="text-white text-sm">
                                                    {campaign.payment_method === 'oxxo' ? '🏧 OXXO' :
                                                     campaign.payment_status === 'paid' ? '💳 Card' :
                                                     campaign.payment_status === 'pending' ? '⏳ Pending' : '—'}
                                                </div>
                                                <div className={`text-xs mt-0.5 ${campaign.payment_status === 'paid' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {campaign.payment_status === 'paid' ? '✅ Paid' : campaign.payment_status || ''}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="p-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Edit Button - Only for draft/pending campaigns */}
                                                    {['draft', 'pending_review', 'paused'].includes(campaign.status) && (
                                                        <a
                                                            href={`/enterprise/edit/${campaign.id}`}
                                                            className="flex items-center gap-1 bg-yellow-600 text-white px-3 py-1.5 rounded-lg hover:bg-yellow-500 text-xs font-medium"
                                                        >
                                                            ✏️ Edit
                                                        </a>
                                                    )}

                                                    {/* View Report */}
                                                    <button
                                                        onClick={() => {
                                                            setSelectedCampaign(campaign.id);
                                                            setShowReport(true);
                                                        }}
                                                        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 text-xs font-medium"
                                                    >
                                                        <BarChart3 className="w-3 h-3" />
                                                        Report
                                                    </button>

                                                    {/* PDF Download - Nuevo componente */}
                                                    <CampaignReportButton
                                                        campaignId={campaign.id}
                                                        campaignName={campaign.advertiser_name}
                                                        variant="icon"
                                                        className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
