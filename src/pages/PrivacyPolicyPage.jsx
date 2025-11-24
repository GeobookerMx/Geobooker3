import React from 'react';

const PrivacyPolicyPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Política de Privacidad</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">1. Información que Recopilamos</h2>
          <p className="text-gray-600 mb-4">
            En Geobooker recopilamos información necesaria para proporcionarte nuestros servicios, 
            incluyendo datos de contacto, información de negocios y preferencias de usuario.
          </p>
        </section>
        
        <section className="mb-6">
          <h2 className="text-xl font-semibold text-gray-700 mb-3">2. Uso de la Información</h2>
          <p className="text-gray-600">
            Utilizamos tu información para mejorar nuestros servicios, personalizar tu experiencia 
            y comunicarnos contigo sobre actualizaciones importantes.
          </p>
        </section>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage; //