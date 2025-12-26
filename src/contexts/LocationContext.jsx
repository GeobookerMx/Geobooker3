// src/contexts/LocationContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";

const LocationContext = createContext(null);

const LOCATION_STORAGE_KEY = 'geobooker_last_location';

// Función para guardar ubicación en localStorage
const saveLocationToStorage = (location) => {
  try {
    const locationData = {
      ...location,
      timestamp: Date.now()
    };
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locationData));
  } catch (e) {
    console.log('Error saving location to storage:', e);
  }
};

// Función para obtener última ubicación guardada
const getStoredLocation = () => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const locationData = JSON.parse(stored);
      // Verificar si la ubicación no tiene más de 24 horas
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      if (Date.now() - locationData.timestamp < maxAge) {
        return {
          lat: locationData.lat,
          lng: locationData.lng,
          accuracy: locationData.accuracy,
          fromCache: true
        };
      }
    }
  } catch (e) {
    console.log('Error reading stored location:', e);
  }
  return null;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error("useLocation debe usarse dentro de LocationProvider");
  }
  return context;
};

export const LocationProvider = ({ children }) => {
  // Intentar cargar última ubicación guardada inmediatamente
  const storedLocation = getStoredLocation();
  const [userLocation, setUserLocation] = useState(storedLocation);
  const [loading, setLoading] = useState(!storedLocation); // No loading si tenemos caché
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestLocationPermission = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        // Use cached if available
        const cached = getStoredLocation();
        if (cached) {
          console.log('📍 Usando ubicación cacheada (sin geolocalización)');
          setUserLocation(cached);
          setLoading(false);
          resolve(cached);
          return;
        }
        reject(new Error("Geolocalización no soportada"));
        return;
      }

      // Primero intentar con baja precisión (más rápido, usa WiFi/IP)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          console.log('📍 Ubicación obtenida:', location);
          setUserLocation(location);
          saveLocationToStorage(location); // Guardar en localStorage
          setPermissionGranted(true);
          setLoading(false);
          resolve(location);
        },
        (error) => {
          // Si falla con baja precisión, intentar con alta precisión y más tiempo
          console.log('⚠️ Reintentando con alta precisión...');
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              };
              console.log('📍 Ubicación obtenida (alta precisión):', location);
              setUserLocation(location);
              saveLocationToStorage(location); // Guardar en localStorage
              setPermissionGranted(true);
              setLoading(false);
              resolve(location);
            },
            (err) => {
              // FALLBACK: Usar ubicación cacheada si existe
              const cachedLocation = getStoredLocation();
              if (cachedLocation) {
                console.log('📍 Usando ubicación cacheada por timeout:', cachedLocation);
                setUserLocation(cachedLocation);
                setPermissionGranted(true);
                setLoading(false);
                resolve(cachedLocation);
                return;
              }

              // FALLBACK 2: Usar ubicación por defecto (CDMX)
              console.log('📍 Usando ubicación por defecto (CDMX)');
              const defaultLocation = {
                lat: 19.4326,
                lng: -99.1332,
                accuracy: 10000,
                isDefault: true
              };
              setUserLocation(defaultLocation);
              setLoading(false);
              resolve(defaultLocation);
            },
            {
              enableHighAccuracy: true,
              timeout: 15000, // 15 segundos para alta precisión
              maximumAge: 300000, // Usar caché de hasta 5 minutos
            }
          );
        },
        {
          enableHighAccuracy: false, // Baja precisión primero (más rápido)
          timeout: 8000, // 8 segundos
          maximumAge: 600000, // Usar caché de hasta 10 minutos
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
          saveLocationToStorage(location); // Guardar en localStorage
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
