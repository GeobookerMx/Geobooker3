// src/pages/admin/AdvertisingManager.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const AdvertisingManager = () => {
  const [adSpaces, setAdSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Espacios publicitarios configurables
  const initialAdSpaces = [
    { id: 1, name: 'Primera Plana', price: 299, active: true, position: 'header' },
    { id: 2, name: 'Segunda Plana', price: 199, active: true, position: 'sidebar' },
    { id: 3, name: 'Banner Home', price: 149, active: true, position: 'home' },
    { id: 4, name: 'Banner Búsqueda', price: 129, active: true, position: 'search' }
  ];

  useEffect(() => {
    initializeAdSpaces();
  }, []);

  const initializeAdSpaces = async () => {
    try {
      // Verificar si ya existen espacios en la base de datos
      const { data: existingSpaces } = await supabase
        .from('advertising_spaces')
        .select('*');

      if (!existingSpaces || existingSpaces.length === 0) {
        // Insertar espacios iniciales
        const { error } = await supabase
          .from('advertising_spaces')
          .insert(initialAdSpaces);
        
        if (error) throw error;
        setAdSpaces(initialAdSpaces);
      } else {
        setAdSpaces(existingSpaces);
      }
    } catch (error) {
      console.error('Error initializing ad spaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAdSpace = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('advertising_spaces')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      // Actualizar estado local
      setAdSpaces(adSpaces.map(space => 
        space.id === id ? { ...space, ...updates } : space
      ));
    } catch (error) {
      console.error('Error updating ad space:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Publicidad</h1>
        <p className="text-gray-600">Configura los espacios publicitarios y promociones</p>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Espacios Activos</p>
              <h3 className="text-2xl font-bold text-gray-800">
                {adSpaces.filter(space => space.active).length}
              </h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <span className="text-green-600 text-xl">📢</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Ingresos Mensuales</p>
              <h3 className="text-2xl font-bold text-gray-800">
                ${adSpaces.reduce((total, space) => total + (space.active ? space.price : 0), 0)}
              </h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 text-xl">💰</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Espacios Totales</p>
              <h3 className="text-2xl font-bold text-gray-800">{adSpaces.length}</h3>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 text-xl">🏢</span>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Espacios Publicitarios */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Espacios Publicitarios</h2>
          <p className="text-gray-600 text-sm">Gestiona los espacios disponibles para publicidad</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Espacio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Posición
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio/Mes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {adSpaces.map((space) => (
                <tr key={space.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{space.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                      {space.position}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${space.price}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      space.active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {space.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button
                      onClick={() => updateAdSpace(space.id, { active: !space.active })}
                      className={`px-3 py-1 rounded text-xs ${
                        space.active 
                          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {space.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Configuración Adicional */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Configuración de Precios</h3>
          <p className="text-gray-600 text-sm mb-4">
            Aquí puedes ajustar los precios de los espacios publicitarios según las demandas del mercado.
          </p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200">
            Gestionar Precios
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Reportes de Rendimiento</h3>
          <p className="text-gray-600 text-sm mb-4">
            Genera reportes detallados del rendimiento de cada espacio publicitario.
          </p>
          <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition duration-200">
            Generar Reportes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdvertisingManager; //