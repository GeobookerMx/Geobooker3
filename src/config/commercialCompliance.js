export const COMMERCIAL_TERMS_VERSION = 'geobooker_commercial_terms_2026_v1';

export const COMMERCIAL_FISCAL_NOTICE =
  'Todos los pagos se registran con trazabilidad comercial y fiscal. Si requiere CFDI, factura o invoice comercial, envie sus datos fiscales antes de la ejecucion del servicio.';

export const COMMERCIAL_NO_GUARANTEE_NOTICE =
  'Geobooker no garantiza ventas, reuniones, respuestas, clics, entregabilidad universal ni resultados comerciales especificos.';

export const ADS_REVIEW_NOTICE =
  'La publicacion de anuncios queda sujeta a revision editorial, fiscal, tecnica, territorial, de inventario y cumplimiento. La revision estimada es de 12 a 72 horas despues del pago y materiales completos.';

export const CONNECT_RESERVATION_NOTICE =
  'La reserva Connect es un anticipo operativo para revisar brief, audiencia, copy, cumplimiento y viabilidad. No inicia envios automaticos ni entrega bases descargables.';

export const buildTermsSnapshot = (scope = 'commercial') => ({
  terms_version: COMMERCIAL_TERMS_VERSION,
  scope,
  accepted_at: new Date().toISOString(),
  fiscal_notice: COMMERCIAL_FISCAL_NOTICE,
  no_guarantee_notice: COMMERCIAL_NO_GUARANTEE_NOTICE
});
