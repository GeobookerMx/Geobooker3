import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

const BusinessManager = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadBusinesses();
  }, []);

  const loadBusinesses = async () => {
    try {
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBusinesses(data || []);
    } catch (error) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredBusinesses = businesses.filter(business =>
    business.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    business.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApprove = async (businessId) => {
    try {
      const { error } = await supabase
        .from('businesses')
        .update({ status: 'approved' })
        .eq('id', businessId);

      if (error) throw error;
      
      // Actualizar lista local
      setBusinesses(businesses.map(business =>
        business.id === businessId ? { ...business, status: 'approved' } : business
      ));
    } catch (error) {
      console.error('Error approving business:', error);
    }
  };

  const handleDelete = async (businessId) => {
    if (window.confirm('¿Estás seguro de eliminar este negocio?')) {
      try {
        const { error } = await supabase
          .from('businesses')
          .delete()
          .eq('id', businessId);

        if (error) throw error;
        
        setBusinesses(businesses.filter(business => business.id !== businessId));
      } catch (error) {
        console.error('Error deleting business:', error);
      }
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
        <h1 className="text-3xl font-bold text-gray-800">Gestión de Negocios</h1>
        <p className="text-gray-600">Administra todos los negocios registrados en la plataforma</p>
      </div>

      {/* Barra de Búsqueda y Filtros */}
      <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar negocios por nombre o categoría..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-200">
              Filtrar
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-200">
              Exportar
            </button>
          </div>
        </div>
      </div>

      {/* Lista de Negocios */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Negocio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contacto
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
              {filteredBusinesses.map((business) => (
                <tr key={business.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{business.business_name}</div>
                      <div className="text-sm text-gray-500">{business.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {business.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {business.email}
                    {business.phone && <div>{business.phone}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      business.status === 'approved' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {business.status === 'approved' ? 'Aprobado' : 'Pendiente'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {business.status !== 'approved' && (
                      <button
                        onClick={() => handleApprove(business.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Aprobar
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(business.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Eliminar
                    </button>
                    <button className="text-blue-600 hover:text-blue-900">
                      Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredBusinesses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No se encontraron negocios
        </div>
      )}
    </div>
  );
};

export default BusinessManager;//