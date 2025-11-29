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

// Iconos optimizados
const USER_ICON = {
  url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDNy41ODYgMiA0IDUuNTg2IDQgMTBDNCAxNS4yNzQgOS4yNCAyMS40NjMgMTEuNTYgMjMuNzQ0QzExLjgyIDI0LjA4NSAxMi4xOCAyNC4wODUgMTIuNDQgMjMuNzQ0QzE0Ljc2IDIxLjQ2MyAyMCAxNS4yNzQgMjAgMTBDMjAgNS41ODYgMTYuNDE0IDIgMTIgMloiIGZpbGw9IiM0Njg1RjYiLz4KPHBhdGggZD0iTTEyIDEzQzEzLjY1NyAxMyAxNSAxMS42NTcgMTUgMTBDMTUgOC4zNDMgMTMuNjU3IDcgMTIgN0MxMC4zNDMgNyA5IDguMzQzIDkgMTBDOSAxMS42NTcgMTAuMzQzIDEzIDEyIDEzWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
  scaledSize: { width: 40, height: 40 }
};

const BUSINESS_ICON = {
  url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTE5IDIxSDVDMy44OTUgMjEgMyAyMC4xMDUgMyAxOVY5QzMgNy44OTUgMy44OTUgNyA1IDdIMTlDMjAuMTA1IDcgMjEgNy44OTUgMjEgOVYxOUMyMSAyMC4xMDUgMjAuMTA1IDIxIDE5IDIxWiIgc3Ryb2tlPSIjRjU5NTM2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMTYgM1Y3IiBzdHJva2U9IiNGNTk1MzYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxwYXRoIGQ9Ik04IDNWNyIgc3Ryb2tlPSIjRjU5NTM2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8cGF0aCBkPSJNMyAxMUgyMSIgc3Ryb2tlPSIjRjU5NTM2IiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPgo8L3N2Zz4K',
  scaledSize: { width: 32, height: 32 }
};

// Componente para la ventana de información del negocio
const BusinessInfoWindow = memo(({ business, userLocation, onCloseClick, onViewProfile, t }) => {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${userLocation?.lat},${userLocation?.lng}&destination=${business.latitude},${business.longitude}&travelmode=driving`;

  return (
    <InfoWindow
      position={{
        lat: business.latitude,
        lng: business.longitude
      }}
      onCloseClick={onCloseClick}
    >
      <div className="p-3 max-w-xs">
        <h3 className="font-bold text-lg text-gray-800 mb-2">{business.name}</h3>
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

  // Optimización: useMemo para negocios con distancia calculada
  const businessMarkers = useMemo(() =>
    businesses.map((business) => {
      // Calcular distancia para cada negocio
      const distance = userLocation ? calculateDistance(
        userLocation.lat,
        userLocation.lng,
        business.latitude,
        business.longitude
      ) : null;

      return {
        ...business,
        distance
      };
    }), [businesses, userLocation]
  );

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

  return (
    <div className="w-full relative">
      {/* Estado del mapa */}
      <div className="absolute top-2 left-2 z-10 bg-white px-3 py-1 rounded-lg shadow-md text-sm text-gray-600">
        {userLocation ? `📍 ${t('home.locationActive')}` : `📍 ${t('home.locationDefault')}`}
      </div>

      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        language={i18n.language}
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

          {/* Marcadores de negocios */}
          {businessMarkers.map((business) => (
            <Marker
              key={business.id}
              position={{
                lat: business.latitude,
                lng: business.longitude
              }}
              onClick={() => onBusinessSelect(business)}
              icon={BUSINESS_ICON}
              title={business.name}
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