// src/pages/admin/AdsQATool.jsx
/**
 * ADS.3: QA Tool para validar segmentación de anuncios por geo
 * Permite simular ubicación y ver qué anuncios se mostrarían
 */
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Globe, MapPin, PlayCircle, Eye, RefreshCw,
    ChevronDown, Info, CheckCircle, AlertCircle,
    X, Calendar, DollarSign, Target, TrendingUp,
    MousePointer, Percent, Check, Ban, Mail, Download, ExternalLink
} from 'lucide-react';
import PostSaleEmailModal from '../../components/admin/PostSaleEmailModal';

// Ubicaciones predefinidas para testing
const TEST_LOCATIONS = [
    { name: '🇲🇽 CDMX, México', lat: 19.4326, lng: -99.1332, country: 'MX', city: 'mexico-city' },
    { name: '🇲🇽 Guadalajara, México', lat: 20.6597, lng: -103.3496, country: 'MX', city: 'guadalajara' },
    { name: '🇲🇽 Monterrey, México', lat: 25.6866, lng: -100.3161, country: 'MX', city: 'monterrey' },
    { name: '🇺🇸 Los Angeles, USA', lat: 34.0522, lng: -118.2437, country: 'US', city: 'los-angeles' },
    { name: '🇺🇸 New York, USA', lat: 40.7128, lng: -74.0060, country: 'US', city: 'new-york' },
    { name: '🇺🇸 Miami, USA', lat: 25.7617, lng: -80.1918, country: 'US', city: 'miami' },
    { name: '🇪🇸 Madrid, España', lat: 40.4168, lng: -3.7038, country: 'ES', city: 'madrid' },
    { name: '🇪🇸 Barcelona, España', lat: 41.3851, lng: 2.1734, country: 'ES', city: 'barcelona' },
    { name: '🇧🇷 São Paulo, Brasil', lat: -23.5505, lng: -46.6333, country: 'BR', city: 'sao-paulo' },
    { name: '🇦🇷 Buenos Aires, Argentina', lat: -34.6037, lng: -58.3816, country: 'AR', city: 'buenos-aires' },
];

// Lógica de prioridad de anuncios (documentada)
const getCreativeAsset = (campaign) => campaign.ad_creatives?.[0]?.image_url || campaign.creative_url || campaign.image_url || null;

const AD_PRIORITY = [
    { level: 1, scope: 'city', label: 'Ciudad exacta', color: 'green' },
    { level: 2, scope: 'country', label: 'Pa?s', color: 'blue' },
    { level: 3, scope: 'region', label: 'Regi?n', color: 'yellow' },
    { level: 4, scope: 'global', label: 'Global', color: 'gray' },
];

const getTodayIso = () => new Date().toISOString().split('T')[0];

const getRenderSurfaceLabel = (campaign) => {
    const space = campaign?.ad_spaces?.name || campaign?.ad_space_name || '';

    const map = {
        hero_banner: 'Home principal debajo del buscador',
        featured_carousel: 'Carrusel de destacados en Home',
        sponsored_results: 'Resultados patrocinados en busqueda',
        sponsored_results_fullwidth: 'Banner full width dentro de busqueda',
        interstitial: 'Pantalla completa ocasional',
        recommended_section: 'Bloque de recomendados',
        sticky_footer: 'Banner fijo inferior'
    };

    return map[space] || 'Render no identificado en frontend';
};

const getCampaignAmount = (campaign) => Number(campaign?.total_budget ?? campaign?.budget ?? 0) || 0;

const getInvoiceRouteLabel = (campaign) => {
    const billingCountry = String(campaign?.billing_country || 'MX').toUpperCase();
    const taxStatus = campaign?.tax_status || '';
    const isDomestic = taxStatus === 'domestic_mx' || billingCountry === 'MX' || !taxStatus;

    return isDomestic ? 'CFDI MX / control fiscal local' : 'Invoice exportacion / soporte internacional';
};

const getDeliveryReadiness = (campaign, simulationDate) => {
    const amount = getCampaignAmount(campaign);
    const hasSurface = Boolean(campaign?.ad_spaces?.name || campaign?.ad_space_name);
    const startsOk = !campaign?.start_date || campaign.start_date <= simulationDate;
    const endsOk = !campaign?.end_date || campaign.end_date >= simulationDate;
    const isPaid = campaign?.payment_status === 'paid' || amount > 0;
    const isRenderableStatus = campaign?.status === 'active';

    return {
        startsOk,
        endsOk,
        hasSurface,
        isPaid,
        isRenderableStatus,
        canRenderNow: startsOk && endsOk && hasSurface && isPaid && isRenderableStatus
    };
};

const buildQaSummary = (campaigns, simulationDate) => campaigns.reduce((acc, campaign) => {
    const readiness = getDeliveryReadiness(campaign, simulationDate);
    const billingCountry = String(campaign?.billing_country || 'MX').toUpperCase();
    const taxStatus = campaign?.tax_status || '';
    const isDomestic = taxStatus === 'domestic_mx' || billingCountry === 'MX' || !taxStatus;

    if (readiness.canRenderNow) acc.renderReady += 1;
    if (campaign?.status === 'pending_review') acc.pendingReview += 1;
    if (campaign?.status === 'approved') acc.approvedPending += 1;
    if (isDomestic) acc.domesticFiscal += 1;
    if (!isDomestic) acc.exportFiscal += 1;

    return acc;
}, {
    renderReady: 0,
    pendingReview: 0,
    approvedPending: 0,
    domesticFiscal: 0,
    exportFiscal: 0
});

export default function AdsQATool() {
    const [selectedLocation, setSelectedLocation] = useState(TEST_LOCATIONS[0]);
    const [matchedAds, setMatchedAds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showPriorityInfo, setShowPriorityInfo] = useState(false);
    const [useCustomLocation, setUseCustomLocation] = useState(false);
    const [customLocation, setCustomLocation] = useState({
        name: 'Ubicación Personalizada',
        lat: '',
        lng: '',
        country: '',
        city: ''
    });
    const [selectedCampaign, setSelectedCampaign] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [simulationDate, setSimulationDate] = useState(getTodayIso());
    const activeLocation = useCustomLocation ? customLocation : selectedLocation;
    const qaSummary = buildQaSummary(matchedAds, simulationDate);

    const simulateAdTargeting = async () => {
        setLoading(true);

        // Determinar qué ubicación usar (predefinida o personalizada)
        const locationToUse = useCustomLocation ? customLocation : selectedLocation;

        if (useCustomLocation && (!customLocation.country || !customLocation.city)) {
            toast.error('Por favor ingresa país y ciudad');
            setLoading(false);
            return;
        }

        try {

            // Obtener TODAS las campañas activas y filtrar en JS
            const { data: allCampaigns, error } = await supabase
                .from('ad_campaigns')
                .select('*, ad_creatives(*), ad_spaces(name)')
                .eq('status', 'active')
                .lte('start_date', simulationDate)
                .or(`end_date.gte.${simulationDate},end_date.is.null`);

            if (error) {
                console.error('Error fetching campaigns:', error);
                throw error;
            }

            const allMatches = [];
            const userCountry = locationToUse.country.toUpperCase();
            const userCity = locationToUse.city.toLowerCase();

            (allCampaigns || []).forEach(campaign => {
                // Verificar match por ciudad (prioridad 1)
                const targetCities = campaign.target_cities || [];
                const cityMatch = targetCities.some(city =>
                    city.toLowerCase().includes(userCity) ||
                    userCity.includes(city.toLowerCase())
                );

                if (cityMatch) {
                    allMatches.push({ ...campaign, matchedScope: 'city', priority: 1, render_surface: getRenderSurfaceLabel(campaign) });
                    return;
                }

                // Verificar match por país (prioridad 2)
                const targetCountries = campaign.target_countries || [];
                const countryMatch = targetCountries.includes(userCountry);

                if (countryMatch) {
                    allMatches.push({ ...campaign, matchedScope: 'country', priority: 2, render_surface: getRenderSurfaceLabel(campaign) });
                    return;
                }

                // Verificar si es global (prioridad 4)
                if (campaign.ad_level === 'global') {
                    allMatches.push({ ...campaign, matchedScope: 'global', priority: 4, render_surface: getRenderSurfaceLabel(campaign) });
                }
            });

            // Ordenar por prioridad
            allMatches.sort((a, b) => a.priority - b.priority);

            setMatchedAds(allMatches);
            const locationName = useCustomLocation ? `${locationToUse.city} (${locationToUse.country})` : locationToUse.name;
            toast.success(`Se encontraron ${allMatches.length} anuncios para ${locationName}`);

        } catch (error) {
            console.error('Error simulando ads:', error);
            toast.error('Error al simular targeting');
        } finally {
            setLoading(false);
        }
    };


    const GET_SCOPE_COLOR = (scope) => {
        const priority = AD_PRIORITY.find(p => p.scope === scope);
        return priority?.color || 'gray';
    };

    const getScopeBadge = (scope) => {
        const colors = {
            city: 'bg-green-100 text-green-700 border-green-300',
            country: 'bg-blue-100 text-blue-700 border-blue-300',
            region: 'bg-yellow-100 text-yellow-700 border-yellow-300',
            global: 'bg-gray-100 text-gray-700 border-gray-300',
        };
        return colors[scope] || colors.global;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <Globe className="w-8 h-8 text-blue-600" />
                        Ads QA Tool
                    </h1>
                    <p className="text-gray-600 mt-1">
                        Simula ubicaciones y verifica qué anuncios se mostrarían
                    </p>
                </div>
                <button
                    onClick={() => setShowPriorityInfo(!showPriorityInfo)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100"
                >
                    <Info className="w-5 h-5" />
                    Prioridad de Ads
                </button>
            </div>

            {/* Priority Info Card */}
            {showPriorityInfo && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <h3 className="font-bold text-gray-800 mb-4">📋 Lógica de Prioridad de Anuncios</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {AD_PRIORITY.map((p) => (
                            <div key={p.scope} className={`p-3 rounded-lg bg-${p.color}-100 border border-${p.color}-300`}>
                                <div className="font-bold text-lg">#{p.level}</div>
                                <div className="text-sm font-medium">{p.label}</div>
                                <div className="text-xs text-gray-600 mt-1">{p.scope}</div>
                            </div>
                        ))}
                    </div>
                    <p className="text-sm text-gray-600 mt-4">
                        Si hay anuncios en múltiples niveles, se muestran primero los de mayor prioridad (ciudad antes que global).
                    </p>
                </div>
            )}

            {/* Location Selector */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    Selecciona ubicación a simular
                </h2>

                <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                        <div className="text-sm font-semibold text-blue-900">Que valida este QA</div>
                        <p className="mt-2 text-xs text-blue-800">Cruza territorio, fechas, estado operativo y superficie real para estimar si una pauta deberia renderizar en la PWA.</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="text-sm font-semibold text-emerald-900">Cuando si publica</div>
                        <p className="mt-2 text-xs text-emerald-800">Solo consideramos lista para salir una campana con slot detectado, fecha vigente, monto cobrado y estado <code>active</code>.</p>
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="text-sm font-semibold text-amber-900">Cobro y fiscal</div>
                        <p className="mt-2 text-xs text-amber-800">Aqui tambien puedes distinguir rapido entre ruta CFDI MX y operacion internacional para no mezclar postventa ni facturacion.</p>
                    </div>
                    <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <div className="text-sm font-semibold text-purple-900">Lectura correcta de KPIs</div>
                        <p className="mt-2 text-xs text-purple-800">El QA no promete ventas; confirma elegibilidad de publicacion y ayuda a detectar por que una campana aun no aparece.</p>
                    </div>
                </div>

                {/* Toggle Custom Location */}
                <div className="flex items-center gap-3 mb-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={useCustomLocation}
                            onChange={(e) => setUseCustomLocation(e.target.checked)}
                            className="sr-only"
                        />
                        <div className={`w-11 h-6 rounded-full transition-colors ${useCustomLocation ? 'bg-purple-600' : 'bg-gray-300'}`}>
                            <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${useCustomLocation ? 'translate-x-5' : 'translate-x-0.5'} mt-0.5`} />
                        </div>
                        <span className="ml-2 text-sm font-medium text-gray-700">Ubicación personalizada</span>
                    </label>
                </div>

                {!useCustomLocation ? (
                    /* Predefined Locations */
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        {TEST_LOCATIONS.map((loc) => (
                            <button
                                key={loc.city}
                                onClick={() => setSelectedLocation(loc)}
                                className={`p-3 rounded-lg border-2 text-left transition-all ${selectedLocation.city === loc.city
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                    }`}
                            >
                                <div className="font-medium text-sm">{loc.name}</div>
                                <div className="text-xs text-gray-500 mt-1">
                                    {loc.lat.toFixed(2)}, {loc.lng.toFixed(2)}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    /* Custom Location Input */
                    <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                        <h3 className="font-semibold text-purple-800 mb-3">🌍 Simular desde cualquier lugar del mundo</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">País (código)</label>
                                <input
                                    type="text"
                                    value={customLocation.country}
                                    onChange={(e) => setCustomLocation({ ...customLocation, country: e.target.value.toUpperCase() })}
                                    placeholder="MX, US, ES..."
                                    maxLength={2}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 uppercase"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                                <input
                                    type="text"
                                    value={customLocation.city}
                                    onChange={(e) => setCustomLocation({ ...customLocation, city: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    placeholder="mexico-city"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Latitud</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={customLocation.lat}
                                    onChange={(e) => setCustomLocation({ ...customLocation, lat: parseFloat(e.target.value) || '' })}
                                    placeholder="19.4326"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Longitud</label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={customLocation.lng}
                                    onChange={(e) => setCustomLocation({ ...customLocation, lng: parseFloat(e.target.value) || '' })}
                                    placeholder="-99.1332"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>
                        <p className="text-xs text-purple-600 mt-3">
                            💡 Tip: Puedes buscar coordenadas de cualquier ciudad en Google Maps (clic derecho → ¿Qué hay aquí?)
                        </p>
                    </div>
                )}

                <div className="mt-6 flex flex-wrap items-end gap-4">
                    <button
                        onClick={simulateAdTargeting}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50"
                    >
                        {loading ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <PlayCircle className="w-5 h-5" />
                        )}
                        Simular Targeting
                    </button>

                    <div className="min-w-[210px]">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Fecha de simulacion</label>
                        <input
                            type="date"
                            value={simulationDate}
                            onChange={(e) => setSimulationDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        />
                    </div>

                    <div className="text-sm text-gray-600">
                        Ubicacion seleccionada: <strong>{activeLocation.country || 'N/A'}</strong> / <strong>{activeLocation.city || 'N/A'}</strong>
                    </div>
                </div>
            </div>

            {/* Results */}
            <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                <h2 className="font-bold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Eye className="w-5 h-5 text-green-600" />
                    Anuncios que se mostrarían ({matchedAds.length})
                </h2>

                {matchedAds.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Haz clic en "Simular Targeting" para ver los anuncios</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-emerald-700">Render listo</div>
                                <div className="mt-1 text-2xl font-bold text-emerald-900">{qaSummary.renderReady}</div>
                            </div>
                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-yellow-700">Pendiente revision</div>
                                <div className="mt-1 text-2xl font-bold text-yellow-900">{qaSummary.pendingReview}</div>
                            </div>
                            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-sky-700">Aprobada sin publicar</div>
                                <div className="mt-1 text-2xl font-bold text-sky-900">{qaSummary.approvedPending}</div>
                            </div>
                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-blue-700">Fiscal MX</div>
                                <div className="mt-1 text-2xl font-bold text-blue-900">{qaSummary.domesticFiscal}</div>
                            </div>
                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                                <div className="text-xs uppercase tracking-wide text-purple-700">Exportacion</div>
                                <div className="mt-1 text-2xl font-bold text-purple-900">{qaSummary.exportFiscal}</div>
                            </div>
                        </div>

                        {matchedAds.map((ad, index) => {
                            const readiness = getDeliveryReadiness(ad, simulationDate);
                            const locationName = useCustomLocation ? activeLocation.city : selectedLocation.city;

                            return (
                            <div
                                key={ad.id}
                                className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center font-bold text-blue-700">
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-800">{ad.advertiser_name || 'Sin nombre'}</h3>
                                            <p className="text-sm text-gray-600">
                                                {ad.advertiser_email || 'No email'} • Nivel: {ad.ad_level || 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScopeBadge(ad.matchedScope)}`}>
                                        {ad.matchedScope === 'city' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                                        {AD_PRIORITY.find(p => p.scope === ad.matchedScope)?.label || ad.matchedScope}
                                    </span>
                                </div>

                                {/* Preview del Creativo */}
                                <div className="mt-4 bg-gray-900 rounded-lg p-3">
                                    <p className="text-xs text-gray-400 mb-2">📺 Preview del Creativo:</p>
                                    {getCreativeAsset(ad) ? (
                                        getCreativeAsset(ad).includes('youtube') ? (
                                            <a
                                                href={getCreativeAsset(ad)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                                            >
                                                🎬 Ver video en YouTube: {getCreativeAsset(ad)}
                                            </a>
                                        ) : getCreativeAsset(ad).match(/\.(mp4|webm|mov)$/i) ? (
                                            <video src={getCreativeAsset(ad)} controls className="max-h-32 rounded" />
                                        ) : (
                                            <img src={getCreativeAsset(ad)} alt="Creative" className="max-h-32 rounded" />
                                        )
                                    ) : (
                                        <p className="text-gray-500 text-sm">Sin creativo cargado</p>
                                    )}
                                </div>

                                {/* Detalles de la campaña */}
                                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                                    <div className="bg-blue-50 p-2 rounded">
                                        <span className="text-gray-500">📅 Inicio:</span>
                                        <div className="font-semibold text-gray-800">{ad.start_date || 'N/A'}</div>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded">
                                        <span className="text-gray-500">📅 Fin:</span>
                                        <div className="font-semibold text-gray-800">{ad.end_date || 'N/A'}</div>
                                    </div>
                                    <div className="bg-green-50 p-2 rounded">
                                        <span className="text-gray-500">💰 Presupuesto:</span>
                                        <div className="font-semibold text-gray-800">${ad.total_budget?.toLocaleString()} {ad.currency}</div>
                                    </div>
                                    <div className="bg-yellow-50 p-2 rounded">
                                        <span className="text-gray-500">🔄 Última modificación:</span>
                                        <div className="font-semibold text-gray-800">
                                            {ad.updated_at ? new Date(ad.updated_at).toLocaleDateString('es-MX') : 'N/A'}
                                        </div>
                                    </div>
                                </div>

                                {/* Razón del match */}
                                <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                    <strong>Razón del match:</strong> {
                                        ad.matchedScope === 'city' ? `Ciudad "${ad.target_cities?.join(', ')}" coincide con ${locationName}` :
                                            ad.matchedScope === 'country' ? `País "${ad.target_countries?.join(', ')}" coincide con ${activeLocation.country}` :
                                                ad.matchedScope === 'global' ? 'Anuncio global (sin restricción geográfica)' :
                                                    'Coincidencia por región'
                                    }
                                </div>

                                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                    <span className={`px-2.5 py-1 rounded-full border ${readiness.canRenderNow ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                        {readiness.canRenderNow ? 'Render listo' : 'Render no listo'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full border ${readiness.isPaid ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>
                                        {readiness.isPaid ? 'Pago registrado' : 'Pago pendiente'}
                                    </span>
                                    <span className={`px-2.5 py-1 rounded-full border ${readiness.hasSurface ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                                        {readiness.hasSurface ? 'Slot detectado' : 'Sin superficie'}
                                    </span>
                                    <span className="px-2.5 py-1 rounded-full border bg-slate-50 text-slate-700 border-slate-200">
                                        {getInvoiceRouteLabel(ad)}
                                    </span>
                                </div>

                                {/* Advertencia si fue modificado recientemente */}
                                {ad.updated_at && new Date(ad.updated_at) > new Date(ad.created_at) && (
                                    <div className="mt-2 px-3 py-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        ⚠️ Esta campaña fue modificada después de su creación
                                    </div>
                                )}

                                {/* Botón Ver Detalles */}
                                <button
                                    onClick={() => {
                                        setSelectedCampaign(ad);
                                        setShowDetailModal(true);
                                    }}
                                    className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition"
                                >
                                    <Eye className="w-4 h-4" />
                                    Ver Detalles Completos
                                </button>
                            </div>
                        )})}
                    </div>
                )}
            </div>

            {/* Campaign Detail Modal */}
            {showDetailModal && selectedCampaign && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                    <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
                        {/* Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 sticky top-0 z-10">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold">{selectedCampaign.advertiser_name || 'Campaña'}</h2>
                                    <p className="text-blue-200">{selectedCampaign.advertiser_email || 'Sin email'}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${selectedCampaign.status === 'active' ? 'bg-green-500' :
                                            selectedCampaign.status === 'pending_review' ? 'bg-yellow-500' :
                                                selectedCampaign.status === 'approved' ? 'bg-blue-500' :
                                                    'bg-gray-500'
                                        }`}>
                                        {selectedCampaign.status?.toUpperCase()}
                                    </span>
                                    <button
                                        onClick={() => setShowDetailModal(false)}
                                        className="p-2 hover:bg-white/20 rounded-full"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="grid md:grid-cols-5 gap-3">
                                {(() => {
                                    const readiness = getDeliveryReadiness(selectedCampaign, simulationDate);
                                    const amount = getCampaignAmount(selectedCampaign);

                                    return (
                                        <>
                                            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                                                <div className="text-xs uppercase tracking-wide text-emerald-700">Estado</div>
                                                <div className="mt-1 font-bold text-emerald-900">{readiness.canRenderNow ? 'Lista para publicar' : 'No lista aun'}</div>
                                            </div>
                                            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                                                <div className="text-xs uppercase tracking-wide text-blue-700">Slot detectado</div>
                                                <div className="mt-1 font-bold text-blue-900">{readiness.hasSurface ? 'Si' : 'No'}</div>
                                            </div>
                                            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
                                                <div className="text-xs uppercase tracking-wide text-yellow-700">Pago</div>
                                                <div className="mt-1 font-bold text-yellow-900">{readiness.isPaid ? 'Registrado' : 'Pendiente'}</div>
                                            </div>
                                            <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                                                <div className="text-xs uppercase tracking-wide text-purple-700">Ruta fiscal</div>
                                                <div className="mt-1 font-bold text-purple-900">{getInvoiceRouteLabel(selectedCampaign)}</div>
                                            </div>
                                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                                <div className="text-xs uppercase tracking-wide text-slate-700">Monto</div>
                                                <div className="mt-1 font-bold text-slate-900">{amount.toLocaleString()} {selectedCampaign.currency || 'MXN'}</div>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>

                            {/* Creative Preview */}
                            <div className="bg-gray-900 rounded-xl p-6">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                                    <PlayCircle className="w-5 h-5 text-purple-400" />
                                    Preview del Creativo
                                </h3>
                                {getCreativeAsset(selectedCampaign) ? (
                                    getCreativeAsset(selectedCampaign).includes('youtube') ? (
                                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                                            <iframe
                                                src={getCreativeAsset(selectedCampaign).replace('youtube.com/shorts/', 'youtube.com/embed/')}
                                                className="w-full h-full"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            />
                                        </div>
                                    ) : getCreativeAsset(selectedCampaign).match(/\.(mp4|webm|mov)$/i) ? (
                                        <video src={getCreativeAsset(selectedCampaign)} controls className="w-full rounded-lg" />
                                    ) : (
                                        <img src={getCreativeAsset(selectedCampaign)} alt="Creative" className="max-h-64 mx-auto rounded-lg" />
                                    )
                                ) : (
                                    <div className="text-center py-8 text-gray-500">
                                        Sin creativo cargado
                                    </div>
                                )}
                                {getCreativeAsset(selectedCampaign) && (
                                    <a
                                        href={getCreativeAsset(selectedCampaign)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 flex items-center justify-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Abrir en nueva pestaña
                                    </a>
                                )}
                            </div>

                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                                    <Eye className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-blue-800">{(selectedCampaign.impressions || 0).toLocaleString()}</div>
                                    <div className="text-xs text-blue-600">Impresiones</div>
                                </div>
                                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                                    <MousePointer className="w-6 h-6 text-green-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-green-800">{(selectedCampaign.clicks || 0).toLocaleString()}</div>
                                    <div className="text-xs text-green-600">Clics</div>
                                </div>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
                                    <Percent className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-purple-800">{selectedCampaign.ctr || '0.00'}%</div>
                                    <div className="text-xs text-purple-600">CTR</div>
                                </div>
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                    <DollarSign className="w-6 h-6 text-emerald-600 mx-auto mb-2" />
                                    <div className="text-2xl font-bold text-emerald-800">${selectedCampaign.total_budget?.toLocaleString()}</div>
                                    <div className="text-xs text-emerald-600">{selectedCampaign.currency || 'MXN'}</div>
                                </div>
                            </div>

                            {/* Campaign Details */}
                            <div className="grid md:grid-cols-2 gap-6">
                                {/* Dates */}
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Calendar className="w-5 h-5 text-blue-500" />
                                        Fechas de Campaña
                                    </h4>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Inicio:</span>
                                            <span className="font-semibold">{selectedCampaign.start_date || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Fin:</span>
                                            <span className="font-semibold">{selectedCampaign.end_date || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Creada:</span>
                                            <span className="font-semibold">{selectedCampaign.created_at ? new Date(selectedCampaign.created_at).toLocaleDateString('es-MX') : 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Última modificación:</span>
                                            <span className="font-semibold">{selectedCampaign.updated_at ? new Date(selectedCampaign.updated_at).toLocaleDateString('es-MX') : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Targeting */}
                                <div className="bg-gray-50 rounded-xl p-5">
                                    <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Target className="w-5 h-5 text-red-500" />
                                        Segmentación
                                    </h4>
                                    <div className="space-y-3">
                                        <div>
                                            <span className="text-gray-600 text-sm">Nivel:</span>
                                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-medium">
                                                {selectedCampaign.ad_level || 'N/A'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-600 text-sm">Superficie:</span>
                                            <span className="ml-2 text-sm font-semibold text-gray-900">
                                                {selectedCampaign.render_surface || getRenderSurfaceLabel(selectedCampaign)}
                                            </span>
                                        </div>
                                        {selectedCampaign.target_countries?.length > 0 && (
                                            <div>
                                                <span className="text-gray-600 text-sm">Países:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedCampaign.target_countries.map(c => (
                                                        <span key={c} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedCampaign.target_cities?.length > 0 && (
                                            <div>
                                                <span className="text-gray-600 text-sm">Ciudades:</span>
                                                <div className="flex flex-wrap gap-1 mt-1">
                                                    {selectedCampaign.target_cities.map(c => (
                                                        <span key={c} className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                                                            {c}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200">
                                {selectedCampaign.status === 'pending_review' && (
                                    <>
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.from('ad_campaigns').update({ status: 'active' }).eq('id', selectedCampaign.id);
                                                if (!error) {
                                                    toast.success('Campaña aprobada');
                                                    setShowDetailModal(false);
                                                }
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
                                        >
                                            <Check className="w-5 h-5" />
                                            Aprobar
                                        </button>
                                        <button
                                            onClick={async () => {
                                                const { error } = await supabase.from('ad_campaigns').update({ status: 'rejected' }).eq('id', selectedCampaign.id);
                                                if (!error) {
                                                    toast.success('Campaña rechazada');
                                                    setShowDetailModal(false);
                                                }
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold"
                                        >
                                            <Ban className="w-5 h-5" />
                                            Rechazar
                                        </button>
                                    </>
                                )}

                                <button
                                    onClick={() => {
                                        setShowDetailModal(false);
                                        setShowEmailModal(true);
                                    }}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
                                >
                                    <Mail className="w-5 h-5" />
                                    Enviar Reporte
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Post-Sale Email Modal */}
            <PostSaleEmailModal
                campaign={selectedCampaign}
                isOpen={showEmailModal}
                onClose={() => setShowEmailModal(false)}
            />
        </div>
    );
}





