import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from '../contexts/LocationContext';
import { supabase } from '../lib/supabase';

const SearchBar = ({ onSearch, onBusinessesFound, loading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { userLocation, permissionGranted, requestLocationPermission } = useLocation();

  // Categorías populares para sugerencias
  const popularCategories = [
    'Barbería', 'Restaurante', 'Farmacia', 'Supermercado', 
    'Gimnasio', 'Veterinaria', 'Taller mecánico', 'Lavandería',
    'Cafetería', 'Panadería', 'Hospital', 'Escuela'
  ];

  // Función optimizada para calcular distancia
  const calculateDistance = useCallback((lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  // Búsqueda optimizada por categoría exacta
  const handleSearch = async (searchQuery = searchTerm, isExactCategory = false) => {
    if (!searchQuery.trim()) return;
    
    // Si no hay ubicación, solicitarla
    if (!userLocation) {
      try {
        await requestLocationPermission();
      } catch (error) {
        console.error('Error obteniendo ubicación:', error);
        return;
      }
    }

    try {
      onSearch(true);
      
      let query = supabase
        .from('businesses')
        .select('*')
        .limit(20);

      // Búsqueda por categoría exacta cuando se selecciona de sugerencias
      if (isExactCategory) {
        query = query.eq('category', searchQuery);
      } else {
        // Búsqueda flexible por nombre o categoría
        query = query.or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%`);
      }

      const { data: businesses, error } = await query;

      if (error) throw error;

      // Filtrar negocios por distancia (radio de 10km)
      const nearbyBusinesses = businesses?.filter(business => {
        if (!business.latitude || !business.longitude) return false;
        
        const distance = calculateDistance(
          userLocation.lat,
          userLocation.lng,
          business.latitude,
          business.longitude
        );
        
        return distance <= 10; // 10km radius
      }) || [];

      onBusinessesFound(nearbyBusinesses);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error buscando negocios:', error);
    } finally {
      onSearch(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    handleSearch(suggestion, true); // Búsqueda exacta por categoría
  };

  const handleRetryLocation = async () => {
    try {
      await requestLocationPermission();
    } catch (error) {
      console.error('Error solicitando ubicación:', error);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative">
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="¿Qué negocio o servicio buscas?"
          className="w-full px-6 py-4 text-lg border border-gray-300 rounded-full shadow-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-200"
          disabled={loading}
        />
        
        <button
          onClick={() => handleSearch()}
          disabled={loading || !searchTerm.trim()}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition duration-200"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {/* Sugerencias */}
      {showSuggestions && searchTerm && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg mt-2 z-10 max-h-60 overflow-y-auto">
          {popularCategories
            .filter(cat => cat.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((category, index) => (
              <div
                key={index}
                className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                onClick={() => handleSuggestionClick(category)}
              >
                <div className="flex items-center">
                  <svg className="w-4 h-4 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-gray-700">{category}</span>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Estado de ubicación */}
      {!permissionGranted && (
        <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-orange-500 mr-2">📍</span>
              <p className="text-orange-700 text-sm">
                Necesitamos tu ubicación para mostrarte negocios cercanos
              </p>
            </div>
            <button
              onClick={handleRetryLocation}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition duration-200"
            >
              Permitir Ubicación
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;