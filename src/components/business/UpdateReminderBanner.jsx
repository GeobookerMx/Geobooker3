// Banner de Advertencia para Actualización
// src/components/business/UpdateReminderBanner.jsx

import React from 'react';
import { AlertTriangle, Clock, Sparkles } from 'lucide-react';

const UpdateReminderBanner = ({ business, onUpdateClick }) => {
    if (!business) return null;

    const daysOld = business.days_since_update || 0;
    const daysUntilDeactivation = 180 - daysOld;

    // No mostrar si está actualizado
    if (daysOld < 60) return null;

    // Determinar urgencia
    let urgency = 'warning'; // 60-90 días
    if (daysOld >= 150) urgency = 'critical'; // 150-180 días
    else if (daysOld >= 90) urgency = 'important'; // 90-150 días

    const urgencyConfig = {
        warning: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-300',
            text: 'text-yellow-900',
            icon: Clock,
            iconColor: 'text-yellow-600',
            button: 'bg-yellow-600 hover:bg-yellow-700'
        },
        important: {
            bg: 'bg-orange-50',
            border: 'border-orange-300',
            text: 'text-orange-900',
            icon: AlertTriangle,
            iconColor: 'text-orange-600',
            button: 'bg-orange-600 hover:bg-orange-700'
        },
        critical: {
            bg: 'bg-red-50',
            border: 'border-red-300',
            text: 'text-red-900',
            icon: AlertTriangle,
            iconColor: 'text-red-600',
            button: 'bg-red-600 hover:bg-red-700'
        }
    };

    const config = urgencyConfig[urgency];
    const Icon = config.icon;

    return (
        <div className={`${config.bg} border-l-4 ${config.border} p-4 mb-6 rounded-r-lg`}>
            <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 ${config.iconColor} flex-shrink-0 mt-0.5`} />

                <div className="flex-1">
                    <h3 className={`font-bold ${config.text} mb-1`}>
                        {urgency === 'critical' && '🚨 URGENTE: Tu negocio será desactivado pronto'}
                        {urgency === 'important' && '⚠️ Tu negocio requiere actualización'}
                        {urgency === 'warning' && '🔔 Actualiza la información de tu negocio'}
                    </h3>

                    <p className={`text-sm ${config.text} mb-2`}>
                        Última actualización: hace {daysOld} días
                    </p>

                    {urgency === 'critical' && (
                        <p className={`text-sm ${config.text} font-semibold mb-3`}>
                            ⏱️ Tu negocio será desactivado automáticamente en {daysUntilDeactivation} días
                        </p>
                    )}

                    <div className={`text-sm ${config.text} mb-3`}>
                        <p className="font-medium mb-1">Consecuencias si no actualizas:</p>
                        <ul className="list-disc list-inside space-y-1 ml-2">
                            {daysOld >= 90 && <li>Badge "Desactualizado" ⚠️ visible para usuarios</li>}
                            {daysOld >= 90 && <li>-15 puntos en Trust Score</li>}
                            {daysOld >= 150 && <li className="font-bold">-25 puntos adicionales en Trust Score</li>}
                            {daysOld >= 150 && <li className="font-bold">Menor visibilidad en búsquedas</li>}
                            {urgency === 'critical' && (
                                <li className="font-bold text-red-700">
                                    🔴 Desactivación total y pérdida de visibilidad
                                </li>
                            )}
                        </ul>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onUpdateClick}
                            className={`flex items-center gap-2 px-4 py-2 ${config.button} text-white rounded-lg font-medium shadow-md`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Actualizar Ahora
                        </button>

                        {urgency !== 'critical' && (
                            <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
                                Recordar después
                            </button>
                        )}
                    </div>

                    {urgency === 'warning' && (
                        <p className="text-xs text-gray-600 mt-3">
                            💡 Actualizar toma solo 2 minutos y te da +15 pts Trust Score
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateReminderBanner;
