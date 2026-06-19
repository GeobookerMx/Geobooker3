import React, { useState, useEffect, lazy, Suspense, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams, useNavigate, useParams } from 'react-router-dom';
import { useLocation } from '../contexts/LocationContext';
import SearchBar from '../components/SearchBar';
// Lazy load the map component for faster initial load
const BusinessMap = lazy(() => import('../components/BusinessMap'));
import LocationPermissionModal from '../components/LocationPermissionModal';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { getCachedBusinesses, isCacheValid, cacheBusinesses } from '../services/businessCacheService';
import { getBusinessesInBounds } from '../services/denueMapService';
import { generateCacheKey, getFromCache, searchPlacesUniversal } from '../services/googlePlacesService';
import { MapPin, Loader2 } from 'lucide-react';

// Map loading fallback component
const MapLoadingFallback = () => {
  const { t } = useTranslation();
  return (
    <div className="w-full h-[500px] bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl flex flex-col items-center justify-center">
      <div className="animate-spin mb-4">
        <MapPin className="w-12 h-12 text-blue-500" />
      </div>
      <p className="text-gray-600 font-medium">{t('home.loadingMap')}</p>
      <p className="text-gray-400 text-sm mt-1">{t('home.locatingBusinesses')}</p>
    </div>
  );
};
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
import { GeobookersRecommend } from '../components/recommendations';
// Guest search limit
import { useGuestSearchLimit } from '../hooks/useGuestSearchLimit';
import GuestLoginPromptModal from '../components/modals/GuestLoginPromptModal';
// Apple Guideline 3.1.1: ocultar promos de paquetes pagos en iOS nativo
import { IS_IOS_NATIVE } from '../utils/iosStore';
import OpenNowFilter from '../components/common/OpenNowFilter';
import LocationRefreshButton from '../components/common/LocationRefreshButton';
import { isBusinessOpen } from '../utils/businessHours';
import { getAwardMeta, getAwardSearchFilter, isAwardSearchQuery, isAwardedBusiness, matchesAwardFilter } from '../utils/awardUtils';
import michelinSeed2026 from '../../data/seed/awards/michelin_mexico_2026.json';

const CITY_COORDINATES = {
  cdmx: { lat: 19.4326, lng: -99.1332 },
  guadalajara: { lat: 20.6597, lng: -103.3496 },
  monterrey: { lat: 25.6866, lng: -100.3161 },
  puebla: { lat: 19.0413, lng: -98.2062 },
  tijuana: { lat: 32.5149, lng: -117.0382 },
  merida: { lat: 20.9754, lng: -89.6220 },
  queretaro: { lat: 20.5888, lng: -100.3899 },
  leon: { lat: 21.1236, lng: -101.6800 },
  'los-angeles': { lat: 34.0522, lng: -118.2437 },
  'new-york': { lat: 40.7128, lng: -74.0060 },
  'houston': { lat: 29.7604, lng: -95.3698 },
  miami: { lat: 25.7617, lng: -80.1918 },
  london: { lat: 51.5074, lng: -0.1278 },
  manchester: { lat: 53.4808, lng: -2.2426 },
  toronto: { lat: 43.6532, lng: -79.3832 },
  vancouver: { lat: 49.2827, lng: -123.1207 }
};


const toMergedArray = (...values) => {
  const seen = new Set();
  const merged = [];

  values.flat().forEach((value) => {
    if (!value) return;

    if (Array.isArray(value)) {
      value.forEach((item) => {
        const normalized = String(item || '').trim();
        if (!normalized || seen.has(normalized)) return;
        seen.add(normalized);
        merged.push(normalized);
      });
      return;
    }

    String(value)
      .split(/[|,]/)
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        if (seen.has(item)) return;
        seen.add(item);
        merged.push(item);
      });
  });

  return merged;
};

const enrichBusinessesWithAwards = async (businesses = []) => {
  const businessIds = [...new Set(businesses.map((business) => business.id).filter(Boolean))];
  if (businessIds.length === 0) return businesses;

  const { data: awards, error } = await supabase
    .from('business_awards_active')
    .select('*')
    .in('business_id', businessIds);

  if (error) {
    console.warn('Error loading award metadata:', error.message);
    return businesses;
  }

  const awardGroups = new Map();
  (awards || []).forEach((award) => {
    const current = awardGroups.get(award.business_id) || [];
    current.push(award);
    awardGroups.set(award.business_id, current);
  });

  return businesses.map((business) => {
    const businessAwards = awardGroups.get(business.id);
    if (!businessAwards?.length) return business;

    const primaryAward = businessAwards.reduce((best, current) => {
      if (!best) return current;

      const bestScore = Number(best.award_level || 0) * 10000 + Number(best.current_award_year || best.award_year || 0);
      const currentScore = Number(current.award_level || 0) * 10000 + Number(current.current_award_year || current.award_year || 0);
      return currentScore >= bestScore ? current : best;
    }, null);

    const mergedTags = toMergedArray(
      business.tags,
      businessAwards.map((award) => award.tags),
      businessAwards.map((award) => award.active_badges),
      businessAwards.map((award) => award.search_aliases),
      businessAwards.map((award) => award.related_terms)
    );

    const mergedBadges = toMergedArray(
      business.active_badges,
      businessAwards.map((award) => award.active_badges),
      businessAwards.map((award) => award.badge_text),
      businessAwards.map((award) => award.award_name)
    );

    return {
      ...business,
      award_source: primaryAward.award_source,
      award_name: primaryAward.award_name,
      award_year: primaryAward.award_year,
      award_level: primaryAward.award_level,
      current_award_year: primaryAward.current_award_year,
      first_awarded_year: primaryAward.first_awarded_year,
      green_award: businessAwards.some((award) => Boolean(award.green_award)),
      has_tasting_menu: business.has_tasting_menu || businessAwards.some((award) => Boolean(award.has_tasting_menu)),
      is_fine_dining: business.is_fine_dining || businessAwards.some((award) => Boolean(award.is_fine_dining || award.award_source?.toLowerCase().includes('michelin'))),
      source_url: primaryAward.source_url,
      last_verified_at: primaryAward.last_verified_at,
      verification_status: primaryAward.verification_status,
      tags: mergedTags.length > 0 ? mergedTags : business.tags,
      active_badges: mergedBadges.length > 0 ? mergedBadges : business.active_badges,
      search_aliases: toMergedArray(business.search_aliases, businessAwards.map((award) => award.search_aliases)),
      related_terms: toMergedArray(business.related_terms, businessAwards.map((award) => award.related_terms))
    };
  });
};

const fetchAwardBusinessesInBounds = async (bounds, limit = 400) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .gte('latitude', bounds.south)
    .lte('latitude', bounds.north)
    .gte('longitude', bounds.west)
    .lte('longitude', bounds.east)
    .limit(limit);

  if (error) {
    throw error;
  }

  const visibleBusinesses = (data || []).filter((business) => business?.is_visible !== false);
  const enrichedBusinesses = await enrichBusinessesWithAwards(visibleBusinesses);

  return enrichedBusinesses
    .filter(isAwardedBusiness)
    .map((business) => ({
      ...business,
      lat: business.latitude,
      lng: business.longitude,
      source_type: business.source_type || 'award_directory'
    }));
};

const filterBusinessesInBounds = (businesses, bounds) =>
  businesses.filter((business) => {
    const lat = Number(business.latitude ?? business.lat);
    const lng = Number(business.longitude ?? business.lng);
    return !isNaN(lat) && !isNaN(lng) &&
      lat >= bounds.south && lat <= bounds.north &&
      lng >= bounds.west && lng <= bounds.east;
  });

// ✅ Los restaurantes del seed ya tienen lat/lng hardcodeados — no necesitamos geocodificar
const getAwardSeedFallbackBusinesses = async (bounds, awardFilter) => {
  const matchingSeedBusinesses = michelinSeed2026
    .filter((business) => matchesAwardFilter(business, awardFilter))
    .map((business) => ({
      ...business,
      id: `michelin-seed-${business.name}-${business.city}`.replace(/\s+/g, '_').toLowerCase(),
      // Asegurar que lat/lng y latitude/longitude están presentes
      lat: Number(business.lat ?? business.latitude),
      lng: Number(business.lng ?? business.longitude),
      latitude: Number(business.latitude ?? business.lat),
      longitude: Number(business.longitude ?? business.lng),
      source_type: 'michelin_seed_local'
    }))
    .filter((b) => !isNaN(b.lat) && !isNaN(b.lng)); // Solo restaurantes con coordenadas válidas

  if (import.meta.env.DEV) {
    console.log(`[AwardSeed] ${matchingSeedBusinesses.length} restaurantes del seed (${awardFilter}) con coordenadas válidas`);
  }

  return filterBusinessesInBounds(matchingSeedBusinesses, bounds);
};

const HomePage = () => {
  const { t } = useTranslation();
  const { category, subcategory, city } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { userLocation, loading: locationLoading, permissionGranted, permissionDenied, requestLocationPermission, refreshLocation } = useLocation();
  const [searchLoading, setSearchLoading] = useState(false);
  const [businesses, setBusinesses] = useState([]); // Google Places
  const [geobookerBusinesses, setGeobookerBusinesses] = useState([]); // Native Businesses
  const [recommendedBusinesses, setRecommendedBusinesses] = useState([]); // User Recommended
  const [denueBusinesses, setDenueBusinesses] = useState([]); // DENUE Candidates (Seed data)
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [openNowFilter, setOpenNowFilter] = useState(false); // Filtro abierto ahora
  const [lastSearchQuery, setLastSearchQuery] = useState(''); // Para persistencia
  const [awardFilter, setAwardFilter] = useState('all');
  const [showAwardsPrompt, setShowAwardsPrompt] = useState(false);
  const [nearbyAwardCount, setNearbyAwardCount] = useState(0);
  const mapIdleTimerRef = useRef(null);
  const awardFilterRef = useRef('all');
  const viewportRequestSeqRef = useRef(0);
  const mapBoundsRef = useRef(null); // 📍 OPCION 1: Guardar bounds del mapa para filtrar recomendaciones
  const navigate = useNavigate();

  // Filtros de categoría desde URL (parámetros de consulta o ruta)
  const categoryFilter = category || searchParams.get('category');
  const subcategoryFilter = subcategory || searchParams.get('subcategory');
  const cityFilter = city || searchParams.get('city');

  const getMapCenter = () => {
    if (cityFilter) {
      const coords = CITY_COORDINATES[cityFilter.toLowerCase()];
      if (coords) return coords;
    }
    return userLocation;
  };

  // SEO dinámico basado en filtros
  const getSEOTitle = () => {
    if (cityFilter && categoryFilter) return t('seo.cityCategoryTitle', { category: categoryFilter, city: cityFilter, defaultValue: `Los mejores ${categoryFilter} en ${cityFilter}` });
    if (categoryFilter) return t('seo.categoryTitle', { category: categoryFilter, defaultValue: `${categoryFilter} cerca de mí` });
    if (cityFilter) return t('seo.cityTitle', { city: cityFilter, defaultValue: `Negocios y servicios en ${cityFilter}` });
    return t('home.title');
  };

  const getSEODescription = () => {
    if (cityFilter) return t('seo.cityDescription', { city: cityFilter, defaultValue: `Explora el mapa interactivo de ${cityFilter}. Encuentra restaurantes, farmacias, tiendas y más en Geobooker.` });
    return t('home.subtitle');
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
    setAwardFilter('all');
    sessionStorage.removeItem('geobooker_search_state');
    // Limpiar URL params de búsqueda pero mantener ubicación
    setSearchParams({});
    toast.success(t('home.searchCleared', { defaultValue: 'Búsqueda limpiada' }));
  };

  // Cargar negocios nativos de Geobooker (CON CACHÉ IndexedDB)
  const fetchGeobookerBusinesses = async () => {
    try {
      // ⚡ PASO 1: Intentar cargar desde caché primero (instantáneo)
      const cacheStatus = await isCacheValid(userLocation);
      if (cacheStatus.isValid && !categoryFilter) {
        const cachedBusinesses = await getCachedBusinesses();
        if (cachedBusinesses.length > 0) {
          const enrichedCachedBusinesses = await enrichBusinessesWithAwards(cachedBusinesses);
          setGeobookerBusinesses(enrichedCachedBusinesses);
          return; // Usar caché, no llamar a Supabase
        }
      }

      // ⚡ PASO 2: Si caché no es válido o está vacío, cargar desde Supabase
      let query = supabase
        .from('businesses')
        .select('*')
        .eq('status', 'approved')
        .eq('is_visible', true);

      if (categoryFilter) query = query.eq('category', categoryFilter);
      if (subcategoryFilter) query = query.eq('subcategory', subcategoryFilter);

      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const businessesWithAwards = await enrichBusinessesWithAwards(data);
        const baseBusinesses = businessesWithAwards.map((business) => ({
          ...business,
          is_premium_owner: false
        }));

        setGeobookerBusinesses(baseBusinesses);

        const ownerIds = [...new Set(data.map((business) => business.owner_id).filter(Boolean))];
        const premiumEntries = await Promise.all(
          ownerIds.map(async (ownerId) => {
            try {
              const { data: isPremium } = await supabase.rpc('get_user_premium_status', { user_id: ownerId });
              return [ownerId, Boolean(isPremium)];
            } catch (premiumError) {
              return [ownerId, false];
            }
          })
        );

        const premiumOwners = Object.fromEntries(premiumEntries);
        const businessesWithPremium = businessesWithAwards.map((business) => ({
          ...business,
          is_premium_owner: premiumOwners[business.owner_id] || false
        }));

        setGeobookerBusinesses(businessesWithPremium);
        if (!categoryFilter && userLocation && businessesWithPremium.length > 0) {
          cacheBusinesses(businessesWithPremium, userLocation);
        }
      }
    } catch (error) {
      console.error('Error fetching Geobooker businesses:', error);
    }
  };

  // 💚 OPCION 1: Cargar recomendaciones filtradas por viewport del mapa
  // Solo se cargan las recomendaciones visibles en el área del mapa, no TODAS.
  const fetchRecommendationsByBounds = async (bounds) => {
    if (!bounds) return;
    try {
      const { south, west, north, east } = bounds;
      const { data: inView, error } = await supabase
        .from('user_recommendations')
        .select('id, name, status, latitude, longitude, category')
        .eq('status', 'approved')
        .gte('latitude', south)
        .lte('latitude', north)
        .gte('longitude', west)
        .lte('longitude', east)
        .limit(100); // Máximo 100 recomendaciones por viewport

      if (error) {
        console.error('❌ [HomePage] Error recomendaciones por viewport:', error.message);
        return;
      }

      const conCoords = (inView || []).filter(r => r.latitude != null && r.longitude != null);
      console.log(`💚 [HomePage] ${conCoords.length} recomendaciones en viewport`);
      setRecommendedBusinesses(conCoords);
    } catch (error) {
      console.error('❌ [HomePage] Error cargando recomendaciones:', error);
    }
  };

  useEffect(() => {
    fetchGeobookerBusinesses();
  }, [categoryFilter, subcategoryFilter, userLocation]);

  // NOTA: Las recomendaciones ahora se cargan en handleMapIdle (filtradas por viewport)

  // ✅ FIX: Escuchar cambios de visibilidad de negocios (toggle on/off)
  // Cuando un usuario cambia is_visible en el dashboard, actualizar el mapa inmediatamente
  useEffect(() => {
    const handleVisibilityChange = (event) => {
      const { businessId, newVisibility } = event.detail;

      console.log(`🔄 [HomePage] Business ${businessId} visibility changed to ${newVisibility}`);

      setGeobookerBusinesses(prev => {
        if (newVisibility === false) {
          // Quitar del mapa si se ocultó
          const filtered = prev.filter(b => b.id !== businessId);
          console.log(`✅ [HomePage] Negocio removido del mapa. Antes: ${prev.length}, Después: ${filtered.length}`);
          return filtered;
        } else {
          // Si se activó de nuevo, verificar si ya está en el mapa
          const exists = prev.find(b => b.id === businessId);
          if (!exists) {
            // Recargar todos los negocios para incluir el que se activó
            console.log('🔄 [HomePage] Recargando negocios para incluir el activado');
            fetchGeobookerBusinesses();
          }
          return prev;
        }
      });
    };

    window.addEventListener('business-visibility-changed', handleVisibilityChange);

    return () => {
      window.removeEventListener('business-visibility-changed', handleVisibilityChange);
    };
  }, []); // Sin dependencias porque fetchGeobookerBusinesses ya está definido arriba

  // ⚡ NUEVO: Buscar en Google Places automáticamente cuando hay filtro de categoría
  useEffect(() => {
    const searchGooglePlacesWithCategory = async () => {
      // Solo buscar si hay filtro de categoría Y tenemos ubicación del usuar io
      if (!categoryFilter || !userLocation) return;

      try {
        // ⚡ OPTIMIZACIÓN: Mostrar caché inmediatamente (loading optimista)
        const searchTerm = subcategoryFilter || categoryFilter;
        const cacheKey = generateCacheKey(userLocation, searchTerm, 'search');
        const cachedResults = getFromCache(cacheKey);

        if (cachedResults && cachedResults.length > 0) {
          setBusinesses(cachedResults);
          toast.success(`💾 ${cachedResults.length} negocios (caché instantáneo)`, { duration: 2000 });
        } else {
          setSearchLoading(true);
        }

        // Buscar en Google Places (actualiza en background)
        const results = await searchPlacesUniversal(userLocation, searchTerm, 10000);

        if (results && results.length > 0) {
          setBusinesses(results);
          // Si no había caché, mostrar mensaje de éxito
          if (!cachedResults || cachedResults.length === 0) {
            toast.success(`🔍 ${results.length} negocios encontrados para "${searchTerm}"`, { duration: 3000 });
          }
        } else if (!cachedResults || cachedResults.length === 0) {
          toast(`No se encontraron negocios para "${searchTerm}"`, { icon: '📭', duration: 3000 });
        }
      } catch (error) {
        console.error('Error buscando en Google Places:', error);
      } finally {
        setSearchLoading(false);
      }
    };

    searchGooglePlacesWithCategory();
  }, [categoryFilter, subcategoryFilter, userLocation]);

  // Show location modal for new users who have no location at all
  // [APP STORE FIX] Only show after user interaction, not on app launch
  useEffect(() => {
    if (!locationLoading && !permissionGranted && !userLocation) {
      // Only show once per session and only if never denied
      const shownThisSession = sessionStorage.getItem('locationModalShown');
      const explicitlyDenied = localStorage.getItem('locationPermissionDenied');
      if (shownThisSession || explicitlyDenied) return;

      const timer = setTimeout(() => {
        setShowLocationModal(true);
        sessionStorage.setItem('locationModalShown', 'true');
      }, 2000); // Wait 2s so user sees the app first
      return () => clearTimeout(timer);
    }
    if (userLocation && permissionGranted) {
      setShowLocationModal(false);
    }
  }, [locationLoading, permissionGranted, userLocation]);

  const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const handleBusinessesFound = (foundBusinesses, meta = {}) => {
    setBusinesses(foundBusinesses);

    if (meta.query) {
      setLastSearchQuery(meta.query);
    }

    if (meta.query && isAwardSearchQuery(meta.query)) {
      setAwardFilter(getAwardSearchFilter(meta.query) || 'michelin');
    } else if (meta.source === 'google' && awardFilter !== 'all') {
      setAwardFilter('all');
    }
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

  // 📍 Handler para consultar DENUE + Recomendaciones en background cuando el mapa se mueve
  const awardBusinesses = [...geobookerBusinesses, ...denueBusinesses].filter(isAwardedBusiness);
  const filteredBusinesses = awardFilter === 'all'
    ? businesses
    : businesses.filter((business) => matchesAwardFilter(business, awardFilter));
  const filteredGeobookerBusinesses = awardFilter === 'all'
    ? geobookerBusinesses
    : geobookerBusinesses.filter((business) => matchesAwardFilter(business, awardFilter));
  const filteredRecommendedBusinesses = awardFilter === 'all'
    ? recommendedBusinesses
    : recommendedBusinesses.filter((business) => matchesAwardFilter(business, awardFilter));
  const filteredDenueBusinesses = awardFilter === 'all'
    ? denueBusinesses
    : denueBusinesses.filter((business) => matchesAwardFilter(business, awardFilter));

  useEffect(() => {
    awardFilterRef.current = awardFilter;
  }, [awardFilter]);

  useEffect(() => {
    if (!userLocation || awardBusinesses.length === 0) {
      setNearbyAwardCount(0);
      return;
    }

    const nearbyBusinesses = awardBusinesses.filter((business) => {
      const lat = Number(business.latitude ?? business.lat);
      const lng = Number(business.longitude ?? business.lng);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return false;

      const distanceKm = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
      const awardMeta = getAwardMeta(business);
      const radiusKm = awardMeta?.isMichelin ? 1.5 : 2.5;
      return distanceKm <= radiusKm;
    });

    setNearbyAwardCount(nearbyBusinesses.length);

    if (nearbyBusinesses.length > 0 && !sessionStorage.getItem('geobooker_awards_prompt_shown')) {
      setShowAwardsPrompt(true);
      sessionStorage.setItem('geobooker_awards_prompt_shown', 'true');
    }
  }, [awardBusinesses, userLocation]);

  const awardFilterOptions = [
    { id: 'awarded', label: 'Restaurantes premiados' },
    { id: 'michelin', label: 'Michelin' },
    { id: 'green', label: 'Estrella Verde' },
    { id: 'fine_dining', label: 'Alta cocina' },
    { id: 'tasting_menu', label: 'Tasting menu' }
  ];

  const awardViewportCategory = awardFilter !== 'all' ? 'restaurantes' : null;

  const handleAwardFilterToggle = useCallback(async (nextFilter) => {
    const resolvedFilter = awardFilter === nextFilter ? 'all' : nextFilter;
    awardFilterRef.current = resolvedFilter;
    setAwardFilter(resolvedFilter);

    if (resolvedFilter === 'all' || !mapBoundsRef.current) {
      return;
    }

    if (mapIdleTimerRef.current) clearTimeout(mapIdleTimerRef.current);

    const requestId = ++viewportRequestSeqRef.current;

    try {
      const awardedBusinesses = await fetchAwardBusinessesInBounds(mapBoundsRef.current, 400);
      const filteredAwardBusinesses = awardedBusinesses.filter((business) => matchesAwardFilter(business, resolvedFilter));
      if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== resolvedFilter) {
        console.log(`[Awards] Ignorando respuesta atrasada para filtro "${resolvedFilter}"`);
        return;
      }

      if (filteredAwardBusinesses.length > 0) {
        console.log(`[Awards] ${resolvedFilter}: ${filteredAwardBusinesses.length} negocios renderizables desde Supabase`);
        setDenueBusinesses(filteredAwardBusinesses);
        return;
      }

      const fallbackAwardBusinesses = await getAwardSeedFallbackBusinesses(mapBoundsRef.current, resolvedFilter);
      if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== resolvedFilter) {
        console.log(`[Awards] Ignorando fallback atrasado para filtro "${resolvedFilter}"`);
        return;
      }

      console.log(`[Awards] ${resolvedFilter}: ${fallbackAwardBusinesses.length} negocios renderizables desde seed local`);
      setDenueBusinesses(fallbackAwardBusinesses);
    } catch (error) {
      console.error('Error loading award filter businesses:', error);
    }
  }, [awardFilter]);

  const handleMapIdle = useCallback(({ bounds, zoom }) => {
    // Guardar bounds actuales para posibles re-cargas
    mapBoundsRef.current = bounds;
    const currentAwardFilter = awardFilterRef.current;

    // Si el zoom es muy lejano, no saturar la base de datos
    // Permite DENUE desde nivel de ciudad (10) para arriba. Si hay filtro, mostramos siempre (1).
    const minZoom = (categoryFilter || currentAwardFilter !== 'all') ? 1 : 10;
    if (zoom < minZoom) {
      setDenueBusinesses([]);
      setRecommendedBusinesses([]);
      return;
    }

    // 🎯 Límite dinámico según zoom para evitar saturación visual
    // Cuando hay categoría, permitir más resultados (están filtrados)
    let dynamicLimit;
    if (currentAwardFilter !== 'all') {
      if (zoom <= 12)      dynamicLimit = 240;
      else if (zoom <= 14) dynamicLimit = 400;
      else                 dynamicLimit = 650;
    } else if (categoryFilter) {
      // Con categoría: más resultados porque ya están filtrados
      if (zoom <= 13)      dynamicLimit = 100;
      else if (zoom <= 14) dynamicLimit = 200;
      else                 dynamicLimit = 400;
    } else {
      // Sin categoría: límites conservadores
      if (zoom <= 13)      dynamicLimit = 50;
      else if (zoom <= 14) dynamicLimit = 100;
      else if (zoom <= 15) dynamicLimit = 200;
      else                 dynamicLimit = 300;
    }

    // Debounce de 1 segundo para no saturar al mover el mapa rápido
    if (mapIdleTimerRef.current) clearTimeout(mapIdleTimerRef.current);

    mapIdleTimerRef.current = setTimeout(async () => {
      const requestId = ++viewportRequestSeqRef.current;
      const activeAwardFilter = awardFilterRef.current;

      try {
        if (activeAwardFilter !== 'all') {
          const awardedBusinesses = await fetchAwardBusinessesInBounds(bounds, dynamicLimit);
          const filteredAwardBusinesses = awardedBusinesses.filter((business) => matchesAwardFilter(business, activeAwardFilter));
          if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== activeAwardFilter) {
            console.log(`[Awards] Ignorando viewport atrasado para filtro "${activeAwardFilter}"`);
            return;
          }

          if (filteredAwardBusinesses.length > 0) {
            console.log(`[Awards] viewport ${activeAwardFilter}: ${filteredAwardBusinesses.length} negocios renderizables desde Supabase`);
            setDenueBusinesses(filteredAwardBusinesses);
          } else {
            const fallbackAwardBusinesses = await getAwardSeedFallbackBusinesses(bounds, activeAwardFilter);
            if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== activeAwardFilter) {
              console.log(`[Awards] Ignorando fallback de viewport atrasado para filtro "${activeAwardFilter}"`);
              return;
            }

            console.log(`[Awards] viewport ${activeAwardFilter}: ${fallbackAwardBusinesses.length} negocios renderizables desde seed local`);
            setDenueBusinesses(fallbackAwardBusinesses);
          }
          await fetchRecommendationsByBounds(bounds);
          return;
        }

        const effectiveCategory = categoryFilter || (activeAwardFilter !== 'all' ? 'restaurantes' : null);
        const catLabel = effectiveCategory ? `, cat=${effectiveCategory}` : '';
        const awardLabel = activeAwardFilter !== 'all' ? `, award=${activeAwardFilter}` : '';
        console.log(`🗺️ [HomePage] Consultando DENUE en viewport (zoom=${zoom}, limit=${dynamicLimit}${catLabel}${awardLabel})...`, bounds);
        const candidates = await getBusinessesInBounds(
          bounds.south,
          bounds.west,
          bounds.north,
          bounds.east,
          dynamicLimit,
          effectiveCategory || null
        );
        
        if (candidates && candidates.length > 0) {
          // ✅ FIX: Filtrar para quedarnos SOLO con candidatos DENUE/seed
          const geobookerIds = new Set(geobookerBusinesses.map(b => b.id));
          const onlyDenueCandidates = candidates.filter(c => {
            if (geobookerIds.has(c.id)) return false;
            const src = (c.source_type || '').toLowerCase();
            return src.includes('seed') || src.includes('denue');
          });
          
          console.log(`✅ [HomePage] ${candidates.length} resultados RPC → ${onlyDenueCandidates.length} candidatos DENUE únicos.`);
          const enrichedDenueCandidates = await enrichBusinessesWithAwards(onlyDenueCandidates);
          if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== 'all') {
            console.log('[HomePage] Ignorando resultados genéricos atrasados porque cambió el filtro');
            return;
          }
          setDenueBusinesses(enrichedDenueCandidates);
        } else {
          if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== 'all') {
            console.log('[HomePage] Ignorando limpieza genérica atrasada porque cambió el filtro');
            return;
          }
          setDenueBusinesses([]);
        }

        // 💚 OPCION 1: Cargar recomendaciones filtradas por viewport (lazy loading)
        await fetchRecommendationsByBounds(bounds);
      } catch (error) {
        console.error('Error fetching DENUE businesses:', error);
      }
    }, 1000); // 1 segundo de debounce
  }, [geobookerBusinesses, categoryFilter, awardFilter, awardViewportCategory]);

  useEffect(() => {
    if (awardFilter === 'all' || !mapBoundsRef.current) {
      return;
    }

    if (mapIdleTimerRef.current) clearTimeout(mapIdleTimerRef.current);

    mapIdleTimerRef.current = setTimeout(async () => {
      const requestId = ++viewportRequestSeqRef.current;
      const activeAwardFilter = awardFilterRef.current;

      try {
        const bounds = mapBoundsRef.current;
        const dynamicLimit = activeAwardFilter === 'all' ? 100 : 400;
        const awardedBusinesses = await fetchAwardBusinessesInBounds(bounds, dynamicLimit);
        const filteredAwardBusinesses = awardedBusinesses.filter((business) => matchesAwardFilter(business, activeAwardFilter));

        if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== activeAwardFilter) {
          console.log(`[Awards] Ignorando refresh atrasado para filtro "${activeAwardFilter}"`);
          return;
        }

        if (filteredAwardBusinesses.length > 0) {
          console.log(`[Awards] refresh ${activeAwardFilter}: ${filteredAwardBusinesses.length} negocios renderizables desde Supabase`);
          setDenueBusinesses(filteredAwardBusinesses);
        } else {
          const fallbackAwardBusinesses = await getAwardSeedFallbackBusinesses(bounds, activeAwardFilter);
          if (requestId !== viewportRequestSeqRef.current || awardFilterRef.current !== activeAwardFilter) {
            console.log(`[Awards] Ignorando fallback refresh atrasado para filtro "${activeAwardFilter}"`);
            return;
          }

          console.log(`[Awards] refresh ${activeAwardFilter}: ${fallbackAwardBusinesses.length} negocios renderizables desde seed local`);
          setDenueBusinesses(fallbackAwardBusinesses);
        }
      } catch (error) {
        console.error('Error refreshing award-filter viewport:', error);
      }
    }, 150);
  }, [awardFilter, categoryFilter, geobookerBusinesses, awardViewportCategory]);

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
      toast.error(t('common.noProfile', { defaultValue: 'Este negocio no tiene perfil disponible' }));
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

      {/* Banner comercial interno de temporada - visible hasta el 31 de agosto de 2026 */}
      {new Date() < new Date('2026-08-31T23:59:59-06:00') && (
        <div className="relative overflow-hidden bg-[radial-gradient(circle_at_top_left,_#14532d,_#0f172a_55%,_#111827)] text-white py-4 px-4 shadow-lg">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <div className="absolute left-[10%] top-1/2 h-16 w-16 -translate-y-1/2 rounded-full border-2 border-white/40" />
            <div className="absolute right-[12%] top-1/2 h-24 w-24 -translate-y-1/2 rounded-full border border-white/25" />
            <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-white/30" />
          </div>
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl animate-pulse">⚽</span>
              <div>
                <span className="font-extrabold text-lg block">
                  Temporada futbolera 2026 para anunciarte en Geobooker
                </span>
                <span className="text-emerald-100 text-sm">
                  Usa nuestros espacios para destacar tu negocio o impulsar tu paquete Geobooker + TT en industria, transporte y logistica.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="opacity-90">Temporada</span>
                <span className="bg-white/25 backdrop-blur px-3 py-1.5 rounded-lg font-bold text-base">
                  Futbol 2026
                </span>
              </div>
              <Link to="/advertise" className="bg-white text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-50 transition shadow-md">
                Anunciate aqui
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 BANNER Enterprise VIP (50% OFF) - Visible hasta 1 de Julio 2026 */}
      {/* Apple 3.1.1: oculto temporalmente para revisión con feature flag VITE_SHOW_VIP_BANNER */}
      {import.meta.env.VITE_SHOW_VIP_BANNER === 'true' && !IS_IOS_NATIVE && new Date() < new Date('2026-09-02T00:00:00-06:00') && (
        <div className="bg-gradient-to-r from-slate-900 via-gray-900 to-black text-amber-500 py-3 px-4 shadow-xl border-b border-amber-500/30">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🚀</span>
              <div>
                <span className="font-extrabold text-lg block text-amber-500">
                  Impulsa tu Negocio: <span className="text-white">70% OFF en Publicidad Global</span>
                </span>
                <span className="text-amber-500/80 text-sm">
                  Descuento exclusivo en todos los paquetes de Geobooker Enterprise Ads
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <span className="opacity-90">Vigencia</span>
                <span className="bg-amber-500/10 border border-amber-500/30 text-amber-400 backdrop-blur px-3 py-1.5 rounded-lg font-bold text-base uppercase">
                  Hasta Julio 2026
                </span>
              </div>
              {/* [APP STORE FIX] Link sin #anchor para evitar pantalla blanca en HashRouter (Capacitor) */}
              <Link to="/enterprise" className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-900 px-5 py-2 rounded-lg font-bold hover:shadow-lg hover:shadow-amber-500/20 hover:scale-105 transition-all">
                Ver Paquetes VIP
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Modal de permiso de ubicación */}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        onRequestPermission={requestLocationPermission}
        permissionDenied={permissionDenied}
      />

      {/* Modal de login para invitados (después de 1 búsqueda gratis) */}
      <GuestLoginPromptModal
        isOpen={showLoginPrompt}
        onClose={closeLoginPrompt}
      />

      {showAwardsPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 px-4 pb-6 md:items-center">
          <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-700">
              Restaurantes premiados
            </div>
            <h3 className="text-2xl font-black text-slate-900">
              Estas cerca de un restaurante MICHELIN?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {nearbyAwardCount > 1
                ? `Tienes ${nearbyAwardCount} restaurantes MICHELIN o premiados cerca de ti.`
                : 'Descubre restaurantes MICHELIN cerca de ti en el mapa de Geobooker.'}
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => {
                  handleAwardFilterToggle('michelin');
                  setShowAwardsPrompt(false);
                }}
                className="flex-1 rounded-2xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-400"
              >
                Ver MICHELIN cerca de mi
              </button>
              <button
                onClick={() => setShowAwardsPrompt(false)}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Explorar mapa
              </button>
            </div>
            <button
              onClick={() => setShowAwardsPrompt(false)}
              className="mt-3 w-full text-sm text-slate-500 hover:text-slate-700"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

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
              initialValue={lastSearchQuery}
            />

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {awardFilterOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => handleAwardFilterToggle(option.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    awardFilter === option.id
                      ? 'bg-amber-400 text-slate-950 shadow-lg'
                      : 'bg-white/15 text-white backdrop-blur hover:bg-white/25'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {/* Badge de filtro activo */}
            {categoryFilter && (
              <div className="flex justify-center mt-4">
                <div className="inline-flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full">
                  <span className="mr-2">🔍 {t('home.filterActive')}</span>
                  <span className="font-bold capitalize">{categoryFilter.replace('_', ' ')}</span>
                  {subcategoryFilter && <span className="mx-1">→</span>}
                  {subcategoryFilter && <span className="font-bold">{subcategoryFilter}</span>}
                  <button
                    onClick={() => setSearchParams({})}
                    className="ml-3 bg-white/30 hover:bg-white/50 rounded-full w-6 h-6 flex items-center justify-center transition"
                    title={t('home.removeFilter')}
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
                  {awardBusinesses.length > 0 && (
                    <button
                      onClick={() => handleAwardFilterToggle('michelin')}
                      className="mt-3 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-300"
                    >
                      Explora restaurantes MICHELIN en el mapa
                    </button>
                  )}
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
                  {t('home.updateLocation')}
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
      {
        businesses.length > 0 && (
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
        )
      }

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
              center={getMapCenter()}
              businesses={filteredBusinesses} // Google Places o resultados semanticos
              geobookerBusinesses={
                // Aplicar filtro "Abierto ahora" si está activo
                openNowFilter
                  ? filteredGeobookerBusinesses.filter(b => {
                      const result = isBusinessOpen(b.opening_hours);
                      return result.isOpen === true;
                    })
                  : filteredGeobookerBusinesses
              }
              denueBusinesses={
                openNowFilter
                  ? filteredDenueBusinesses
                  : filteredDenueBusinesses
              }
              recommendedBusinesses={filteredRecommendedBusinesses}
              selectedBusiness={selectedBusiness}
              onBusinessSelect={setSelectedBusiness}
              onViewBusinessProfile={handleViewBusinessProfile}
              onMapIdle={handleMapIdle}
              zoom={filteredBusinesses.length > 0 ? 13 : 12}
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
                {t('home.ceo.quote')}
                <span className="block mt-4 text-xl md:text-2xl text-gray-300">{t('home.ceo.footer')}</span>
              </p>
            </blockquote>

            {/* Author */}
            <div className="flex items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                GB
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-lg">{t('home.ceo.author')}</p>
                <p className="text-purple-300 text-sm">Geobooker Inc.</p>
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
          <h2 className="text-4xl font-bold text-gray-900 mb-4">{t('home.howItWorks.title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('home.howItWorks.subtitle')}
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
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('home.howItWorks.step1.title')}</h3>
            <p className="text-gray-600">
              {t('home.howItWorks.step1.desc')}
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
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('home.howItWorks.step2.title')}</h3>
            <p className="text-gray-600">
              {t('home.howItWorks.step2.desc')}
            </p>
          </div>

          {/* Paso 3 */}
          <div className="text-center p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow duration-300">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">{t('home.howItWorks.step3.title')}</h3>
            <p className="text-gray-600">
              {t('home.howItWorks.step3.desc')}
            </p>
          </div>
        </div>

        {/* Video Demo Section - YouTube Short */}
        <div className="mt-16 max-w-md mx-auto">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">📹 {t('home.video.title')}</h3>
            <p className="text-gray-600">{t('home.video.subtitle')}</p>
          </div>

          {/* YouTube Video — iframe en web, thumbnail en iOS nativo (WKWebView bloquea iframes) */}
          {IS_IOS_NATIVE ? (
            // ✅ FIX Bug #2: En iOS, abrir video en Safari directamente
            <a
              href="https://www.youtube.com/watch?v=2IaVw19pgzY"
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden shadow-2xl border-4 border-white bg-black flex flex-col items-center justify-center block"
            >
              {/* Thumbnail de YouTube */}
              <img
                src="https://img.youtube.com/vi/2IaVw19pgzY/maxresdefault.jpg"
                alt="Geobooker - Cómo funciona"
                className="absolute inset-0 w-full h-full object-cover opacity-80"
                onError={(e) => { e.target.src = 'https://img.youtube.com/vi/2IaVw19pgzY/hqdefault.jpg'; }}
              />
              {/* Botón Play */}
              <div className="relative z-10 flex flex-col items-center gap-3">
                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center shadow-2xl">
                  <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </div>
                <span className="text-white font-bold text-sm bg-black/60 px-3 py-1 rounded-full">
                  📩 Ver en YouTube
                </span>
              </div>
            </a>
          ) : (
            // Web y Android: iframe normal
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
          )}

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
              {t('home.video.subscribe')}
            </a>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-5xl font-bold mb-2">500K+</div>
              <div className="text-blue-200">{t('home.stats.registered', 'Negocios en el mapa')}</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">25+</div>
              <div className="text-blue-200">{t('home.stats.countries', 'Países alcanzados')}</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">200+</div>
              <div className="text-blue-200">{t('home.stats.cities', 'Ciudades cubiertas')}</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <div className="text-blue-200">{t('home.stats.free', 'Gratis para usuarios')}</div>
            </div>
          </div>
          <p className="text-center text-blue-300 text-xs mt-6 opacity-70">
            * Datos del directorio DENUE/INEGI + negocios registrados por usuarios. Actualizado 2026.
          </p>
        </div>
      </div>

      {/* Para Negocios */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-6">
              {t('home.businessSection.title')}
            </h2>
            <p className="text-xl text-gray-600 mb-8">
              {t('home.businessSection.subtitle')}
            </p>
            <ul className="space-y-4 mb-8">
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>{t('home.businessSection.benefit1.title')}</strong> {t('home.businessSection.benefit1.desc')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>{t('home.businessSection.benefit2.title')}</strong> {t('home.businessSection.benefit2.desc')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>{t('home.businessSection.benefit3.title')}</strong> {t('home.businessSection.benefit3.desc')}</span>
              </li>
              <li className="flex items-start">
                <svg className="w-6 h-6 text-green-500 mr-3 mt-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-700"><strong>{t('home.businessSection.benefit4.title')}</strong> {t('home.businessSection.benefit4.desc')}</span>
              </li>
            </ul>
            <Link
              to="/business/register"
              className="inline-block bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition duration-300 shadow-lg hover:shadow-xl"
            >
              {t('home.businessSection.cta')}
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
                    <p className="text-sm text-gray-600">📍 {t('home.businessSection.nearby', { distance: '500m' })}</p>
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
                    <p className="text-sm text-gray-600">📍 {t('home.businessSection.nearby', { distance: '1.2km' })}</p>
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

      {/* 🏪 CTA: Reclamar Negocio */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-3">
            ¿Tu negocio ya está en Geobooker?
          </h2>
          <p className="text-lg text-orange-100 mb-8 max-w-2xl mx-auto">
            Miles de negocios del DENUE ya aparecen en nuestro mapa. Búscalo, reclámalo gratis y toma control de tu perfil digital.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/claim"
              className="bg-white text-amber-700 px-8 py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
            >
              🏪 Reclamar mi Negocio
            </Link>
            <Link
              to="/business/register"
              className="text-white border-2 border-white/60 px-6 py-3.5 rounded-xl font-bold hover:bg-white/20 transition-all"
            >
              + Registrar nuevo negocio
            </Link>
          </div>
        </div>
      </div>

      {/* Banner de Negocios Geobooker */}
      <div className="py-16 bg-gradient-to-b from-gray-50 to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <span className="bg-purple-100 text-purple-700 px-4 py-1 rounded-full text-sm font-semibold">
              ⭐ {t('home.verifiedBusinesses')}
            </span>
            <h3 className="text-3xl font-bold text-gray-900 mt-4 mb-2">
              {t('home.trust.title')}
            </h3>
            <p className="text-gray-600">{t('home.trust.subtitle')}</p>
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
                  <p className="font-bold text-lg">🐕 {t('home.testimonials.vet.name')}</p>
                  <p className="text-sm text-white/80">{t('home.testimonials.vet.desc')}</p>
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
                  <p className="font-bold text-lg">🍽️ {t('home.testimonials.rest.name')}</p>
                  <p className="text-sm text-white/80">{t('home.testimonials.rest.desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sección Promoción Geobooker Global */}
      {/* Apple 3.1.1: oculta en iOS nativo — promoción de planes Enterprise / Ads pagos */}
      {!IS_IOS_NATIVE && (
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
              <h4 className="font-bold text-white mb-2">{t('globalPromo.local.title')}</h4>
              <p className="text-gray-400 text-sm">{t('globalPromo.local.desc')}</p>
              <Link to="/advertise" className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-3 inline-block">
                {t('home.promo.seeOffers')}
              </Link>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-5 border border-white/20">
              <div className="text-3xl mb-3">🌍</div>
              <h4 className="font-bold text-white mb-2">{t('globalPromo.global.title')}</h4>
              <p className="text-gray-400 text-sm">{t('globalPromo.global.desc')}</p>
              <Link to="/enterprise" className="text-amber-400 hover:text-amber-300 text-sm font-medium mt-3 inline-block">
                {t('enterprise.ctaViewPricing', 'Ver planes Enterprise →')}
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
      )}

      {/* Call to Action Final */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('home.finalCta.title')}
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            {t('home.finalCta.subtitle')}
          </p>
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="bg-white text-blue-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-50 transition duration-300 shadow-lg hover:shadow-xl"
          >
            {t('home.finalCta.button')}
          </button>
        </div>
      </div>

      {/* Banner Inferior Sticky (Segunda Plana) */}
      <StickyBanner />

      {/* Interstitial Ad (Pantalla Completa) - Aparece después de 5 búsquedas */}
      {
        showInterstitial && (
          <InterstitialAd onClose={closeInterstitial} />
        )
      }

      {/* Floating Referral Widget - Gamified */}
      <ReferralFloatingWidget />

      {/* Prompt flotante para recomendar negocios (Geobookers recomiendan) */}
      <GeobookersRecommend userLocation={userLocation} />

      {/* Christmas Promo Modal - Seasonal */}
      <ChristmasPromoModal />
    </div >
  );
};

export default HomePage;
