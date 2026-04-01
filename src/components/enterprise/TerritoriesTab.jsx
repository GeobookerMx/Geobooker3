import React from 'react';
import { MapPin, Globe } from 'lucide-react';

export default function TerritoriesTab({ dailyMetrics, targetRegions, targetCountries }) {
    // Agregar datos de ciudades
    const cityData = {};
    const countryData = {};

    dailyMetrics.forEach(day => {
        // Cities
        if (day.views_by_city) {
            Object.entries(day.views_by_city).forEach(([city, count]) => {
                if (city !== 'unknown') {
                    cityData[city] = (cityData[city] || 0) + count;
                }
            });
        }
        
        // Countries
        if (day.views_by_country) {
            Object.entries(day.views_by_country).forEach(([country, count]) => {
                if (country !== 'unknown') {
                    countryData[country] = (countryData[country] || 0) + count;
                }
            });
        }
    });

    const sortedCities = Object.entries(cityData)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5
        
    const sortedCountries = Object.entries(countryData)
        .sort((a, b) => b[1] - a[1]);

    const maxCityViews = sortedCities.length > 0 ? sortedCities[0][1] : 1;

    return (
        <div className="space-y-6">
            {/* Target Regions Summary */}
            {((targetRegions && targetRegions.length > 0) || (targetCountries && targetCountries.length > 0)) && (
                <div className="bg-gray-900 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-blue-400" />
                        Regiones Objetivo Configuradas
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                        {(targetRegions || []).map((region, idx) => (
                            <span key={idx} className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {region}
                            </span>
                        ))}
                    </div>
                    {targetCountries && targetCountries.length > 0 && (
                        <div className="text-gray-400 text-sm">
                            Países objetivo: {targetCountries.join(', ')}
                        </div>
                    )}
                </div>
            )}

            {/* Top Cities */}
            <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-green-400" />
                    Top Ciudades por Impresiones
                </h3>
                
                {sortedCities.length > 0 ? (
                    <div className="space-y-4">
                        {sortedCities.map(([city, count], idx) => (
                            <div key={idx} className="flex items-center gap-4">
                                <div className="w-32 text-sm text-gray-300 truncate" title={city}>
                                    {city}
                                </div>
                                <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                                    <div
                                        className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                                        style={{ width: `${Math.max((count / maxCityViews) * 100, 2)}%` }}
                                    />
                                </div>
                                <div className="w-16 text-right font-medium text-white text-sm">
                                    {count.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-6">
                        Aún no hay suficientes datos geográficos para esta campaña.
                    </div>
                )}
            </div>
            
            {/* Countries Breakdown */}
            {sortedCountries.length > 0 && (
                <div className="bg-gray-900 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Globe className="w-5 h-5 text-purple-400" />
                        Distribución por País
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sortedCountries.map(([country, count], idx) => (
                            <div key={idx} className="bg-gray-800 rounded-lg p-4 text-center">
                                <div className="text-2xl font-bold text-white mb-1">
                                    {count.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-400 uppercase tracking-wider">
                                    {country}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
