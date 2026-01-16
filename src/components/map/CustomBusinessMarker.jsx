// Marker Personalizado para Mapa con 3 Estilos
// src/components/map/CustomBusinessMarker.jsx

import React, { useState } from 'react';
import { MapPin } from 'lucide-react';
import './CustomBusinessMarker.css';

const CustomBusinessMarker = ({ business, onClick, onHover, isHovered }) => {
    const [showTooltip, setShowTooltip] = useState(false);

    if (!business) return null;

    const markerStyle = business.marker_style || 'pin';
    const hasLogo = business.logo_url;

    // Render según estilo
    const renderMarker = () => {
        switch (markerStyle) {
            case 'logo_pin':
                return hasLogo ? (
                    <div className={`marker-logo-pin ${isHovered ? 'hovered' : ''}`}>
                        <div className="logo-container">
                            <img src={business.logo_url} alt={business.name} />
                        </div>
                        <div className="pin-arrow">▼</div>
                        {renderBadges()}
                    </div>
                ) : renderStandardPin();

            case 'logo_circle':
                return hasLogo && business.is_premium ? (
                    <div className={`marker-logo-circle ${isHovered ? 'hovered' : ''}`}>
                        <div className="circle-container">
                            <img src={business.logo_url} alt={business.name} className="circular-logo" />
                            {business.is_verified && (
                                <div className="verified-badge">✓</div>
                            )}
                        </div>
                        {renderBadges()}
                    </div>
                ) : renderStandardPin();

            default: // pin
                return renderStandardPin();
        }
    };

    const renderStandardPin = () => {
        const categoryColors = {
            'Restaurante': '#EF4444',
            'Cafetería': '#F59E0B',
            'Hotel': '#8B5CF6',
            'Tienda': '#10B981',
            'Servicio': '#3B82F6',
            'default': '#6B7280'
        };

        const color = categoryColors[business.category] || categoryColors.default;

        return (
            <div className={`marker-standard ${isHovered ? 'hovered' : ''}`}>
                <MapPin
                    style={{ color }}
                    className="pin-icon"
                    fill={color}
                />
                {renderBadges()}
            </div>
        );
    };

    const renderBadges = () => {
        if (!business.active_badges || business.active_badges.length === 0) return null;

        const badgeIcons = {
            verified: '✅',
            premium: '🏆',
            popular: '🔥',
            top_rated: '⭐',
            updated: '✨'
        };

        // Mostrar solo los 2 badges más importantes
        const topBadges = business.active_badges
            .filter(b => ['verified', 'premium', 'popular', 'top_rated'].includes(b))
            .slice(0, 2);

        return (
            <div className="marker-badges">
                {topBadges.map(badge => (
                    <span key={badge} className="badge-icon">
                        {badgeIcons[badge]}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div
            className="custom-business-marker"
            onClick={() => onClick && onClick(business)}
            onMouseEnter={() => {
                setShowTooltip(true);
                onHover && onHover(business);
            }}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {renderMarker()}

            {/* Tooltip on hover */}
            {showTooltip && (
                <div className="marker-tooltip">
                    <div className="tooltip-header">
                        {hasLogo && markerStyle !== 'pin' && (
                            <img src={business.logo_url} className="tooltip-logo" alt="" />
                        )}
                        <div>
                            <h4 className="tooltip-name">{business.name}</h4>
                            <div className="tooltip-badges">
                                {business.active_badges?.map(badge => (
                                    <span key={badge} className="badge-mini">
                                        {badge === 'verified' && '✅'}
                                        {badge === 'premium' && '🏆'}
                                        {badge === 'popular' && '🔥'}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {business.average_rating > 0 && (
                        <div className="tooltip-rating">
                            ⭐ {business.average_rating.toFixed(1)} ({business.total_reviews})
                        </div>
                    )}

                    <div className="tooltip-meta">
                        <span>{business.category}</span>
                        {business.distance && <span>• {business.distance}m</span>}
                        <span className={business.is_open ? 'status-open' : 'status-closed'}>
                            {business.is_open ? '🟢 Abierto' : '🔴 Cerrado'}
                        </span>
                    </div>

                    <div className="tooltip-actions">
                        <button className="btn-primary">Ver Perfil</button>
                        <button className="btn-secondary">WhatsApp</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomBusinessMarker;
