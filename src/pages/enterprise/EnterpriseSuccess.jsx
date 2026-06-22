/**
 * Success page after Enterprise payment completion
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Mail, BarChart3, ShieldCheck, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

const formatCurrency = (amount = 0, currency = 'USD') => {
    try {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    } catch (_error) {
        return `$${Number(amount || 0).toFixed(2)} ${currency}`;
    }
};

export default function EnterpriseSuccess() {
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get('campaign');
    const [campaign, setCampaign] = useState(null);

    useEffect(() => {
        const loadCampaign = async () => {
            if (!campaignId) return;

            const { data } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('id', campaignId)
                .single();

            if (data) {
                setCampaign(data);
            }
        };

        loadCampaign();
    }, [campaignId]);

    const summary = useMemo(() => {
        if (!campaign) return null;
        return {
            amount: formatCurrency(campaign.total_budget || 0, campaign.currency || 'USD'),
            target: (campaign.target_countries || []).join(', ') || 'Global / Multi-country',
            duration: `${campaign.start_date || 'TBD'} -> ${campaign.end_date || 'TBD'}`,
            billing: campaign.billing_country || 'International'
        };
    }, [campaign]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4 py-10">
            <SEO title="Payment Successful - Geobooker Enterprise" />

            <div className="max-w-4xl w-full bg-slate-900/70 border border-slate-700 rounded-3xl p-8 md:p-10 shadow-2xl">
                <div className="text-center mb-8">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                        <CheckCircle className="w-14 h-14 text-green-400" />
                    </div>

                    <h1 className="text-4xl font-bold text-white mb-4">Payment successful</h1>
                    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                        Your enterprise advertising purchase was received correctly and is now in Geobooker review.
                    </p>
                </div>

                {summary && (
                    <div className="grid md:grid-cols-2 gap-5 mb-8">
                        <div className="bg-slate-800/70 border border-slate-700 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-4">Purchase summary</h2>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400">Company</span>
                                    <span className="text-white font-semibold text-right">{campaign.advertiser_name}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400">Investment</span>
                                    <span className="text-emerald-400 font-semibold text-right">{summary.amount}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400">Target market</span>
                                    <span className="text-white font-semibold text-right">{summary.target}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400">Billing country</span>
                                    <span className="text-white font-semibold text-right">{summary.billing}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-gray-400">Duration</span>
                                    <span className="text-white font-semibold text-right">{summary.duration}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-6">
                            <h2 className="font-semibold text-white mb-4">What your purchase includes</h2>
                            <ul className="space-y-2 text-sm text-gray-300">
                                <li>Commercial and editorial review before launch</li>
                                <li>Activation of your campaign once approved</li>
                                <li>Advertiser dashboard with impressions, clicks, CTR and WhatsApp taps</li>
                                <li>Operational follow-up from Geobooker after review</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                        <ShieldCheck className="w-5 h-5 text-blue-400 mb-3" />
                        <h3 className="text-white font-semibold mb-2">1. Review</h3>
                        <p className="text-sm text-gray-400">Our team validates creative, targeting, destination URL and category fit.</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                        <Mail className="w-5 h-5 text-blue-400 mb-3" />
                        <h3 className="text-white font-semibold mb-2">2. Email updates</h3>
                        <p className="text-sm text-gray-400">You will receive status updates by email when the campaign is approved or if adjustments are needed.</p>
                    </div>
                    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                        <BarChart3 className="w-5 h-5 text-blue-400 mb-3" />
                        <h3 className="text-white font-semibold mb-2">3. KPI access</h3>
                        <p className="text-sm text-gray-400">Once active, you can track KPIs from your advertiser dashboard.</p>
                    </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 mb-8 flex items-start gap-3">
                    <Globe className="w-5 h-5 text-amber-300 mt-0.5" />
                    <p className="text-sm text-amber-100">
                        International purchases are handled in USD and the post-payment review applies equally to global campaigns. Tax treatment depends on the billing country captured during checkout.
                    </p>
                </div>

                <div className="space-y-4">
                    <Link
                        to="/advertiser/dashboard"
                        className="block bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 px-6 rounded-xl font-semibold transition-all hover:shadow-lg text-center"
                    >
                        <span className="flex items-center justify-center gap-2">
                            Open advertiser dashboard
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>

                    <Link
                        to="/enterprise"
                        className="block text-gray-400 hover:text-white transition text-center"
                    >
                        Create another enterprise campaign
                    </Link>
                </div>

                <p className="text-gray-500 text-sm mt-8 text-center">
                    Questions? Contact us at{' '}
                    <a href="mailto:hola@geobooker.com.mx" className="text-blue-400 hover:underline">
                        hola@geobooker.com.mx
                    </a>
                </p>
            </div>
        </div>
    );
}
