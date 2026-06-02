// src/components/common/AppQRCode.jsx
/**
 * QR Code component for sharing Geobooker
 * Can be used in Footer, AboutPage, business cards, etc.
 */
import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { APP_LINKS } from '../../config/appLinks';

const AppQRCode = ({
    size = 120,
    showLabel = true,
    darkMode = false,
    className = '',
    value = APP_LINKS.downloadHub,
    label = 'Escanea para descargar',
    subtitle = null
}) => {
    return (
        <div className={`flex flex-col items-center ${className}`}>
            <div className={`
        p-3 rounded-xl shadow-lg
        ${darkMode ? 'bg-white' : 'bg-white'}
      `}>
                <QRCodeSVG
                    value={value}
                    size={size}
                    level="H" // High error correction
                    includeMargin={false}
                    fgColor="#1f2937"
                    bgColor="#ffffff"
                    imageSettings={{
                        src: '/images/geobooker-logo.png',
                        x: undefined,
                        y: undefined,
                        height: size * 0.2,
                        width: size * 0.2,
                        excavate: true,
                    }}
                />
            </div>
            {showLabel && (
                <p className={`
          mt-2 text-sm font-medium text-center
          ${darkMode ? 'text-gray-300' : 'text-gray-600'}
        `}>
                    {label}
                </p>
            )}
            {subtitle ? (
                <p className={`mt-1 text-xs text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {subtitle}
                </p>
            ) : null}
        </div>
    );
};

export default AppQRCode;
