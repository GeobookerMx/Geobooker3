// src/components/common/OpenNowFilter.jsx
/**
 * Filtro "Abierto ahora" para búsqueda de negocios
 * Permite filtrar solo negocios que están abiertos actualmente
 */
import React from 'react';
import { Clock, Check } from 'lucide-react';

const OpenNowFilter = ({
    isActive,
    onToggle,
    count = null, // Cantidad de negocios abiertos (opcional)
    className = ''
}) => {
    return (
        <button
            onClick={onToggle}
            className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 
        font-medium text-sm transition-all duration-200
        ${isActive
                    ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                }
        ${className}
      `}
        >
            <Clock className={`w-4 h-4 ${isActive ? 'text-green-600' : 'text-gray-400'}`} />
            <span>Abierto ahora</span>
            {isActive && <Check className="w-4 h-4 text-green-600" />}
            {count !== null && isActive && (
                <span className="ml-1 px-2 py-0.5 bg-green-200 text-green-800 rounded-full text-xs font-bold">
                    {count}
                </span>
            )}
        </button>
    );
};

/**
 * Badge de estado de apertura para tarjetas de negocio
 */
export const OpenStatusBadge = ({ openingHours, size = 'sm' }) => {
    // Importar dinámicamente para evitar dependencia circular
    const { formatOpenStatus } = require('../utils/businessHours');
    const status = formatOpenStatus(openingHours);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    const colorClasses = {
        green: 'bg-green-100 text-green-700',
        red: 'bg-red-100 text-red-700',
        gray: 'bg-gray-100 text-gray-500'
    };

    return (
        <span className={`
      inline-flex items-center gap-1 rounded-full font-medium
      ${sizeClasses[size]}
      ${colorClasses[status.color]}
    `}>
            <span>{status.icon}</span>
            <span>{status.text}</span>
        </span>
    );
};

export default OpenNowFilter;
