import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, Clock, ArrowRight, BarChart3, Mail, ShieldCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

const formatCurrency = (amount = 0, currency = 'MXN') => {
    try {
        return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency,
            maximumFractionDigits: 2
        }).format(Number(amount) || 0);
    } catch (_error) {
        return `$${Number(amount || 0).toFixed(2)} ${currency}`;
    }
};

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

    const purchaseSummary = useMemo(() => {
        if (!campaign) return null;

        return {
            space: campaign.ad_spaces?.display_name || 'Espacio publicitario Geobooker',
            location: campaign.target_location || 'Segmentacion definida',
            billingCountry: campaign.billing_country || 'MX',
            taxStatus: campaign.tax_status || ((campaign.billing_country || 'MX') === 'MX' ? 'domestic_mx' : 'export_0_iva'),
            amount: formatCurrency(
                campaign.total_budget || campaign.budget || 0,
                campaign.currency || (campaign.billing_country === 'MX' ? 'MXN' : 'USD')
            ),
            payment: campaign.payment_method === 'oxxo' ? 'OXXO' : 'Tarjeta',
            period: `${campaign.start_date || 'Por definir'} al ${campaign.end_date || 'Sin definir'}`
        };
    }, [campaign]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-3xl w-full bg-white rounded-2xl shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="w-12 h-12 text-green-600" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Pago exitoso</h1>
                    <p className="text-gray-600">
                        Tu compra publicitaria fue recibida correctamente y ya entro al flujo de revision de Geobooker.
                    </p>
                </div>

                {purchaseSummary && (
                    <div className="grid md:grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-5">
                            <h2 className="font-semibold text-gray-900 mb-3">Resumen de tu compra</h2>
                            <div className="space-y-2 text-sm text-gray-700">
                                <div className="flex justify-between gap-4">
                                    <span>Espacio contratado</span>
                                    <span className="font-semibold text-right">{purchaseSummary.space}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>Segmentacion</span>
                                    <span className="font-semibold text-right">{purchaseSummary.location}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>Metodo de pago</span>
                                    <span className="font-semibold text-right">{purchaseSummary.payment}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>Facturacion</span>
                                    <span className="font-semibold text-right">{purchaseSummary.billingCountry} / {purchaseSummary.taxStatus}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>Periodo contratado</span>
                                    <span className="font-semibold text-right">{purchaseSummary.period}</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span>Inversion</span>
                                    <span className="font-bold text-green-600 text-right">{purchaseSummary.amount}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 rounded-xl p-5 border border-blue-100">
                            <h2 className="font-semibold text-gray-900 mb-3">Lo que recibiras</h2>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li>Revision comercial y editorial antes de publicar</li>
                                <li>Tiempo estimado de aprobacion y salida: 12 a 72 horas</li>
                                <li>Activacion de tu pauta una vez aprobada</li>
                                <li>Acceso a KPIs: impresiones, clics, CTR y taps a WhatsApp</li>
                                <li>Seguimiento desde tu dashboard publicitario</li>
                            </ul>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-3 rounded-lg mb-6">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium">Estado actual: En revision (12-72 horas)</span>
                </div>

                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <ShieldCheck className="w-5 h-5 text-blue-600 mb-3" />
                        <h3 className="font-semibold text-gray-900 mb-2">1. Validacion</h3>
                        <p className="text-sm text-gray-600">Revisamos creatividad, enlace, segmentacion y lineamientos de contenido. Este paso puede tomar de 12 a 72 horas.</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <Mail className="w-5 h-5 text-blue-600 mb-3" />
                        <h3 className="font-semibold text-gray-900 mb-2">2. Notificacion</h3>
                        <p className="text-sm text-gray-600">Te avisaremos por correo cuando la campana quede aprobada o si requiere ajustes.</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl p-4">
                        <BarChart3 className="w-5 h-5 text-blue-600 mb-3" />
                        <h3 className="font-semibold text-gray-900 mb-2">3. KPIs</h3>
                        <p className="text-sm text-gray-600">Una vez activa, podras revisar resultados desde tu dashboard del anunciante.</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Link
                        to="/advertiser/dashboard"
                        className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                    >
                        Ir a mi dashboard publicitario <ArrowRight className="w-5 h-5" />
                    </Link>
                    <Link
                        to="/advertise"
                        className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition block text-center"
                    >
                        Crear otra campana
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default AdvertiseSuccessPage;
