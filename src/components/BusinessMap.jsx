import React, { useMemo, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

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

// Iconos personalizados
const USER_ICON = {
  // Pin Azul con usuario
  url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAiIGhlaWdodD0iNTAiIHZpZXdCb3g9IjAgMCA1MCA1MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIyMCIgZmlsbD0iIzQyODVGNCIgZmlsbC1vcGFjaXR5PSIwLjIiLz4KICA8Y2lyY2xlIGN4PSIyNSIgY3k9IjI1IiByPSIxMiIgZmlsbD0iIzQyODVGNCIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIyIi8+Cjwvc3ZnPg==',
  scaledSize: { width: 50, height: 50 },
  anchor: { x: 25, y: 25 }
};

const BUSINESS_ICON = {
  // Pin Rosa estilo Geobooker (Google Places)
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

// Componente para la ventana de información del negocio
const BusinessInfoWindow = memo(({ business, userLocation, onCloseClick, onViewProfile, t }) => {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${business.latitude},${business.longitude}&travelmode=driving`;

  const isGeobooker = !!business.owner_id; // Identificar si es nativo

  return (
    <InfoWindow
      position={{
        lat: business.latitude,
        lng: business.longitude
      }}
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
  businesses = [], // Google Places
  geobookerBusinesses = [], // Geobooker Native
  selectedBusiness,
  onBusinessSelect,
  onViewBusinessProfile,
  zoom = 14
}) => {
  const { t, i18n } = useTranslation();
  const mapCenter = userLocation || defaultCenter;

  // Optimización: useMemo para opciones que no cambian
  const mapOptions = useMemo(() => ({
    styles: [
      {
        featureType: 'poi.business',
        stylers: [{ visibility: 'on' }]
      },
      {
        featureType: 'poi.attraction',
        stylers: [{ visibility: 'off' }]
      }
    ],
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: true,
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

  // Procesar marcadores de Google Places
  const googleMarkers = useMemo(() =>
    businesses.map((business) => ({
      ...business,
      distance: userLocation ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        business.latitude,
        business.longitude
      ) : null,
      type: 'google'
    })), [businesses, userLocation]
  );

  // Procesar marcadores de Geobooker
  const geobookerMarkers = useMemo(() =>
    geobookerBusinesses.map((business) => ({
      ...business,
      distance: userLocation ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        business.latitude,
        business.longitude
      ) : null,
      type: 'geobooker'
    })), [geobookerBusinesses, userLocation]
  );

  return (
    <div className="w-full relative">
      {/* Estado del mapa */}
      <div className="absolute top-2 left-2 z-10 bg-white px-3 py-1 rounded-lg shadow-md text-sm text-gray-600">
        {userLocation ? `📍 ${t('home.locationActive')}` : `📍 ${t('home.locationDefault')}`}
      </div>

      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        language={i18n.language}
        // ⚡ OPTIMIZACIÓN: No cargar 'places' library - usamos Supabase, no Google Places API
        loadingElement={
          <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            <span className="ml-2">{t('map.loadingMap')}</span>
          </div>
        }
        errorElement={
          <div className="flex items-center justify-center h-64 bg-red-100 text-red-600 rounded-lg">
            {t('map.mapError')}
          </div>
        }
      >
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
              position={{
                lat: business.latitude,
                lng: business.longitude
              }}
              onClick={() => onBusinessSelect(business)}
              icon={BUSINESS_ICON}
              title={business.name}
            />
          ))}

          {/* Marcadores de Geobooker (Dorado) */}
          {geobookerMarkers.map((business) => (
            <Marker
              key={`geobooker-${business.id}`}
              position={{
                lat: business.latitude,
                lng: business.longitude
              }}
              onClick={() => onBusinessSelect(business)}
              icon={GEOBOOKER_ICON}
              title={business.name}
              zIndex={900} // Encima de los normales
            />
          ))}

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
      </LoadScript>
    </div>
  );
});

export default BusinessMap;