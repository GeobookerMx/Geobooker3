import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from '../contexts/LocationContext';
import SearchBar from '../components/SearchBar';
import BusinessMap from '../components/BusinessMap';
import { toast } from 'react-hot-toast';

const HomePage = () => {
  const { t } = useTranslation();
  const { userLocation, loading: locationLoading, permissionGranted, requestLocationPermission } = useLocation();
  const [searchLoading, setSearchLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);

  useEffect(() => {
    // Si no hay permiso al cargar, mostrar toast
    if (!locationLoading && !permissionGranted) {
      toast.error(t('home.enableLocation'), {
        duration: 5000,
      });
    }
  }, [locationLoading, permissionGranted, t]);

  const handleBusinessesFound = (foundBusinesses) => {
    setBusinesses(foundBusinesses);
    if (foundBusinesses.length === 0) {
      toast.error(t('home.noBusinessesFound'));
    } else {
      toast.success(t('home.foundBusinesses', { count: foundBusinesses.length }));
    }
  };

  const handleRetryLocation = async () => {
    try {
      await requestLocationPermission();
      toast.success(t('home.locationObtained'));
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header con búsqueda */}
      <div className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-gray-800 mb-3">
              {t('home.title')}
            </h1>
            <p className="text-gray-600 text-lg">
              {t('home.subtitle')}
            </p>
          </div>

          <SearchBar
            onSearch={setSearchLoading}
            onBusinessesFound={handleBusinessesFound}
            loading={searchLoading}
          />

          {/* Estado de ubicación */}
          {locationLoading && (
            <div className="text-center mt-4">
              <div className="inline-flex items-center bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-blue-600 mr-2"></div>
                {t('home.gettingLocation')}
              </div>
            </div>
          )}

          {!locationLoading && !permissionGranted && (
            <div className="text-center mt-4">
              <div className="inline-flex flex-col items-center bg-orange-50 text-orange-700 px-6 py-4 rounded-lg max-w-md mx-auto">
                <p className="mb-3">{t('home.needLocation')}</p>
                <button
                  onClick={handleRetryLocation}
                  className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition duration-200 font-semibold"
                >
                  {t('home.allowLocation')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mapa */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {businesses.length > 0
                ? `${businesses.length} ${t('home.businessesFound')}`
                : t('home.businessMap')}
            </h2>

            {userLocation && (
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                📍 {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </div>
            )}
          </div>

          <BusinessMap
            userLocation={userLocation}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onBusinessSelect={setSelectedBusiness}
            zoom={businesses.length > 0 ? 13 : 12}
          />

          {/* Lista de negocios (opcional para móvil) */}
          {businesses.length > 0 && (
            <div className="mt-6 lg:hidden">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {t('home.businessList')}
              </h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {businesses.map((business) => (
                  <div
                    key={business.id}
                    className="bg-gray-50 p-4 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition duration-200"
                    onClick={() => setSelectedBusiness(business)}
                  >
                    <h4 className="font-semibold text-gray-800">{business.name}</h4>
                    <p className="text-gray-600 text-sm">{business.category}</p>
                    <p className="text-gray-500 text-xs mt-1">{business.address}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HomePage;