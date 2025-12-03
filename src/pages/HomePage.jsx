import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
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
    if (!locationLoading && !permissionGranted) {
      toast.error(t('home.enableLocation'), { duration: 5000 });
    }
    if (userLocation && permissionGranted) {
      toast.success(`📍 ${t('home.locationObtained')}`, { duration: 3000 });
    }
  }, [locationLoading, permissionGranted, userLocation, t]);

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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section con búsqueda */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-blue-800 text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-5xl md:text-6xl font-bold mb-4 leading-tight">
              {t('home.title')}
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-3xl mx-auto">
              {t('home.subtitle')}
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <SearchBar
              onSearch={setSearchLoading}
              onBusinessesFound={handleBusinessesFound}
              loading={searchLoading}
            />

            {locationLoading && (
              <div className="text-center mt-4">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  {t('home.gettingLocation')}
                </div>
              </div>
            )}

            {!locationLoading && !permissionGranted && (
              <div className="text-center mt-4">
                <div className="inline-flex flex-col items-center bg-white/20 backdrop-blur-sm text-white px-6 py-4 rounded-lg">
                  <p className="mb-3">{t('home.needLocation')}</p>
                  <button
                    onClick={handleRetryLocation}
                    className="bg-white text-blue-700 px-6 py-2 rounded-lg hover:bg-blue-50 transition duration-200 font-semibold"
                  >
                    {t('home.allowLocation')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mapa - Siempre visible */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              {businesses.length > 0
                ? `${businesses.length} ${t('home.businessesFound')}`
                : t('home.businessMap')}
            </h2>
          </div>

          <BusinessMap
            userLocation={userLocation}
            businesses={businesses}
            selectedBusiness={selectedBusiness}
            onBusinessSelect={setSelectedBusiness}
            zoom={businesses.length > 0 ? 13 : 12}
          />
        </div>
      </div>

      {/* Sección: Cómo Funciona */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">¿Cómo Funciona?</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Encuentra negocios cerca de ti en 3 simples pasos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Paso 1 */}
          <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">1. Busca</h3>
            <p className="text-gray-600">
              Escribe lo que necesitas: farmacias, restaurantes, talleres, y más
            </p>
          </div>

          {/* Paso 2 */}
          <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">2. Encuentra</h3>
            <p className="text-gray-600">
              Ve los negocios más cercanos a tu ubicación en tiempo real
            </p>
          </div>

          {/* Paso 3 */}
          <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">3. Llega</h3>
            <p className="text-gray-600">
              Obtén direcciones y llega rápidamente a tu destino
            </p>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-blue-200">Negocios Registrados</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50K+</div>
              <div className="text-blue-200">Usuarios Activos</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100K+</div>
              <div className="text-blue-200">Búsquedas Realizadas</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">4.8★</div>
              <div className="text-blue-200">Calificación Promedio</div>
            </div>
          </div>
        </div>
      </div>

      {/* Para Negocios */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              ¿Tienes un Negocio?
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              Registra tu negocio en Geobooker y llega a miles de clientes potenciales cerca de ti
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Visibilidad Inmediata:</strong> Aparece en búsquedas locales al instante</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Gratis hasta 2 negocios:</strong> Sin costo para empezar</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Estadísticas en Tiempo Real:</strong> Ve cuántas personas te buscan</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>Publicidad Dirigida:</strong> Llega a tu audiencia ideal</span>
              </li>
            </ul>
            <Link
              to="/business/register"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-lg hover:shadow-xl"
            >
              Registrar Mi Negocio →
            </Link>
          </div>

          <div className="relative">
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl p-8 shadow-xl">
              <div className="bg-white rounded-xl p-6 shadow-md mb-4">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    F
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Farmacia San José</h4>
                    <p className="text-sm text-gray-600">📍 A 500m de ti</p>
                  </div>
                </div>
                <div className="flex items-center text-yellow-500">
                  ★★★★★ <span className="text-gray-600 ml-2 text-sm">(4.9)</span>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md">
                <div className="flex items-center mb-3">
                  <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl mr-4">
                    R
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">Restaurante El Buen Sabor</h4>
                    <p className="text-sm text-gray-600">📍 A 1.2km de ti</p>
                  </div>
                </div>
                <div className="flex items-center text-yellow-500">
                  ★★★★☆ <span className="text-gray-600 ml-2 text-sm">(4.5)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Final */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            ¿Listo para Descubrir Negocios Cerca de Ti?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Únete a miles de usuarios que ya encuentran lo que necesitan en segundos
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-blue-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition duration-300 shadow-lg hover:shadow-xl"
          >
            Comenzar Ahora →
          </button>
        </div>
      </div>
    </div>
  );
};

export default HomePage;