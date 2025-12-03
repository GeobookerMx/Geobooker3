import React from 'react';

const BrandLogo = ({ size = 48, className = '' }) => {
  return (
    <img
      src="/images/geobooker-logo.png"
      alt="Geobooker"
      style={{ height: `${size}px`, width: 'auto' }}
      className={`select-none object-contain ${className}`}
      draggable="false"
      loading="lazy"
    />
  );
};

export default BrandLogo;
