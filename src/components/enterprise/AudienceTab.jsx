import React from 'react';
import { Smartphone, Monitor, Tablet, Clock, PieChart } from 'lucide-react';

export default function AudienceTab({ dailyMetrics }) {
    // Agregar datos
    const deviceData = { mobile: 0, desktop: 0, tablet: 0, unknown: 0 };
    const hourData = {};
    
    // Initialize hours 0-23
    for (let i = 0; i < 24; i++) {
        hourData[i.toString().padStart(2, '0')] = 0;
    }

    let totalDeviceViews = 0;

    dailyMetrics.forEach(day => {
        // Devices
        if (day.views_by_device) {
            Object.entries(day.views_by_device).forEach(([device, count]) => {
                const k = device.toLowerCase();
                if (deviceData[k] !== undefined) {
                    deviceData[k] += count;
                } else {
                    deviceData.unknown += count;
                }
                totalDeviceViews += count;
            });
        }
        
        // Hours
        if (day.views_by_hour) {
            Object.entries(day.views_by_hour).forEach(([hour, count]) => {
                if (hourData[hour] !== undefined) {
                    hourData[hour] += count;
                }
            });
        }
    });

    // Formatting Devices
    const getDevicePercentage = (key) => {
        if (totalDeviceViews === 0) return 0;
        return ((deviceData[key] / totalDeviceViews) * 100).toFixed(1);
    };

    // Formatting Hours
    const maxHourViews = Math.max(...Object.values(hourData), 1);
    
    // Agrupar horas por bloques (Madrugada, Mañana, Tarde, Noche)
    const timeBlocks = {
        'Madrugada (00-06)': Object.keys(hourData).filter(h => parseInt(h) >= 0 && parseInt(h) < 6).reduce((sum, h) => sum + hourData[h], 0),
        'Mañana (06-12)': Object.keys(hourData).filter(h => parseInt(h) >= 6 && parseInt(h) < 12).reduce((sum, h) => sum + hourData[h], 0),
        'Tarde (12-18)': Object.keys(hourData).filter(h => parseInt(h) >= 12 && parseInt(h) < 18).reduce((sum, h) => sum + hourData[h], 0),
        'Noche (18-24)': Object.keys(hourData).filter(h => parseInt(h) >= 18 && parseInt(h) < 24).reduce((sum, h) => sum + hourData[h], 0),
    };

    return (
        <div className="space-y-6">
            {/* Devices */}
            <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-purple-400" />
                    Dispositivos
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Mobile */}
                    <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
                        <Smartphone className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white mb-1">
                            {getDevicePercentage('mobile')}%
                        </div>
                        <div className="text-sm text-gray-400">Mobile ({deviceData.mobile})</div>
                    </div>
                    
                    {/* Desktop */}
                    <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
                        <Monitor className="w-8 h-8 text-green-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white mb-1">
                            {getDevicePercentage('desktop')}%
                        </div>
                        <div className="text-sm text-gray-400">Desktop ({deviceData.desktop})</div>
                    </div>
                    
                    {/* Tablet */}
                    <div className="bg-gray-800 rounded-xl p-6 text-center border border-gray-700">
                        <Tablet className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <div className="text-3xl font-bold text-white mb-1">
                            {getDevicePercentage('tablet')}%
                        </div>
                        <div className="text-sm text-gray-400">Tablet ({deviceData.tablet})</div>
                    </div>
                </div>
            </div>

            {/* Time Blocks (Horarios de mayor actividad) */}
            <div className="bg-gray-900 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-amber-400" />
                    Horarios de Mayor Impacto
                </h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    {Object.entries(timeBlocks).map(([blockName, count], idx) => (
                        <div key={idx} className="bg-gray-800 p-4 rounded-lg text-center">
                            <div className="text-sm text-gray-400 mb-2">{blockName}</div>
                            <div className="text-xl font-bold text-white">{count.toLocaleString()}</div>
                        </div>
                    ))}
                </div>

                {/* Hourly Heatmap/Bars */}
                <h4 className="text-sm font-medium text-gray-400 mb-4">Desglose por Hora (0-23 hrs)</h4>
                <div className="flex items-end gap-1 h-32 mt-4">
                    {Object.entries(hourData).map(([hour, count]) => {
                        const height = maxHourViews > 0 ? (count / maxHourViews) * 100 : 0;
                        return (
                            <div key={hour} className="flex-1 flex flex-col items-center group relative">
                                {/* Tooltip */}
                                <div className="absolute -top-10 bg-gray-800 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10 border border-gray-600">
                                    {hour}:00 - {count} vistas
                                </div>
                                
                                {/* Bar */}
                                <div 
                                    className="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t-sm transition-all duration-300 hover:from-blue-500 hover:to-cyan-300"
                                    style={{ height: `${Math.max(height, 2)}%` }}
                                />
                                
                                {/* Label (only show some hours to avoid crowding) */}
                                <div className="text-[10px] text-gray-500 mt-2 truncate w-full text-center">
                                    {parseInt(hour) % 3 === 0 ? hour : ''}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
