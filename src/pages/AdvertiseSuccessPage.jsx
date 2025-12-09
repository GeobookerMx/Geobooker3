// src/pages/AdvertiseSuccessPage.jsx
import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

const AdvertiseSuccessPage = () => {
    const [searchParams] = useSearchParams();
    const campaignId = searchParams.get('campaign');
    const [campaign, setCampaign] = useState(null);

    useEffect(() => {
        if (campaignId) {
            supabase
                .from('ad_campaigns')
                .select('*, ad_spaces(display_name)')
                .eq('id', campaignId)
                .single()
                .then(({ data }) => setCampaign(data));
        }
    }, [campaignId]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-lg w-full bg-white rounded-2xl shadow-xl p-8 text-center">
                {/* Success Icon */}
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600" />
                </div>

                {/* Title */}
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    ¡Pago Exitoso!
                </h1>
                <p className="text-gray-600 mb-6">
                    Tu campaña ha sido recibida correctamente
                </p>

                {/* Campaign Info */}
                {campaign && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left">
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Espacio:</span>
                            <span className="font-semibold">{campaign.ad_spaces?.display_name}</span>
                        </div>
                        <div className="flex justify-between mb-2">
                            <span className="text-gray-500">Ubicación:</span>
                            <span className="font-semibold">{campaign.target_location}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Total pagado:</span>
                            <span className="font-bold text-green-600">${campaign.budget} MXN</span>
                        </div>
                    </div>
                )}

                {/* Status Badge */}
                <div className="flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg mb-6">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">En revisión (24-48 hrs)</span>
                </div>

                {/* Info */}
                <p className="text-sm text-gray-500 mb-6">
                    Nuestro equipo revisará tu campaña y la aprobará en las próximas 24-48 horas.
                    Te notificaremos por email cuando esté activa.
                </p>

                {/* Actions */}
                <div className="space-y-3">
                    <Link
                        to="/dashboard"
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        Ir a mi Dashboard <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        to="/advertise"
                        className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition block"
                    >
                        Crear otra campaña
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdvertiseSuccessPage;
