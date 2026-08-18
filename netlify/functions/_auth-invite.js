const ALLOWED_INVITE_ORIGINS = new Set([
  'https://geobooker.com.mx',
  'https://www.geobooker.com.mx'
]);

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getInviteRedirect(siteUrl = '') {
  try {
    const origin = new URL(siteUrl).origin;
    if (ALLOWED_INVITE_ORIGINS.has(origin)) return `${origin}/reset-password`;
  } catch {
    // Fall through to the canonical production URL.
  }
  return 'https://geobooker.com.mx/reset-password';
}

async function findUserByEmail(adminAuth, email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;

  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await adminAuth.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const match = users.find((user) => normalizeEmail(user.email) === normalized);
    if (match) return match;
    if (users.length < perPage) return null;
  }

  throw new Error('Auth user lookup exceeded the bounded page limit');
}

async function ensureInvitedAdvertiser(supabase, { email, metadata = {}, redirectTo }) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) throw new Error('Invalid advertiser email');

  const existing = await findUserByEmail(supabase.auth.admin, normalized);
  if (existing) return { userId: existing.id, invited: false };

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(normalized, {
    data: metadata,
    redirectTo
  });
  if (!error && data?.user?.id) return { userId: data.user.id, invited: true };

  const racedUser = await findUserByEmail(supabase.auth.admin, normalized);
  if (racedUser) return { userId: racedUser.id, invited: false };
  throw error || new Error('Supabase invitation did not return a user');
}

module.exports = {
  ensureInvitedAdvertiser,
  findUserByEmail,
  getInviteRedirect,
  normalizeEmail
};
