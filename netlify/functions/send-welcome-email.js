// Retired: account setup is handled by Supabase invite/recovery links.
exports.handler = async () => ({
  statusCode: 410,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff'
  },
  body: JSON.stringify({ error: 'endpoint_retired' })
});
