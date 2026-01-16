// Widget Visual de Trust Score
// src/components/business/TrustScoreWidget.jsx

import React from 'react';
import { Shield, TrendingUp, Award, CheckCircle } from 'lucide-react';

const TrustScoreWidget = ({ trustScore = 0, breakdown }) => {
    // Determinar nivel de confianza
    const getTrustLevel = (score) => {
        if (score >= 90) return { label: 'Excelente', color: 'green', icon: Award };
        if (score >= 75) return { label: 'Muy Confiable', color: 'blue', icon: CheckCircle };
        if (score >= 60) return { label: 'Confiable', color: 'yellow', icon: Shield };
        if (score >= 40) return { label: 'En Desarrollo', color: 'orange', icon: TrendingUp };
        return { label: 'Nuevo', color: 'gray', icon: Shield };
    };

    const level = getTrustLevel(trustScore);
    const LevelIcon = level.icon;

    const colorClasses = {
        green: { bg: 'bg-green-100', text: 'text-green-800', bar: 'bg-green-500', border: 'border-green-200' },
        blue: { bg: 'bg-blue-100', text: 'text-blue-800', bar: 'bg-blue-500', border: 'border-blue-200' },
        yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', bar: 'bg-yellow-500', border: 'border-yellow-200' },
        orange: { bg: 'bg-orange-100', text: 'text-orange-800', bar: 'bg-orange-500', border: 'border-orange-200' },
        gray: { bg: 'bg-gray-100', text: 'text-gray-800', bar: 'bg-gray-500', border: 'border-gray-200' }
    };

    const colors = colorClasses[level.color];

    return (
        <div className={`rounded-xl border-2 ${colors.border} ${colors.bg} p-6`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Shield className={`w-6 h-6 ${colors.text}`} />
                    <h3 className={`font-bold ${colors.text}`}>Trust Score</h3>
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 bg-white rounded-full ${colors.text}`}>
                    <LevelIcon className="w-4 h-4" />
                    <span className="text-sm font-semibold">{level.label}</span>
                </div>
            </div>

            {/* Score Circle */}
            <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32">
                    {/* Background circle */}
                    <svg className="w-full h-full transform -rotate-90">
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            className="text-white opacity-50"
                        />
                        {/* Progress circle */}
                        <circle
                            cx="64"
                            cy="64"
                            r="56"
                            stroke="currentColor"
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 56}`}
                            strokeDashoffset={`${2 * Math.PI * 56 * (1 - trustScore / 100)}`}
                            className={colors.text}
                            strokeLinecap="round"
                        />
                    </svg>
                    {/* Score number */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                            <p className={`text-4xl font-bold ${colors.text}`}>{trustScore}</p>
                            <p className="text-xs text-gray-600">de 100</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
                <div className="h-3 bg-white rounded-full overflow-hidden">
                    <div
                        className={`h-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${trustScore}%` }}
                    />
                </div>
            </div>

            {/* Breakdown (si está disponible) */}
            {breakdown && (
                <div className="space-y-2">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Desglose:</p>
                    {breakdown.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">{item.label}</span>
                            <span className={`font-semibold ${colors.text}`}>
                                {item.points}/{item.max}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            <div className="mt-4 pt-4 border-t border-white">
                <p className="text-xs text-gray-600">
                    El Trust Score se calcula automáticamente según verificación, reseñas,
                    completitud del perfil y actualización de información.
                </p>
            </div>
        </div>
    );
};

export default TrustScoreWidget;
