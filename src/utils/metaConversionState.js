// First-party state only: account/business IDs remain on this device and are
// never passed as Meta event parameters. No historical conversion backfill.
const STORAGE_KEY = 'gb_meta_completed_actions_v1';
const METHODS = new Set(['email', 'google', 'apple', 'oauth']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createMetaConversionTracker({ storage, sendRegistration, sendPublication, lookupFirstPublishedBusiness, now = Date.now }) {
  const inFlight = new Map();
  function read() {
    const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}');
    return { registrations: {}, businesses: {}, completedRegistrations: {}, completedBusinesses: {}, ...value };
  }
  function write(state) { storage.setItem(STORAGE_KEY, JSON.stringify(state)); }

  function recordSignup(data) {
    const user = data?.user;
    // Supabase may return an obfuscated user with no identities for an existing account.
    if (!UUID.test(user?.id || '') || !Array.isArray(user.identities) || !user.identities.length) return false;
    const state = read();
    state.registrations[user.id] = { method: 'email' };
    write(state);
    return true;
  }

  function recordOAuthAttempt(method) {
    if (!['google', 'apple'].includes(method)) return;
    const state = read();
    state.oauth = { method, startedAt: now() };
    write(state);
  }

  function recordBusiness(business, userId) {
    if (!UUID.test(userId || '') || !UUID.test(business?.id || '')
      || business.owner_id !== userId || business.listing_type === 'space_rental') return false;
    const state = read();
    if (state.completedBusinesses[userId]) return false;
    state.businesses[userId] = [...new Set([...(state.businesses[userId] || []), business.id])].slice(-20);
    write(state);
    return true;
  }

  async function processSession(session) {
    const user = session?.user;
    if (!UUID.test(user?.id || '') || user.is_anonymous || !(user.email_confirmed_at || user.confirmed_at)) return;
    const userId = user.id;
    let state = read();
    if (state.oauth) {
      const createdAt = Date.parse(user.created_at);
      const age = now() - state.oauth.startedAt;
      if (age >= 0 && age <= 30 * 60 * 1000 && createdAt >= state.oauth.startedAt
        && createdAt <= now() && user.app_metadata?.provider === state.oauth.method) {
        state.registrations[userId] = { method: state.oauth.method };
      }
      delete state.oauth;
      write(state);
    }
    const registration = state.registrations[userId];
    if (registration && !state.completedRegistrations[userId] && METHODS.has(registration.method)) {
      if (await sendRegistration({ method: registration.method, userId })) {
        state = read();
        state.completedRegistrations[userId] = true;
        delete state.registrations[userId];
        write(state);
      }
    }
    state = read();
    if (!state.completedBusinesses[userId] && state.businesses[userId]?.length) {
      const first = await lookupFirstPublishedBusiness(userId);
      if (!first) return; // Pending moderation is not a publication.
      if (first.owner_id !== userId || first.status !== 'approved' || first.listing_type === 'space_rental') return;
      if (!state.businesses[userId].includes(first.id)) {
        // This account already had a published business before the tracked submission.
        delete state.businesses[userId];
        write(state);
        return;
      }
      if (await sendPublication(userId)) {
        state = read();
        state.completedBusinesses[userId] = true;
        delete state.businesses[userId];
        write(state);
      }
    }
  }

  function observeSession(session) {
    const id = session?.user?.id;
    if (!id) return Promise.resolve();
    if (inFlight.has(id)) return inFlight.get(id);
    const promise = processSession(session).finally(() => inFlight.delete(id));
    inFlight.set(id, promise);
    return promise;
  }
  return { recordSignup, recordOAuthAttempt, recordBusiness, observeSession };
}
