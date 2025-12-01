import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../contexts/LocationContext';
import { searchNearbyPlaces, searchByType, getPlaceType } from '../services/googlePlacesService';

const SearchBar = ({ onSearch, onBusinessesFound, loading }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { userLocation, permissionGranted, requestLocationPermission } = useLocation();

  // Categorías populares para sugerencias (en español)
  const popularCategories = [
    'Farmacia', 'Restaurante', 'Barbería', 'Supermercado',
    'Gimnasio', 'Veterinaria', 'Taller mecánico', 'Lavandería',
    'Cafetería', 'Panadería', 'Hospital', 'Escuela',
    'Banco', 'Gasolinera', 'Hotel'
  ];

  // Búsqueda usando Google Places API
  const handleSearch = async (searchQuery = searchTerm) => {
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

      // Verificar si el término coincide con una categoría conocida
      const placeType = getPlaceType(searchQuery);

      let businesses;
      if (placeType) {
        // Búsqueda por tipo específico
        businesses = await searchByType(userLocation, placeType, 10000); // 10km radius
      } else {
        // Búsqueda por palabra clave
        businesses = await searchNearbyPlaces(userLocation, searchQuery, 10000);
      }

      onBusinessesFound(businesses);
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error buscando negocios:', error);
      onBusinessesFound([]);
    } finally {
      onSearch(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    handleSearch(suggestion);
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
          placeholder={t('search.placeholder')}
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
                {t('home.needLocation')}
              </p>
            </div>
            <button
              onClick={handleRetryLocation}
              className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600 transition duration-200"
            >
              {t('home.allowLocation')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;