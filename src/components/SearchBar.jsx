import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../contexts/LocationContext';
import { searchPlacesUniversal } from '../services/googlePlacesService';
import { inferUserCountry, searchBusinessesSemantically } from '../services/businessService';
import { trackSearch } from '../services/analyticsService';
import { isAwardSearchQuery } from '../utils/awardUtils';

const SearchBar = ({ onSearch, onBusinessesFound, loading, initialValue = '' }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { userLocation, permissionGranted, requestLocationPermission } = useLocation();

  useEffect(() => {
    setSearchTerm(initialValue || '');
  }, [initialValue]);

  const popularCategories = [
    'Farmacia 24 horas', 'Restaurante', 'Barberia cerca', 'Supermercado',
    'Gimnasio', 'Veterinaria', 'Taller mecanico cerca', 'Lavanderia',
    'Cafeteria', 'Panaderia', 'Hospital', 'Escuela',
    'Michelin', 'Fine dining', 'Tasting menu', 'Hotel',
    'Cerrajero urgente', 'Talacha o vulcanizadora', 'Mudanza o flete', 'Nail salon', 'Spa',
    'Coffee shop near me', 'Pharmacy near me', 'Locksmith near me', 'Plumber near me'
  ];

  const handleSearch = async (searchQuery = searchTerm) => {
    if (!searchQuery.trim()) return;

    let effectiveLocation = userLocation;
    let loadingTimeout = null;

    try {
      onSearch(true);

      const semanticResults = await searchBusinessesSemantically(
        searchQuery,
        inferUserCountry()
      );

      if (semanticResults.length > 0) {
        trackSearch(searchQuery, {
          resultsCount: semanticResults.length,
          userLat: effectiveLocation?.lat || null,
          userLng: effectiveLocation?.lng || null
        });

        onBusinessesFound(semanticResults, {
          query: searchQuery,
          source: 'semantic',
          isAwardSearch: isAwardSearchQuery(searchQuery)
        });
        setShowSuggestions(false);
        return;
      }

      if (!effectiveLocation) {
        try {
          effectiveLocation = await requestLocationPermission();
        } catch (error) {
          console.error('Error obteniendo ubicacion:', error);
          onBusinessesFound([], { query: searchQuery, source: 'permission_denied' });
          return;
        }
      }

      loadingTimeout = setTimeout(() => {
        console.warn('SearchBar timeout de 15s alcanzado, liberando loading');
        onSearch(false);
        onBusinessesFound([], { query: searchQuery, source: 'timeout' });
      }, 15000);

      if (!window.google || !window.google.maps) {
        console.error('Google Maps no esta disponible');
        onBusinessesFound([], { query: searchQuery, source: 'google_unavailable' });
        return;
      }

      const businesses = await searchPlacesUniversal(effectiveLocation, searchQuery, 10000);

      trackSearch(searchQuery, {
        resultsCount: businesses?.length || 0,
        userLat: effectiveLocation?.lat || null,
        userLng: effectiveLocation?.lng || null
      });

      onBusinessesFound(businesses, { query: searchQuery, source: 'google' });
      setShowSuggestions(false);
    } catch (error) {
      console.error('Error buscando negocios:', error);
      onBusinessesFound([], { query: searchQuery, source: 'error' });
    } finally {
      onSearch(false);
      if (loadingTimeout) clearTimeout(loadingTimeout);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    handleSearch(suggestion);
  };

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      {permissionGranted && userLocation && (
        <div className="mb-2 flex items-center justify-center text-sm text-green-600">
          <svg className="mr-1 h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          <span>Ubicacion activa</span>
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setShowSuggestions(true);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('home.searchPlaceholder', { defaultValue: 'Que negocio buscas? Ej: farmacia, Michelin, tacos...' })}
          className="w-full rounded-full border-2 border-gray-200 bg-white px-6 py-4 text-lg text-gray-900 shadow-lg outline-none transition duration-200 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />

        {loading && searchTerm && (
          <div className="absolute left-6 top-full mt-1 text-sm font-medium text-blue-600">
            Buscando "{searchTerm}"...
          </div>
        )}

        <button
          onClick={() => handleSearch()}
          disabled={loading || !searchTerm.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-blue-600 p-3 text-white transition duration-200 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-t-2 border-white"></div>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </button>
      </div>

      {showSuggestions && searchTerm && (
        <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {popularCategories
            .filter((category) => category.toLowerCase().includes(searchTerm.toLowerCase()))
            .map((category, index) => (
              <div
                key={index}
                className="cursor-pointer border-b border-gray-100 px-4 py-3 hover:bg-gray-50 last:border-b-0"
                onClick={() => handleSuggestionClick(category)}
              >
                <div className="flex items-center">
                  <svg className="mr-3 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span className="text-gray-700">{category}</span>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
