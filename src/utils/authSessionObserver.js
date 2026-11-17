// Supabase remains the owner of persisted credentials. This coordinates UI state,
// so an old startup read/timer cannot undo a newer SIGNED_IN or SIGNED_OUT event.
export function observeAuthSession({
  auth, onState, onError = () => {}, onUser = () => {}, timeoutMs = 15000,
  schedule = setTimeout, cancel = clearTimeout,
}) {
  let disposed = false;
  let revision = 0;
  let receivedLiveEvent = false;
  let timer;
  let subscription;

  const stopTimer = () => { cancel(timer); timer = undefined; };
  const unavailable = (error) => {
    if (disposed) return;
    stopTimer();
    onError(error);
    // A connectivity failure is not a sign-out. Preserve any current user.
    onState({ loading: false, authError: 'No pudimos comprobar tu sesión. Revisa tu conexión y vuelve a intentar.' });
  };
  const accept = (session) => {
    if (disposed) return;
    stopTimer();
    onState({ user: session?.user ?? null, loading: false, authError: null });
    if (session?.user) onUser(session.user);
  };

  timer = schedule(() => {
    if (revision === 0) unavailable(new Error('auth_initialization_timeout'));
  }, timeoutMs);

  try {
    const result = auth.onAuthStateChange((event, session) => {
      if (disposed || (event === 'INITIAL_SESSION' && receivedLiveEvent)) return;
      // Null payloads from unrelated events must not log the user out.
      if (!session?.user && !['INITIAL_SESSION', 'SIGNED_OUT'].includes(event)) return;
      if (event !== 'INITIAL_SESSION') receivedLiveEvent = true;
      revision += 1;
      accept(session);
    });
    subscription = result.data.subscription;
    const readRevision = revision;
    Promise.resolve(auth.getSession()).then(({ data, error }) => {
      if (disposed || revision !== readRevision) return;
      if (error) unavailable(error);
      else accept(data?.session);
    }).catch(error => {
      if (!disposed && revision === readRevision) unavailable(error);
    });
  } catch (error) {
    unavailable(error);
  }

  return () => {
    disposed = true;
    stopTimer();
    subscription?.unsubscribe();
  };
}

// Do not force refreshSession() on resume: returning from Apple OAuth also
// resumes the app. Let the SDK coordinate expiry/refresh and its token locks.
export function setAuthRefreshActivity(auth, isActive) {
  return isActive ? auth.startAutoRefresh() : auth.stopAutoRefresh();
}
