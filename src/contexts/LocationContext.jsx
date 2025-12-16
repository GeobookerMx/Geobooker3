// src/contexts/LocationContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const LocationContext = createContext(null);

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation debe usarse dentro de LocationProvider");
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  const [userLocation, setUserLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestLocationPermission = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(location);
          setPermissionGranted(true);
          setLoading(false);
          resolve(location);
        },
        (error) => {
          setLoading(false);
          setPermissionGranted(false);

          let errorMessage = "Error al obtener la ubicación";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = "Permiso de ubicación denegado";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = "Información de ubicación no disponible";
              break;
            case error.TIMEOUT:
              errorMessage = "Tiempo de espera agotado";
              break;
            default:
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 10000, // Reducido a 10s para ubicación más fresca en móviles
        }
      );
    });
  };

  // Función para refrescar ubicación manualmente (útil en móviles)
  const refreshLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setUserLocation(location);
          setLoading(false);
          resolve(location);
        },
        (error) => {
          setLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0, // Forzar ubicación fresca, sin caché
        }
      );
    });
  };

  const updateLocation = (lat, lng) => {
    setUserLocation({ lat, lng });
  };

  useEffect(() => {
    // Verificar si ya tenemos permisos y obtener ubicación automáticamente
    const checkPermissionAndGetLocation = async () => {
      try {
        // Verificar si el navegador soporta Permissions API
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });

          if (result.state === 'granted') {
            // Ya tenemos permisos, obtener ubicación automáticamente
            console.log('📍 Permisos de ubicación ya otorgados, obteniendo ubicación...');
            await requestLocationPermission();
          } else if (result.state === 'prompt') {
            // El usuario aún no ha decidido, no mostrar nada automáticamente
            setLoading(false);
          } else {
            // Permisos denegados
            setLoading(false);
            setPermissionGranted(false);
          }

          // Escuchar cambios en permisos
          result.addEventListener('change', () => {
            if (result.state === 'granted') {
              requestLocationPermission();
            }
          });
        } else {
          // Navegador no soporta Permissions API (Safari antiguo, etc.)
          // Intentar obtener ubicación directamente
          setLoading(false);
        }
      } catch (error) {
        console.log('Error checking permissions:', error);
        setLoading(false);
      }
    };

    checkPermissionAndGetLocation();
  }, []);

  const value = {
    userLocation,
    loading,
    permissionGranted,
    requestLocationPermission,
    refreshLocation,
    updateLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

export default LocationProvider;
