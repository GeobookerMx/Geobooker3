import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import SearchBar from '../components/SearchBar';
// Lazy load the map component for faster initial load
const BusinessMap = lazy(() => import('../components/BusinessMap'));
import LocationPermissionModal from '../components/LocationPermissionModal';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { searchNearbyPlaces } from '../services/googlePlacesService';
import { cacheBusinesses, getCachedBusinesses, isCacheValid } from '../services/businessCacheService';
import { MapPin, Loader2 } from 'lucide-react';

// Map loading fallback component
const MapLoadingFallback = () => (
  <div className="w-full h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex flex-col items-center justify-center">
    <div className="animate-spin mb-4">
      <MapPin className="w-12 h-12 text-blue-500" />
    </div>
    <p className="text-gray-600 font-medium">Cargando mapa...</p>
    <p className="text-gray-400 text-sm mt-1">Ubicando negocios cercanos</p>
  </div>
);
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
import ReferralFloatingWidget from '../components/referral/ReferralFloatingWidget';
import ChristmasPromoModal from '../components/referral/ChristmasPromoModal';
import AIRecommendations from '../components/recommendations/AIRecommendations';
// Guest search limit
import { useGuestSearchLimit } from '../hooks/useGuestSearchLimit';
import GuestLoginPromptModal from '../components/modals/GuestLoginPromptModal';
import OpenNowFilter from '../components/common/OpenNowFilter';
import LocationRefreshButton from '../components/common/LocationRefreshButton';
import { isBusinessOpen } from '../utils/businessHours';

const HomePage = () => {
  const { t } = useTranslation();
  const { category, subcategory, city } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userLocation, loading: locationLoading, permissionGranted, requestLocationPermission, refreshLocation } = useLocation();
  const [searchLoading, setSearchLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]); // Google Places
  const [geobookerBusinesses, setGeobookerBusinesses] = useState([]); // Native Businesses
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [openNowFilter, setOpenNowFilter] = useState(false); // Filtro abierto ahora
  const [lastSearchQuery, setLastSearchQuery] = useState(''); // Para persistencia
  const navigate = useNavigate();

  // Filtros de categoría desde URL (parámetros de consulta o ruta)
  const categoryFilter = category || searchParams.get('category');
  const subcategoryFilter = subcategory || searchParams.get('subcategory');
  const cityFilter = city || searchParams.get('city');

  // SEO dinámico basado en filtros
  const getSEOTitle = () => {
    if (cityFilter && categoryFilter) return `Los mejores ${categoryFilter} en ${cityFilter}`;
    if (categoryFilter) return `${categoryFilter} cerca de mí`;
    if (cityFilter) return `Negocios y servicios en ${cityFilter}`;
    return 'Geobooker - Encuentra Negocios Cerca de Ti';
  };

  const getSEODescription = () => {
    if (cityFilter) return `Explora el mapa interactivo de ${cityFilter}. Encuentra restaurantes, farmacias, tiendas y más en Geobooker.`;
    return 'Encuentra negocios locales cerca de tu ubicación. Mapa interactivo con restaurantes, tiendas y servicios.';
  };

  // Sistema de Interstitial Ads
  const { showInterstitial, incrementSearchCount, closeInterstitial } = useInterstitialTrigger();

  // Sistema de límite de búsquedas para invitados
  const {
    canSearch: canGuestSearch,
    recordSearch: recordGuestSearch,
    showLoginPrompt,
    closeLoginPrompt,
    isGuest
  } = useGuestSearchLimit();

  // ==========================================
  // PERSISTENCIA DE ESTADO DE BÚSQUEDA
  // ==========================================

  // Restaurar estado desde sessionStorage al montar
  useEffect(() => {
    const savedState = sessionStorage.getItem('geobooker_search_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        // Restaurar negocios de Places si hay guardados
        if (state.businesses && state.businesses.length > 0) {
          setBusinesses(state.businesses);
        }
        // Restaurar query
        if (state.lastQuery) {
          setLastSearchQuery(state.lastQuery);
        }
      } catch (e) {
        console.log('Error restaurando estado:', e);
      }
    }
  }, []);

  // Guardar estado cuando cambian los negocios
  useEffect(() => {
    if (businesses.length > 0 || lastSearchQuery) {
      const stateToSave = {
        businesses: businesses.slice(0, 50), // Limitar para no saturar storage
        lastQuery: lastSearchQuery,
        timestamp: Date.now()
      };
      sessionStorage.setItem('geobooker_search_state', JSON.stringify(stateToSave));
    }
  }, [businesses, lastSearchQuery]);

  // Limpiar búsqueda (botón separado)
  const handleClearSearch = () => {
    setBusinesses([]);
    setLastSearchQuery('');
    setSelectedBusiness(null);
    sessionStorage.removeItem('geobooker_search_state');
    // Limpiar URL params de búsqueda pero mantener ubicación
    setSearchParams({});
    toast.success('Búsqueda limpiada');
  };

  // Cargar negocios nativos de Geobooker (CON CACHÉ IndexedDB)
  useEffect(() => {
    const fetchGeobookerBusinesses = async () => {
      try {
        // ⚡ PASO 1: Intentar cargar desde caché primero (instantáneo)
        const cacheStatus = await isCacheValid(userLocation);
        if (cacheStatus.isValid && !categoryFilter) {
          const cachedBusinesses = await getCachedBusinesses();
          if (cachedBusinesses.length > 0) {
            setGeobookerBusinesses(cachedBusinesses);
            return; // Usar caché, no llamar a Supabase
          }
        }

        // ⚡ PASO 2: Si caché no es válido o está vacío, cargar desde Supabase

        let query = supabase
          .from('businesses')
          .select('*')
          .eq('status', 'approved')
          .eq('is_visible', true); // Only show businesses that owners have set as visible

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

          // ⚡ PASO 3: Guardar en caché para futuras cargas (solo sin filtro)
          if (!categoryFilter && userLocation && businessesWithPremium.length > 0) {
            cacheBusinesses(businessesWithPremium, userLocation);
          }

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
  }, [categoryFilter, subcategoryFilter, userLocation]);

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

    // Registrar búsqueda de invitado (mostrará modal si excede límite)
    if (isGuest) {
      recordGuestSearch();
    }

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

  // Handler para ver perfil de negocio - DISTINGUE entre Places y Nativos
  const handleViewBusinessProfile = (business) => {
    if (!business) {
      toast.error('Este negocio no tiene perfil disponible');
      return;
    }

    // Si es de Google Places (tiene placeId o isFromGoogle)
    if (business.isFromGoogle || (business.placeId && !business.owner_id)) {
      const placeId = business.placeId || business.id;
      navigate(`/place/${placeId}`);
    }
    // Si es negocio nativo de Geobooker (tiene owner_id o id válido de Supabase)
    else if (business.id) {
      navigate(`/business/${business.id}`);
    }
    else {
      toast.error('Este negocio no tiene perfil disponible');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* SEO Meta Tags */}
      <SEO
        title={getSEOTitle()}
        description={getSEODescription()}
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

            {/* Filtro Abierto Ahora */}
            {permissionGranted && userLocation && (
              <div className="flex justify-center mt-4">
                <OpenNowFilter
                  isActive={openNowFilter}
                  onToggle={() => setOpenNowFilter(!openNowFilter)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hero Banner Publicitario (Primera Plana) */}
      <HeroBanner />

      {/* 🤖 La IA de Geobooker te recomienda */}
      <div className="container mx-auto px-4 py-4">
        <AIRecommendations />
      </div>

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
            {/* Botón flotante para actualizar ubicación */}
            <LocationRefreshButton />
          </div>

          <Suspense fallback={<MapLoadingFallback />}>
            <BusinessMap
              userLocation={userLocation}
              businesses={businesses} // Google Places
              geobookerBusinesses={
                // Aplicar filtro "Abierto ahora" si está activo
                openNowFilter
                  ? geobookerBusinesses.filter(b => {
                    const result = isBusinessOpen(b.opening_hours);
                    return result.isOpen === true;
                  })
                  : geobookerBusinesses
              }
              selectedBusiness={selectedBusiness}
              onBusinessSelect={setSelectedBusiness}
              onViewBusinessProfile={handleViewBusinessProfile}
              zoom={businesses.length > 0 ? 13 : 12}
            />
          </Suspense>
        </div>
      </div>

      {/* CEO Quote / Pitch Section */}
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            {/* Quote icon */}
            <div className="mb-6">
              <svg className="w-12 h-12 mx-auto text-purple-400 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
            </div>

            {/* Quote text */}
            <blockquote className="mb-8">
              <p className="text-2xl md:text-3xl lg:text-4xl font-light text-white leading-relaxed" style={{ fontFamily: "'Georgia', 'Times New Roman', serif" }}>
                "Hoy millones buscan negocios <span className="text-purple-300 font-medium">'cerca de mí'</span> pero muchas búsquedas fallan por información desactualizada.
                <span className="block mt-4 text-purple-200">Geobooker resuelve eso con fichas verificables, actualización simple, y geolocalización real.</span>
                <span className="block mt-4 text-xl md:text-2xl text-gray-300">Para anunciantes: publicidad por territorio con slots limitados y métricas claras."</span>
              </p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                JP
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-lg">Lic. Juan Pablo Peña García</p>
                <p className="text-purple-300 text-sm">CEO & Founder, Geobooker Inc.</p>
              </div>
            </div>

            {/* Decorative line */}
            <div className="mt-8 flex justify-center">
              <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"></div>
            </div>
          </div>
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

        {/* Video Demo Section - YouTube Short */}
        <div className="mt-16 max-w-md mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">📹 Mira cómo funciona</h3>
            <p className="text-gray-600">Descubre cómo encontrar negocios cerca de ti</p>
          </div>

          {/* YouTube Short Embed - Vertical Format */}
          <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-black">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src="https://www.youtube.com/embed/2IaVw19pgzY"
              title="Geobooker - Cómo funciona"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Subscribe CTA */}
          <div className="text-center mt-6">
            <a
              href="https://www.youtube.com/@Geobooker"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full font-bold transition shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
              </svg>
              Suscríbete al canal
            </a>
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

      {/* Banner de Negocios Geobooker */}
      <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-semibold">
              ⭐ Negocios Verificados
            </span>
            <h3 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
              Ellos ya confían en Geobooker 💼
            </h3>
            <p className="text-gray-600">Únete a cientos de negocios que ya encontraron más clientes</p>
          </div>

          <div className="flex overflow-x-auto gap-6 pb-6 snap-x snap-mandatory scrollbar-hide justify-center flex-wrap md:flex-nowrap">
            {/* Veterinario */}
            <div className="group relative flex-shrink-0 w-56 snap-center cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl shadow-xl aspect-[3/4]">
                <img
                  src="/images/community/veterinario.jpg"
                  alt="Veterinario"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-bold text-lg">🐕 Veterinario</p>
                  <p className="text-sm text-white/80">Cuidado profesional</p>
                </div>
              </div>
            </div>

            {/* Restaurante */}
            <div className="group relative flex-shrink-0 w-56 snap-center cursor-pointer">
              <div className="relative overflow-hidden rounded-2xl shadow-xl aspect-[3/4]">
                <img
                  src="/images/community/restaurante.jpg"
                  alt="Restaurante"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-bold text-lg">🍽️ Restaurante</p>
                  <p className="text-sm text-white/80">Cocina mexicana</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Promoción Geobooker Global */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 py-16 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/30 backdrop-blur-sm text-blue-300 px-4 py-2 rounded-full mb-6">
            <span className="text-lg">🌎</span>
            <span className="text-sm font-medium">{t('globalPromo.badge', 'Publicidad Global')}</span>
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('globalPromo.homeTitle', '¿Quieres que tu marca aparezca al otro lado del mundo?')}
          </h2>
          <p className="text-gray-300 mb-10 max-w-2xl mx-auto text-lg">
            {t('globalPromo.homeSubtitle', 'Lanza o expande tu marca en una ciudad específica con Geobooker Global. Segmentación por país, idioma y categoría.')}
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-10 text-left max-w-3xl mx-auto">
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">🏪</div>
              <h4 className="font-bold text-white mb-2">Geobooker Local</h4>
              <p className="text-gray-400 text-sm">Perfecto para negocios locales y PyMEs que quieren aparecer en su ciudad. Desde $900 MXN/mes.</p>
              <Link to="/advertise" className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 inline-block">
                Ver espacios →
              </Link>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">🌍</div>
              <h4 className="font-bold text-white mb-2">Geobooker Global</h4>
              <p className="text-gray-400 text-sm">Para marcas internacionales: FIFA 2026, Super Bowl, Olimpiadas. Piloto 30 días gratis.</p>
              <Link to="/enterprise" className="text-amber-400 hover:text-amber-300 text-sm font-medium mt-3 inline-block">
                Ver planes Enterprise →
              </Link>
            </div>
          </div>

          <Link
            to="/advertise"
            className="bg-gradient-to-r from-amber-500 to-orange-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all inline-flex items-center gap-2"
          >
            {t('globalPromo.ctaLearnMore', 'Aprende cómo hacerlo')}
            <span>→</span>
          </Link>
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

      {/* Floating Referral Widget - Gamified */}
      <ReferralFloatingWidget />

      {/* Christmas Promo Modal - Seasonal */}
      <ChristmasPromoModal />

      {/* Guest Login Prompt - Aparece después de 1 búsqueda sin cuenta */}
      <GuestLoginPromptModal
        isOpen={showLoginPrompt}
        onClose={closeLoginPrompt}
      />
    </div>
  );
};

export default HomePage;