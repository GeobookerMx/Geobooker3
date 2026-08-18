export const featureFlags = Object.freeze({
  crm2ImportReview: import.meta.env.VITE_CRM2_IMPORT_REVIEW_ENABLED === 'true',
  crm2Operations: import.meta.env.VITE_CRM2_OPERATIONS_ENABLED === 'true',
  crm2Directory: import.meta.env.VITE_CRM2_DIRECTORY_ENABLED === 'true',
  crmEmailQueue: import.meta.env.VITE_CRM_EMAIL_QUEUE_ENABLED === 'true',
  crmEmailSend: import.meta.env.VITE_CRM_EMAIL_SEND_ENABLED === 'true',
  ttStorageDiscovery: import.meta.env.VITE_TT_STORAGE_DISCOVERY_ENABLED === 'true'
});
