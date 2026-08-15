export const featureFlags = Object.freeze({
  // Enabled by default for the controlled production rollout. Netlify can
  // disable the UI immediately by setting the value explicitly to "false".
  commercialSpaces: import.meta.env.VITE_COMMERCIAL_SPACES_ENABLED !== 'false'
});
