import { Geolocation } from '@capacitor/geolocation';

export const checkDeviceLocationPermissions = async () => {
  return Geolocation.checkPermissions();
};

export const requestDeviceLocation = async () => {
  try {
    // Step 1: Check current permission status BEFORE requesting
    // This prevents iOS from opening Settings automatically if already denied
    const status = await checkDeviceLocationPermissions();

    if (status.location === 'denied') {
      // Permission was previously denied — do NOT request again (opens Settings on iOS)
      return {
        ok: false,
        reason: 'denied',
        message: 'El permiso de ubicación fue denegado. Puedes activarlo en Configuración > Privacidad > Ubicación.',
      };
    }

    // Step 2: If not yet decided, request it (shows native iOS/Android prompt)
    if (status.location !== 'granted') {
      const permission = await Geolocation.requestPermissions();
      if (permission.location !== 'granted') {
        return {
          ok: false,
          reason: 'denied',
          message: 'El usuario no concedió permiso de ubicación.',
        };
      }
    }

    // Step 3: Permission is granted, get location
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });

    return {
      ok: true,
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'error',
      message: error?.message || 'No se pudo obtener la ubicación del dispositivo.',
    };
  }
};
