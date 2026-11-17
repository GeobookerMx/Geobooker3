// Provider descriptions are untrusted and may include codes or personal data.
// Return only fixed categories and copy; never display or store the raw text.
const messages = {
  auth_cancelled: 'Cancelaste el acceso. Puedes intentarlo de nuevo o elegir otro método.',
  auth_provider_unavailable: 'El servicio de acceso no está disponible en este momento. Inténtalo más tarde o utiliza otro método.',
  auth_provider_configuration: 'Este método de acceso no está disponible. Utiliza otro método mientras lo solucionamos.',
  auth_code_expired: 'Este intento de acceso venció. Inicia uno nuevo desde esta pantalla.',
  auth_exchange_failed: 'Tu proveedor no pudo completar el acceso. Inicia un intento nuevo o utiliza otro método.',
  auth_failed: 'No se pudo completar el acceso. Inténtalo de nuevo o utiliza otro método.'
};

export function getOAuthError(search = '', hash = '') {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ''));
  const value = (key) => query.get(key) || fragment.get(key) || '';
  const error = value('error');
  const errorCode = value('error_code');
  if (!error && !errorCode) return null;

  const detail = `${error} ${errorCode} ${value('error_description')}`.toLowerCase();
  let code = 'auth_failed';
  if (Object.hasOwn(messages, error)) code = error;
  else if (/access_denied|user_cancel|authorization_canceled/.test(detail)) code = 'auth_cancelled';
  else if (/503|temporarily_unavailable|service.unavailable|threads not available/.test(detail)) code = 'auth_provider_unavailable';
  else if (/invalid_client|unauthorized_client/.test(detail)) code = 'auth_provider_configuration';
  else if (/invalid_grant|code.*expired|flow_state_expired/.test(detail)) code = 'auth_code_expired';
  else if (/unable.to.exchange.external.code|unexpected_failure/.test(detail)) code = 'auth_exchange_failed';

  return { code, message: messages[code] };
}
