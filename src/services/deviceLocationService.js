import { Geolocation } from '@capacitor/geolocation';

export const requestDeviceLocation = async () => {
  try {
    const permission = await Geolocation.requestPermissions();

    if (permission.location !== 'granted') {
      return {
        ok: false,
        reason: 'denied',
        message: 'El usuario no concedió permiso de ubicación.',
      };
    }

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