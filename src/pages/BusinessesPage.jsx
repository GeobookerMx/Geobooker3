import React from 'react';

const BusinessesPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">Todos los Negocios</h1>
      <p className="text-gray-600 mb-8">
        Explora todos los negocios registrados en nuestra plataforma. Pronto podrás filtrar por categoría, 
        ubicación y más características.
      </p>
      
      <div className="bg-white p-6 rounded-lg shadow-md text-center">
        <p className="text-gray-500">
          El listado completo de negocios estará disponible próximamente.
        </p>
      </div>
    </div>
  );
};

export default BusinessesPage;