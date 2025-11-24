// src/pages/admin/UserManager.jsx
import React from 'react';

// Este es el componente que gestionará los usuarios
const UserManager = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Usuarios</h1>
        <p className="text-gray-600">Administra los usuarios registrados en la plataforma</p>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <p className="text-gray-600">
          Aquí podrás ver, aprobar, editar y eliminar usuarios. 
          Esta funcionalidad se conectará con la base de datos de Supabase.
        </p>
        {/* En el futuro aquí irá una tabla o lista de usuarios */}
      </div>
    </div>
  );
};

// Exportación CORRECTA para que App.jsx pueda importarlo
export default UserManager;//