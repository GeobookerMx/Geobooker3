export const featureFlags = Object.freeze({
  crm2ImportReview: import.meta.env.VITE_CRM2_IMPORT_REVIEW_ENABLED === 'true',
  crm2Operations: import.meta.env.VITE_CRM2_OPERATIONS_ENABLED === 'true',
  crm2Directory: import.meta.env.VITE_CRM2_DIRECTORY_ENABLED === 'true',
  ttStorageDiscovery: import.meta.env.VITE_TT_STORAGE_DISCOVERY_ENABLED === 'true',
  internationalEmailCenter: import.meta.env.VITE_INTERNATIONAL_EMAIL_CENTER_ENABLED === 'true',
  adsLegacyDisplayFormats: import.meta.env.VITE_ADS_LEGACY_DISPLAY_FORMATS === 'true',
  adsSponsoredCardV1: import.meta.env.VITE_ADS_SPONSORED_CARD_V1 !== 'false'
});
