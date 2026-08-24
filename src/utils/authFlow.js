import { Capacitor } from '@capacitor/core';

export const AUTH_REQUEST_TIMEOUT_MS = Capacitor.isNativePlatform() ? 30_000 : 18_000;

export const withAuthTimeout = (operation, timeoutMs = AUTH_REQUEST_TIMEOUT_MS) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error('La conexión de acceso tardó demasiado. Revisa tu internet e inténtalo nuevamente.');
      error.code = 'auth_timeout';
      reject(error);
    }, timeoutMs);
  });

  return Promise.race([operation, timeout]).finally(() => clearTimeout(timeoutId));
};
