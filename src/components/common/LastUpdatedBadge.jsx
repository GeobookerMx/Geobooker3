// src/components/common/LastUpdatedBadge.jsx
/**
 * Badge que muestra cuándo se actualizó un negocio por última vez
 * Ayuda a la "frescura de datos" que es propuesta de valor de Geobooker
 */
import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * Calcula tiempo relativo en español
 */
const getRelativeTime = (dateString) => {
    if (!dateString) return null;

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffWeeks === 1) return 'Hace 1 semana';
    if (diffWeeks < 4) return `Hace ${diffWeeks} semanas`;
    if (diffMonths === 1) return 'Hace 1 mes';
    if (diffMonths < 12) return `Hace ${diffMonths} meses`;
    return 'Hace más de 1 año';
};

/**
 * Determina el color del badge según la antigüedad
 */
const getBadgeStyle = (dateString) => {
    if (!dateString) return { color: 'gray', status: 'unknown' };

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays <= 7) {
        return { color: 'green', status: 'fresh' }; // Actualizado recientemente
    } else if (diffDays <= 30) {
        return { color: 'blue', status: 'ok' }; // Actualizado este mes
    } else if (diffDays <= 90) {
        return { color: 'yellow', status: 'old' }; // Más de 1 mes
    } else {
        return { color: 'red', status: 'stale' }; // Más de 3 meses
    }
};

const colorClasses = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    gray: 'bg-gray-50 text-gray-500 border-gray-200',
};

const LastUpdatedBadge = ({
    updatedAt,
    size = 'sm', // 'sm' | 'md' | 'lg'
    showIcon = true,
    className = ''
}) => {
    const relativeTime = getRelativeTime(updatedAt);
    const { color, status } = getBadgeStyle(updatedAt);

    if (!relativeTime) {
        return null; // No mostrar si no hay fecha
    }

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    const iconSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    const Icon = status === 'fresh' ? CheckCircle : status === 'stale' ? AlertCircle : Clock;

    return (
        <span
            className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        ${colorClasses[color]} 
        ${sizeClasses[size]}
        ${className}
      `}
            title={`Última actualización: ${updatedAt ? new Date(updatedAt).toLocaleDateString('es-MX') : 'Desconocida'}`}
        >
            {showIcon && <Icon className={iconSize[size]} />}
            {relativeTime}
        </span>
    );
};

/**
 * Badge de negocio reclamado/verificado
 */
export const ClaimedBadge = ({ claimed = false, size = 'sm', className = '' }) => {
    if (!claimed) return null;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-2.5 py-1',
        lg: 'text-base px-3 py-1.5'
    };

    const iconSize = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <span
            className={`
        inline-flex items-center gap-1 rounded-full border font-medium
        bg-purple-50 text-purple-700 border-purple-200
        ${sizeClasses[size]}
        ${className}
      `}
            title="Este negocio ha sido reclamado y verificado por su dueño"
        >
            <CheckCircle className={iconSize[size]} />
            Verificado
        </span>
    );
};

export default LastUpdatedBadge;
