// src/pages/admin/AdsQATool.jsx
/**
 * ADS.3: QA Tool para validar segmentación de anuncios por geo
 * Permite simular ubicación y ver qué anuncios se mostrarían
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import {
    Globe, MapPin, PlayCircle, Eye, RefreshCw,
    ChevronDown, Info, CheckCircle, AlertCircle
} from 'lucide-react';

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
const AD_PRIORITY = [
    { level: 1, scope: 'city', label: 'Ciudad exacta', color: 'green' },
    { level: 2, scope: 'country', label: 'País', color: 'blue' },
    { level: 3, scope: 'region', label: 'Región', color: 'yellow' },
    { level: 4, scope: 'global', label: 'Global', color: 'gray' },
];

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
            const today = new Date().toISOString().split('T')[0];

            // Obtener TODAS las campañas activas y filtrar en JS
            const { data: allCampaigns, error } = await supabase
                .from('ad_campaigns')
                .select('*')
                .eq('status', 'active')
                .lte('start_date', today)
                .gte('end_date', today);

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
                    allMatches.push({ ...campaign, matchedScope: 'city', priority: 1 });
                    return;
                }

                // Verificar match por país (prioridad 2)
                const targetCountries = campaign.target_countries || [];
                const countryMatch = targetCountries.includes(userCountry);

                if (countryMatch) {
                    allMatches.push({ ...campaign, matchedScope: 'country', priority: 2 });
                    return;
                }

                // Verificar si es global (prioridad 4)
                if (campaign.ad_level === 'global') {
                    allMatches.push({ ...campaign, matchedScope: 'global', priority: 4 });
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


    const getScopeColor = (scope) => {
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

                <div className="mt-6 flex items-center gap-4">
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

                    <div className="text-sm text-gray-600">
                        Ubicación seleccionada: <strong>{selectedLocation.country}</strong> / <strong>{selectedLocation.city}</strong>
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
                        {matchedAds.map((ad, index) => (
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
                                            <h3 className="font-semibold text-gray-800">{ad.name}</h3>
                                            <p className="text-sm text-gray-600">
                                                {ad.advertiser_name || 'Anunciante'} • Slot: {ad.slot_type || 'banner'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getScopeBadge(ad.matchedScope)}`}>
                                        {ad.matchedScope === 'city' && <CheckCircle className="w-4 h-4 inline mr-1" />}
                                        {AD_PRIORITY.find(p => p.scope === ad.matchedScope)?.label || ad.matchedScope}
                                    </span>
                                </div>

                                <div className="mt-3 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                                    <strong>Razón del match:</strong> {
                                        ad.matchedScope === 'city' ? `Ciudad "${ad.target_cities?.join(', ')}" coincide con ${selectedLocation.city}` :
                                            ad.matchedScope === 'country' ? `País "${ad.target_countries?.join(', ')}" coincide con ${selectedLocation.country}` :
                                                ad.matchedScope === 'global' ? 'Anuncio global (sin restricción geográfica)' :
                                                    'Coincidencia por región'
                                    }
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
