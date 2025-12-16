import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';

// ⚡ IMPORTANTE: Constantes fuera del componente para evitar recargas
const GOOGLE_MAPS_LIBRARIES = ['places'];

const mapContainerStyle = {
  width: '100%',
  height: '500px',
  borderRadius: '12px',
  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332
};

// Iconos personalizados - USUARIO (Círculo azul estilo Google Maps)
const USER_ICON = {
  path: 0, // google.maps.SymbolPath.CIRCLE
  fillColor: '#4285F4',
  fillOpacity: 1,
  strokeColor: '#ffffff',
  strokeWeight: 3,
  scale: 12
};

const BUSINESS_ICON = {
  url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cGF0aCBkPSJNMjAgNDBDMjAgNDAgMzUgMjUgMzUgMTVDMzUgNi43MTU3MyAyOC4yODQzIDAgMjAgMEMxMS43MTU3IDAgNSA2LjcxNTczIDUgMTVDNSAyNSAyMCA0MCAyMCA0MFoiIGZpbGw9IiNGRTM0NkUiLz4KICA8Y2lyY2xlIGN4PSIyMCIgY3k9IjE1IiByPSI2IiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4=',
  scaledSize: { width: 40, height: 40 },
  anchor: { x: 20, y: 40 }
};

const GEOBOOKER_ICON = {
  path: 'M 12,2 L 15,10 L 23,10 L 17,15 L 19,23 L 12,18 L 5,23 L 7,15 L 1,10 L 9,10 Z',
  fillColor: '#FFD700',
  fillOpacity: 1,
  strokeColor: '#FF8C00',
  strokeWeight: 2,
  scale: 2
};

// ⭐ Icono PREMIUM - Estrella dorada más grande y brillante
const PREMIUM_ICON = {
  path: 'M 12,2 L 15,10 L 23,10 L 17,15 L 19,23 L 12,18 L 5,23 L 7,15 L 1,10 L 9,10 Z',
  fillColor: '#FFD700',
  fillOpacity: 1,
  strokeColor: '#FFA500',
  strokeWeight: 3,
  scale: 2.5, // Más grande que el normal
  anchor: { x: 12, y: 12 }
};

// 🎨 ICONOS POR CATEGORÍA (Para negocios nativos de Geobooker)
// Cada categoría tiene un color y símbolo distintivo
const CATEGORY_ICONS = {
  // 🍴 Restaurantes & Comida - Naranja
  restaurantes: {
    path: 'M11,9H9V2H7V9H5V2H3V9C3,11.12 4.66,12.84 6.75,12.97V22H9.25V12.97C11.34,12.84 13,11.12 13,9V2H11V9M16,6V14H18.5V22H21V2C18.24,2 16,4.24 16,7Z',
    fillColor: '#FF6B35',
    fillOpacity: 1,
    strokeColor: '#E55100',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // ☕ Bares y Cafeterías - Café/Marrón
  bares: {
    path: 'M2,21V19H20V21H2M20,8V5H22V8C22,9.1 21.1,10 20,10H19V12H20C21.1,12 22,12.9 22,14V16H18V14C18,12.9 18.9,12 20,12H19V10H18C16.9,10 16,9.1 16,8V5H18V8H20M16,8V5H18V8H16M16,8V5H18V8H14V17A3,3 0 0,1 11,20A3,3 0 0,1 8,17V5H14V5',
    fillColor: '#795548',
    fillOpacity: 1,
    strokeColor: '#5D4037',
    strokeWeight: 2,
    scale: 1.6,
    anchor: { x: 12, y: 12 }
  },
  // 🛍️ Tiendas & Comercios - Azul
  tiendas: {
    path: 'M19,6H17C17,3.24 14.76,1 12,1S7,3.24 7,6H5C3.89,6 3,6.89 3,8V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V8C21,6.89 20.1,6 19,6M12,3A3,3 0 0,1 15,6H9A3,3 0 0,1 12,3M12,15A4,4 0 0,1 8,11H10A2,2 0 0,0 12,13A2,2 0 0,0 14,11H16A4,4 0 0,1 12,15Z',
    fillColor: '#2196F3',
    fillOpacity: 1,
    strokeColor: '#1565C0',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // 💼 Servicios Profesionales - Gris/Azul oscuro
  servicios: {
    path: 'M10,2H14A2,2 0 0,1 16,4V6H20A2,2 0 0,1 22,8V19A2,2 0 0,1 20,21H4C2.89,21 2,20.1 2,19V8C2,6.89 2.89,6 4,6H8V4C8,2.89 8.89,2 10,2M14,6V4H10V6H14Z',
    fillColor: '#37474F',
    fillOpacity: 1,
    strokeColor: '#263238',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // 🔧 Hogar, Reparaciones & Autos - Rojo/Gris
  hogar_autos: {
    path: 'M22.7,19L13.6,9.9C14.5,7.6 14,4.9 12.1,3C10.1,1 7.1,0.6 4.7,1.7L9,6L6,9L1.6,4.7C0.4,7.1 0.9,10.1 2.9,12.1C4.8,14 7.5,14.5 9.8,13.6L18.9,22.7C19.3,23.1 19.9,23.1 20.3,22.7L22.6,20.4C23.1,20 23.1,19.3 22.7,19Z',
    fillColor: '#F44336',
    fillOpacity: 1,
    strokeColor: '#C62828',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // 💊 Salud y Belleza - Verde/Rosa
  salud: {
    path: 'M19,8C19.56,8 20,8.43 20,9V15A2,2 0 0,1 18,17H15V19L12,22L9,19V17H6A2,2 0 0,1 4,15V9C4,8.43 4.45,8 5,8H7V6C7,3.79 8.79,2 11,2H13C15.21,2 17,3.79 17,6V8H19M9,8H15V6A2,2 0 0,0 13,4H11A2,2 0 0,0 9,6V8Z',
    fillColor: '#4CAF50',
    fillOpacity: 1,
    strokeColor: '#2E7D32',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // 🎬 Entretenimiento - Morado
  entretenimiento: {
    path: 'M18,4L20,8H17L15,4H13L15,8H12L10,4H8L10,8H7L5,4H4A2,2 0 0,0 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V4H18Z',
    fillColor: '#9C27B0',
    fillOpacity: 1,
    strokeColor: '#6A1B9A',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  },
  // 🎓 Educación - Azul claro
  educacion: {
    path: 'M12,3L1,9L12,15L21,10.09V17H23V9M5,13.18V17.18L12,21L19,17.18V13.18L12,17L5,13.18Z',
    fillColor: '#03A9F4',
    fillOpacity: 1,
    strokeColor: '#0277BD',
    strokeWeight: 2,
    scale: 1.8,
    anchor: { x: 12, y: 12 }
  }
};

// Función para obtener el icono según la categoría del negocio
const getCategoryIcon = (category, isPremium = false) => {
  // Si es premium, usar el icono premium dorado
  if (isPremium) {
    return PREMIUM_ICON;
  }

  // Mapear categorías a sus iconos
  const categoryKey = category?.toLowerCase() || '';

  // Buscar coincidencias parciales
  if (categoryKey.includes('restaurant') || categoryKey.includes('comida') || categoryKey.includes('taco') || categoryKey.includes('cocina')) {
    return CATEGORY_ICONS.restaurantes;
  }
  if (categoryKey.includes('bar') || categoryKey.includes('cafe') || categoryKey.includes('cervez')) {
    return CATEGORY_ICONS.bares;
  }
  if (categoryKey.includes('tienda') || categoryKey.includes('shop') || categoryKey.includes('comercio') || categoryKey.includes('abarrote')) {
    return CATEGORY_ICONS.tiendas;
  }
  if (categoryKey.includes('servicio') || categoryKey.includes('abogado') || categoryKey.includes('contador') || categoryKey.includes('consul')) {
    return CATEGORY_ICONS.servicios;
  }
  if (categoryKey.includes('taller') || categoryKey.includes('mecan') || categoryKey.includes('plom') || categoryKey.includes('auto') || categoryKey.includes('hogar')) {
    return CATEGORY_ICONS.hogar_autos;
  }
  if (categoryKey.includes('salud') || categoryKey.includes('farm') || categoryKey.includes('medic') || categoryKey.includes('dentist') || categoryKey.includes('belleza') || categoryKey.includes('gym') || categoryKey.includes('barber')) {
    return CATEGORY_ICONS.salud;
  }
  if (categoryKey.includes('entret') || categoryKey.includes('cine') || categoryKey.includes('teatro') || categoryKey.includes('deport')) {
    return CATEGORY_ICONS.entretenimiento;
  }
  if (categoryKey.includes('educa') || categoryKey.includes('escuela') || categoryKey.includes('curso') || categoryKey.includes('idioma')) {
    return CATEGORY_ICONS.educacion;
  }

  // Por defecto, usar el icono de Geobooker estándar
  return GEOBOOKER_ICON;
};

// Componente para la ventana de información del negocio
const BusinessInfoWindow = memo(({ business, userLocation, onCloseClick, onViewProfile, t }) => {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${business.latitude},${business.longitude}&travelmode=driving`;
  const isGeobooker = !!business.owner_id;

  return (
    <InfoWindow
      position={{ lat: business.latitude, lng: business.longitude }}
      onCloseClick={onCloseClick}
    >
      <div className="p-3 max-w-xs">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-lg text-gray-800">{business.name}</h3>
          {isGeobooker && (
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-1.5 py-0.5 rounded border border-yellow-200 font-bold">
              VERIFICADO
            </span>
          )}
        </div>
        <p className="text-gray-600 text-sm mb-1">
          <span className="font-semibold">{t('business.category')}:</span> {business.category}
        </p>
        <p className="text-gray-500 text-xs mb-3">
          <span className="font-semibold">{t('business.address')}:</span> {business.address}
        </p>
        <div className="flex justify-between items-center mb-3">
          <span className="text-yellow-500 text-sm font-semibold">
            ★ {business.rating || 'N/A'}
          </span>
          {business.distance && (
            <span className="text-gray-500 text-xs">
              {t('business.distance', { distance: business.distance.toFixed(1) })}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-green-600 text-white text-center py-2 rounded text-sm hover:bg-green-700 transition duration-200 font-semibold"
          >
            {t('business.getDirections')} 🚗
          </a>
          <button
            onClick={() => onViewProfile(business)}
            className="flex-1 bg-blue-600 text-white py-2 rounded text-sm hover:bg-blue-700 transition duration-200 font-semibold"
          >
            {t('business.viewProfile')}
          </button>
        </div>
      </div>
    </InfoWindow>
  );
});

// Componente principal del mapa
export const BusinessMap = memo(({
  userLocation,
  businesses = [],
  geobookerBusinesses = [],
  selectedBusiness,
  onBusinessSelect,
  onViewBusinessProfile,
  zoom = 14
}) => {
  const { t, i18n } = useTranslation();
  const mapCenter = userLocation || defaultCenter;

  // ⚡ useJsApiLoader en lugar de LoadScript - evita cargas múltiples
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: GOOGLE_MAPS_LIBRARIES,
    language: i18n.language
  });

  const mapOptions = useMemo(() => ({
    styles: [
      { featureType: 'poi.business', stylers: [{ visibility: 'on' }] },
      { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false, // Desactivado para ahorrar recursos
    mapTypeControl: false,
    fullscreenControl: true,
    minZoom: 10,
    maxZoom: 18
  }), []);

  // Función para calcular distancia
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  const googleMarkers = useMemo(() =>
    businesses.map((business) => ({
      ...business,
      distance: userLocation ? calculateDistance(
        userLocation.lat, userLocation.lng,
        business.latitude, business.longitude
      ) : null,
      type: 'google'
    })), [businesses, userLocation]
  );

  const geobookerMarkers = useMemo(() =>
    geobookerBusinesses.map((business) => ({
      ...business,
      distance: userLocation ? calculateDistance(
        userLocation.lat, userLocation.lng,
        business.latitude, business.longitude
      ) : null,
      type: 'geobooker'
    })), [geobookerBusinesses, userLocation]
  );

  // Estado de carga
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-100 text-red-600 rounded-lg">
        {t('map.mapError')}
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
        <span className="ml-2">{t('map.loadingMap')}</span>
      </div>
    );
  }

  return (
    <div className="w-full relative">
      {/* Estado del mapa */}
      <div className="absolute top-2 left-2 z-10 bg-white px-3 py-1 rounded-lg shadow-md text-sm text-gray-600">
        {userLocation ? `📍 ${t('home.locationActive')}` : `📍 ${t('home.locationDefault')}`}
      </div>

      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={mapCenter}
        zoom={zoom}
        options={mapOptions}
      >
        {/* Marcador del usuario */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={USER_ICON}
            title={t('map.yourLocation')}
            zIndex={1000}
          />
        )}

        {/* Marcadores de Google Places (Rosa) */}
        {googleMarkers.map((business) => (
          <Marker
            key={`google-${business.id}`}
            position={{ lat: business.latitude, lng: business.longitude }}
            onClick={() => onBusinessSelect(business)}
            icon={BUSINESS_ICON}
            title={business.name}
          />
        ))}

        {/* Marcadores de Geobooker (Íconos por categoría, Premium con estrella dorada) */}
        {geobookerMarkers.map((business) => {
          // Detectar si es negocio Premium (verificar flag is_premium_owner o is_premium)
          const isPremium = business.is_premium_owner || business.is_premium || false;
          // Obtener icono según categoría (o premium si aplica)
          const categoryIcon = getCategoryIcon(business.category, isPremium);

          return (
            <Marker
              key={`geobooker-${business.id}`}
              position={{ lat: business.latitude, lng: business.longitude }}
              onClick={() => onBusinessSelect(business)}
              icon={categoryIcon}
              title={isPremium ? `⭐ ${business.name} (Premium)` : business.name}
              zIndex={isPremium ? 1000 : 900}
              animation={isPremium ? window.google?.maps?.Animation?.BOUNCE : undefined}
            />
          );
        })}

        {/* InfoWindow del negocio seleccionado */}
        {selectedBusiness && (
          <BusinessInfoWindow
            business={selectedBusiness}
            userLocation={userLocation}
            onCloseClick={() => onBusinessSelect(null)}
            onViewProfile={onViewBusinessProfile}
            t={t}
          />
        )}
      </GoogleMap>
    </div>
  );
});

export default BusinessMap;