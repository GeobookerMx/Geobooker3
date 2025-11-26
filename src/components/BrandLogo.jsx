// src/components/common/BrandLogo.jsx
import React from "react";
import PropTypes from "prop-types";

/**
 * Componente de logo optimizado para todos los tamaños y despliegues.
 * Usa Tailwind para un estilo consistente en toda la app.
 */
const BrandLogo = ({ className = "", size = 48 }) => {
  return (
    <img
      src="/assets/logo/logo.png"
      alt="Logo Rama"
      className={`object-contain ${className}`}
      style={{
        height: `${size}px`,
        width: "auto",
      }}
      draggable="false"
    />
  );
};

BrandLogo.propTypes = {
  className: PropTypes.string,
  size: PropTypes.number,
};

export default BrandLogo;
