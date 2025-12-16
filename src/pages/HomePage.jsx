import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import SearchBar from '../components/SearchBar';
import BusinessMap from '../components/BusinessMap';
import LocationPermissionModal from '../components/LocationPermissionModal';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { searchNearbyPlaces } from '../services/googlePlacesService';
// Componentes de Publicidad
import {
  HeroBanner,
  CarouselAd,
  StickyBanner,
  InterstitialAd,
  useInterstitialTrigger
} from '../components/ads';
import RecommendedSection from '../components/ads/RecommendedSection';
import SponsoredResultCard from '../components/ads/SponsoredResultCard';
import SponsoredFullwidth from '../components/ads/SponsoredFullwidth';
import SEO from '../components/SEO';

const HomePage = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userLocation, loading: locationLoading, permissionGranted, requestLocationPermission, refreshLocation } = useLocation();
  const [searchLoading, setSearchLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]); // Google Places
  const [geobookerBusinesses, setGeobookerBusinesses] = useState([]); // Native Businesses
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const navigate = useNavigate();

  // Filtros de categoría desde URL
  const categoryFilter = searchParams.get('category');
  const subcategoryFilter = searchParams.get('subcategory');

  // Sistema de Interstitial Ads
  const { showInterstitial, incrementSearchCount, closeInterstitial } = useInterstitialTrigger();

  // Cargar negocios nativos de Geobooker (con filtros de categoría)
  useEffect(() => {
    const fetchGeobookerBusinesses = async () => {
      try {
        let query = supabase
          .from('businesses')
          .select('*')
          .eq('status', 'approved');

        // Aplicar filtros de categoría si vienen de CategoriesPage
        if (categoryFilter) {
          query = query.eq('category', categoryFilter);
        }
        if (subcategoryFilter) {
          query = query.eq('subcategory', subcategoryFilter);
        }

        const { data, error } = await query;

        if (error) throw error;
        if (data) {
          // ⭐ Obtener estado Premium de los owners usando función RPC segura
          const ownerIds = [...new Set(data.map(b => b.owner_id).filter(Boolean))];
          let premiumOwners = {};

          // Usar la función RPC para cada owner (evita error 406 de RLS)
          for (const ownerId of ownerIds) {
            try {
              const { data: isPremium } = await supabase.rpc('get_user_premium_status', { user_id: ownerId });
              premiumOwners[ownerId] = isPremium || false;
            } catch (e) {
              premiumOwners[ownerId] = false;
            }
          }

          // Agregar flag is_premium_owner a cada negocio
          const businessesWithPremium = data.map(business => ({
            ...business,
            is_premium_owner: premiumOwners[business.owner_id] || false
          }));

          setGeobookerBusinesses(businessesWithPremium);

          if (categoryFilter) {
            if (businessesWithPremium.length > 0) {
              toast.success(`📍 ${businessesWithPremium.length} negocios encontrados en ${categoryFilter}`, { duration: 3000 });
            } else {
              toast(`Aún no hay negocios registrados en "${categoryFilter}". ¡Sé el primero en registrarte!`, {
                duration: 5000,
                icon: '📭'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error fetching Geobooker businesses:', error);
      }
    };

    fetchGeobookerBusinesses();
  }, [categoryFilter, subcategoryFilter]);

  // ⚡ NUEVO: Buscar en Google Places automáticamente cuando hay filtro de categoría
  useEffect(() => {
    const searchGooglePlacesWithCategory = async () => {
      // Solo buscar si hay filtro de categoría Y tenemos ubicación del usuario
      if (!categoryFilter || !userLocation) return;

      try {
        setSearchLoading(true);

        // Usar la subcategoría si existe, sino la categoría
        const searchTerm = subcategoryFilter || categoryFilter;

        // Buscar en Google Places
        const results = await searchNearbyPlaces(userLocation, searchTerm, 10000);

        if (results && results.length > 0) {
          setBusinesses(results);
          toast.success(`🔍 ${results.length} negocios de Google encontrados para "${searchTerm}"`, { duration: 3000 });
        } else {
          toast(`No se encontraron negocios de Google para "${searchTerm}"`, { icon: '📭', duration: 3000 });
        }
      } catch (error) {
        console.error('Error buscando en Google Places:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    searchGooglePlacesWithCategory();
  }, [categoryFilter, subcategoryFilter, userLocation]);

  // Mostrar modal de ubicación si no hay permiso
  useEffect(() => {
    if (!locationLoading && !permissionGranted) {
      // Mostrar modal después de 1 segundo para mejor UX
      const timer = setTimeout(() => {
        setShowLocationModal(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (userLocation && permissionGranted) {
      toast.success(`📍 ${t('home.locationObtained')}`, { duration: 3000 });
      setShowLocationModal(false);
    }
  }, [locationLoading, permissionGranted, userLocation, t]);

  const handleBusinessesFound = (foundBusinesses) => {
    setBusinesses(foundBusinesses);
    // Incrementar contador de búsquedas para trigger de interstitial
    incrementSearchCount();

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

  // Handler para ver perfil de negocio nativo de Geobooker
  const handleViewBusinessProfile = (business) => {
    if (business?.id) {
      navigate(`/business/${business.id}`);
    } else {
      toast.error('Este negocio no tiene perfil disponible');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* SEO Meta Tags */}
      <SEO
        title="Geobooker - Directorio de Negocios Locales"
        description="Encuentra los mejores negocios cerca de ti. Restaurantes, farmacias, tiendas, servicios y más. El mejor directorio de negocios en México."
      />

      {/* Modal de permiso de ubicación */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRequestPermission={requestLocationPermission}
        permissionDenied={!permissionGranted && !locationLoading}
      />

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

            {/* Badge de filtro activo */}
            {categoryFilter && (
              <div className="flex justify-center mt-4">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                  <span className="mr-2">🔍 Filtrando:</span>
                  <span className="font-bold capitalize">{categoryFilter.replace('_', ' ')}</span>
                  {subcategoryFilter && <span className="mx-1">→</span>}
                  {subcategoryFilter && <span className="font-bold">{subcategoryFilter}</span>}
                  <button
                    onClick={() => setSearchParams({})}
                    className="ml-3 bg-white/30 hover:bg-white/50 rounded-full w-6 h-6 flex items-center justify-center transition"
                    title="Quitar filtro"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

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

            {/* Botón para actualizar ubicación (móviles) */}
            {!locationLoading && permissionGranted && userLocation && (
              <div className="text-center mt-4">
                <button
                  onClick={async () => {
                    try {
                      await refreshLocation();
                    } catch (error) {
                      console.error('Error actualizando ubicación:', error);
                    }
                  }}
                  className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition duration-200"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Actualizar mi ubicación
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner Publicitario (Primera Plana) */}
      <HeroBanner />

      {/* Resultados Patrocinados - Solo si hay búsqueda activa */}
      {businesses.length > 0 && (
        <div className="container mx-auto px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Primer resultado patrocinado */}
            <SponsoredResultCard context={{ search: true, location: userLocation }} />

            {/* Anuncio fullwidth después del 3er resultado */}
            <SponsoredFullwidth context={{ search: true, location: userLocation }} />

            {/* Segundo resultado patrocinado */}
            <SponsoredResultCard context={{ search: true, location: userLocation }} />
          </div>
        </div>
      )}

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
            businesses={businesses} // Google Places
            geobookerBusinesses={geobookerBusinesses} // Native Businesses
            selectedBusiness={selectedBusiness}
            onBusinessSelect={setSelectedBusiness}
            onViewBusinessProfile={handleViewBusinessProfile}
            zoom={businesses.length > 0 ? 13 : 12}
          />
        </div>
      </div>

      {/* Sección Recomendados (Segunda Plana) */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-sm mx-auto lg:max-w-none lg:grid lg:grid-cols-4 lg:gap-6">
          <div className="lg:col-span-1">
            <RecommendedSection />
          </div>
        </div>
      </div>

      {/* Carrusel de Negocios Destacados (Primera Plana) */}
      <CarouselAd />

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

      {/* Banner Inferior Sticky (Segunda Plana) */}
      <StickyBanner />

      {/* Interstitial Ad (Pantalla Completa) - Aparece después de 5 búsquedas */}
      {showInterstitial && (
        <InterstitialAd onClose={closeInterstitial} />
      )}
    </div>
  );
};

export default HomePage;