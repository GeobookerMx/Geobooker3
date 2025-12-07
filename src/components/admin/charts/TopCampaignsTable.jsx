// src/components/admin/charts/TopCampaignsTable.jsx
import React from 'react';
import { TrendingUp, Eye, MousePointer } from 'lucide-react';

export default function TopCampaignsTable({ campaigns }) {
    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Top 5 Campañas con Mejor CTR
            </h3>

            {campaigns.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                    No hay datos de campañas todavía
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b bg-gray-50">
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                                    Campaña
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                    <Eye className="w-4 h-4 inline mr-1" />
                                    Impresiones
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                    <MousePointer className="w-4 h-4 inline mr-1" />
                                    Clics
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">
                                    CTR
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {campaigns.map((campaign, index) => {
                                const ctr = campaign.impressions > 0
                                    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(2)
                                    : 0;

                                return (
                                    <tr key={campaign.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                        index === 1 ? 'bg-gray-100 text-gray-700' :
                                                            index === 2 ? 'bg-orange-100 text-orange-700' :
                                                                'bg-blue-50 text-blue-600'
                                                    }`}>
                                                    {index + 1}
                                                </span>
                                                <div>
                                                    <div className="font-semibold text-gray-900">
                                                        {campaign.advertiser_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {campaign.ad_spaces?.display_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-700">
                                            {(campaign.impressions || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-700">
                                            {(campaign.clicks || 0).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${ctr >= 5 ? 'bg-green-100 text-green-700' :
                                                    ctr >= 2 ? 'bg-blue-100 text-blue-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {ctr}%
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
