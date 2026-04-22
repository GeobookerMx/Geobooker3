// src/contexts/LocationContext.jsx
// Apple Guideline 2.1(a) fix: prevent location permission loop
import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { requestDeviceLocation } from "../services/deviceLocationService";

const LocationContext = createContext(null);

const LOCATION_STORAGE_KEY = 'geobooker_last_location';

// Save location to localStorage
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

// Get last stored location
const getStoredLocation = () => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (stored) {
      const locationData = JSON.parse(stored);
      // Check if location is less than 24 hours old
      const maxAge = 24 * 60 * 60 * 1000;
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
  // Try to load last stored location immediately
  const storedLocation = getStoredLocation();
  const [userLocation, setUserLocation] = useState(storedLocation);
  const [loading, setLoading] = useState(!storedLocation);
  const [permissionGranted, setPermissionGranted] = useState(!!storedLocation);

  // FIX: Prevent multiple permission requests (Apple 2.1(a) bug)
  const hasRequestedRef = useRef(false);
  const permissionCheckDoneRef = useRef(false);

  const requestLocationPermission = async () => {
    hasRequestedRef.current = true;

    // On native iOS/Android use Capacitor plugin for proper permission handling
    if (Capacitor.isNativePlatform()) {
      const result = await requestDeviceLocation();
      if (result.ok) {
        const location = { lat: result.latitude, lng: result.longitude };
        setUserLocation(location);
        saveLocationToStorage(location);
        setPermissionGranted(true);
        setLoading(false);
        return location;
      }
      // Denied or error — fall through to cached/default
      const cached = getStoredLocation();
      if (cached) {
        setUserLocation(cached);
        setPermissionGranted(true);
        setLoading(false);
        return cached;
      }
      setPermissionGranted(false);
      setLoading(false);
      throw new Error(result.message || "Ubicación no disponible");
    }

    // Web fallback: browser geolocation API
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const cached = getStoredLocation();
        if (cached) {
          setUserLocation(cached);
          setLoading(false);
          resolve(cached);
          return;
        }
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
          saveLocationToStorage(location);
          setPermissionGranted(true);
          setLoading(false);
          resolve(location);
        },
        () => {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy,
              };
              setUserLocation(location);
              saveLocationToStorage(location);
              setPermissionGranted(true);
              setLoading(false);
              resolve(location);
            },
            () => {
              const cachedLocation = getStoredLocation();
              if (cachedLocation) {
                setUserLocation(cachedLocation);
                setPermissionGranted(true);
                setLoading(false);
                resolve(cachedLocation);
                return;
              }
              const defaultLocation = { lat: 19.4326, lng: -99.1332, accuracy: 10000, isDefault: true };
              setUserLocation(defaultLocation);
              setPermissionGranted(true);
              setLoading(false);
              resolve(defaultLocation);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
          );
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      );
    });
  };

  const refreshLocation = async () => {
    setLoading(true);
    if (Capacitor.isNativePlatform()) {
      const result = await requestDeviceLocation();
      if (result.ok) {
        const location = { lat: result.latitude, lng: result.longitude };
        setUserLocation(location);
        saveLocationToStorage(location);
        setLoading(false);
        return location;
      }
      setLoading(false);
      throw new Error(result.message);
    }

    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { setLoading(false); reject(new Error("Geolocalización no soportada")); return; }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy };
          setUserLocation(location);
          saveLocationToStorage(location);
          setLoading(false);
          resolve(location);
        },
        (error) => { setLoading(false); reject(error); },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    });
  };

  const updateLocation = (lat, lng) => {
    setUserLocation({ lat, lng });
  };

  useEffect(() => {
    // FIX: Only check permissions ONCE to prevent loop (Apple 2.1(a))
    if (permissionCheckDoneRef.current) return;
    permissionCheckDoneRef.current = true;

    const checkPermissionAndGetLocation = async () => {
      try {
        // Check if browser supports Permissions API
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });

          if (result.state === 'granted') {
            // Already have permissions, get location silently
            console.log('📍 Location permissions already granted, getting location...');
            if (!hasRequestedRef.current) {
              await requestLocationPermission();
            }
          } else if (result.state === 'prompt') {
            // User hasn't decided yet — DON'T auto-prompt
            // Let the UI show a modal/prompt component instead
            setLoading(false);
          } else if (result.state === 'denied') {
            // Permissions denied — DON'T ask again (causes loop!)
            console.log('📍 Location permissions denied — not re-requesting');
            setLoading(false);
            setPermissionGranted(false);
            // Still use cached location if available
            const cached = getStoredLocation();
            if (cached) {
              setUserLocation(cached);
            }
          }

          // Listen for permission changes (e.g., user enables in Settings)
          result.addEventListener('change', () => {
            if (result.state === 'granted' && !hasRequestedRef.current) {
              requestLocationPermission();
            }
          });
        } else {
          // Browser doesn't support Permissions API (old Safari, etc.)
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
