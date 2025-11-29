// src/components/common/BrandLogo.jsx
import React from "react";

const BrandLogo = ({ className = "", size = 48 }) => {
  return (
    <img
      src="/assets/logo/logo.png"
      alt="Logotipo Geobooker"
      className={`select-none object-contain ${className}`}
      style={{
        height: `${size}px`,
        width: "auto",
      }}
      draggable="false"
      loading="lazy"
    />
  );
};

export default BrandLogo;
