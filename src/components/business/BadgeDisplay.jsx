// Display de Badges Ganados
// src/components/business/BadgeDisplay.jsx

import React from 'react';
import {
    CheckCircle, Award, Flame, Star, Camera, Rocket,
    Briefcase, Sparkles, Palette
} from 'lucide-react';

const BadgeDisplay = ({ badges = [], layout = 'horizontal' }) => {
    // Configuración de badges
    const badgeConfig = {
        verified: {
            icon: CheckCircle,
            label: 'Verificado',
            color: 'blue',
            description: 'Identidad confirmada'
        },
        premium: {
            icon: Award,
            label: 'Premium',
            color: 'gold',
            description: 'Suscripción activa'
        },
        popular: {
            icon: Flame,
            label: 'Popular',
            color: 'red',
            description: 'Altamente recomendado'
        },
        top_rated: {
            icon: Star,
            label: 'Top Rated',
            color: 'yellow',
            description: 'Calificación perfecta'
        },
        photos_verified: {
            icon: Camera,
            label: 'Fotos Verificadas',
            color: 'green',
            description: 'Imágenes auténticas'
        },
        new: {
            icon: Rocket,
            label: 'Nuevo',
            color: 'purple',
            description: 'Recién llegado'
        },
        professional: {
            icon: Briefcase,
            label: 'Profesional',
            color: 'indigo',
            description: 'Perfil completo'
        },
        updated: {
            icon: Sparkles,
            label: 'Actualizado',
            color: 'teal',
            description: 'Info reciente'
        },
        custom_branding: {
            icon: Palette,
            label: 'Marca Personalizada',
            color: 'pink',
            description: 'Logo propio'
        }
    };

    const colorClasses = {
        blue: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
        gold: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
        red: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', border: 'border-yellow-300' },
        green: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
        purple: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
        indigo: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
        teal: { bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-300' },
        pink: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' }
    };

    if (badges.length === 0) {
        return null;
    }

    // Horizontal: muestra solo iconos compactos
    if (layout === 'horizontal') {
        return (
            <div className="flex flex-wrap gap-2">
                {badges.map((badgeType) => {
                    const config = badgeConfig[badgeType];
                    if (!config) return null;

                    const Icon = config.icon;
                    const colors = colorClasses[config.color];

                    return (
                        <div
                            key={badgeType}
                            className={`flex items-center gap-1 px-2 py-1 ${colors.bg} ${colors.text} rounded-full text-xs font-medium border ${colors.border}`}
                            title={config.description}
                        >
                            <Icon className="w-4 h-4" />
                            <span>{config.label}</span>
                        </div>
                    );
                })}
            </div>
        );
    }

    // Grid: muestra badges con descripción
    return (
        <div className="grid grid-cols-2 md:gridcols-3 gap-3">
            {badges.map((badgeType) => {
                const config = badgeConfig[badgeType];
                if (!config) return null;

                const Icon = config.icon;
                const colors = colorClasses[config.color];

                return (
                    <div
                        key={badgeType}
                        className={`p-4 ${colors.bg} rounded-lg border-2 ${colors.border}`}
                    >
                        <div className="flex items-center gap-2 mb-1">
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                            <span className={`font-semibold text-sm ${colors.text}`}>
                                {config.label}
                            </span>
                        </div>
                        <p className="text-xs text-gray-600">{config.description}</p>
                    </div>
                );
            })}
        </div>
    );
};

export default BadgeDisplay;
