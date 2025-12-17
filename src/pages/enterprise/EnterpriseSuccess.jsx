// src/pages/enterprise/EnterpriseSuccess.jsx
/**
 * Success page after Enterprise payment completion
 */
import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Mail, Calendar, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import SEO from '../../components/SEO';

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
                // Update campaign status to paid
                await supabase
                    .from('ad_campaigns')
                    .update({ status: 'pending_review' })
                    .eq('id', campaignId);
            }
        };

        loadCampaign();
    }, [campaignId]);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center px-4">
            <SEO title="Payment Successful - Geobooker Enterprise" />

            <div className="max-w-lg text-center">
                {/* Success Icon */}
                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
                    <CheckCircle className="w-14 h-14 text-green-400" />
                </div>

                <h1 className="text-4xl font-bold text-white mb-4">
                    Payment Successful!
                </h1>

                <p className="text-xl text-gray-300 mb-8">
                    Thank you for choosing Geobooker for your global advertising campaign.
                </p>

                {/* Campaign Details */}
                {campaign && (
                    <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-8 text-left">
                        <h3 className="font-semibold text-white mb-4">Campaign Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Company</span>
                                <span className="text-white">{campaign.advertiser_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Amount Paid</span>
                                <span className="text-green-400 font-semibold">
                                    ${campaign.total_budget} {campaign.currency}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Status</span>
                                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded text-sm">
                                    Pending Review
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Next Steps */}
                <div className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-6 mb-8">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <Mail className="w-5 h-5 text-blue-400" />
                        What happens next?
                    </h3>
                    <ul className="text-left text-gray-300 space-y-3 text-sm">
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">1.</span>
                            Our team will review your campaign within 24-48 hours
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">2.</span>
                            You'll receive a confirmation email with your invoice
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">3.</span>
                            Once approved, your ads will go live on the scheduled date
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-blue-400">4.</span>
                            Access your performance dashboard to track results
                        </li>
                    </ul>
                </div>

                {/* Actions */}
                <div className="space-y-4">
                    <Link
                        to="/enterprise"
                        className="block bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 px-6 rounded-xl font-semibold transition-all hover:shadow-lg"
                    >
                        <span className="flex items-center justify-center gap-2">
                            Create Another Campaign
                            <ArrowRight className="w-4 h-4" />
                        </span>
                    </Link>

                    <Link
                        to="/"
                        className="block text-gray-400 hover:text-white transition"
                    >
                        Return to Homepage
                    </Link>
                </div>

                {/* Contact */}
                <p className="text-gray-500 text-sm mt-8">
                    Questions? Contact us at{' '}
                    <a href="mailto:ventasgeobooker@gmail.com" className="text-blue-400 hover:underline">
                        ventasgeobooker@gmail.com
                    </a>
                </p>
            </div>
        </div>
    );
}
