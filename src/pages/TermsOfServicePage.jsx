import React from 'react';

const TermsOfServicePage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Términos de Servicio</h1>
      <div className="bg-white p-6 rounded-lg shadow-md">
        <p className="text-gray-600 mb-4">
          Bienvenido a Geobooker. Al utilizar nuestra plataforma, aceptas los siguientes términos y condiciones.
        </p>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Uso Aceptable</h2>
          <p className="text-gray-600">
            Te comprometes a usar Geobooker únicamente para fines legales y de acuerdo con estos términos.
          </p>
        </div>
        
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Propiedad Intelectual</h2>
          <p className="text-gray-600">
            Todo el contenido de Geobooker está protegido por derechos de autor y otras leyes de propiedad intelectual.
          </p>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;//