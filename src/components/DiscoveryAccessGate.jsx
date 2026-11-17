import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { isDiscoveryPath, rememberAuthDestination, requiresDiscoveryAccount } from '../utils/discoveryAccess';

export default function DiscoveryAccessGate({ children, required }) {
  const { user, loading, authError, retrySession } = useAuth();
  const location = useLocation();
  const needsAccount = required ?? (isDiscoveryPath(location.pathname) && requiresDiscoveryAccount({
    hostname: window.location.hostname,
    isNative: Capacitor.isNativePlatform(),
    platform: Capacitor.getPlatform(),
  }));
  if (!needsAccount || (user && !user.is_anonymous)) return children;
  if (loading) return <div role="status" className="flex min-h-[60vh] items-center justify-center px-6 text-slate-700">Comprobando tu sesión…</div>;
  const destination = location.pathname + location.search + location.hash;
  const next = encodeURIComponent(destination);
  return (
    <section className="mx-auto flex min-h-[65vh] max-w-lg flex-col justify-center px-6 py-12 text-center">
      <img src="/images/geobooker-logo.png" alt="Geobooker" className="mx-auto mb-6 h-16 w-auto" />
      <h1 className="text-3xl font-bold text-slate-900">Inicia sesión para explorar Geobooker</h1>
      <p className="mt-4 text-slate-600">Accede a tu cuenta para buscar negocios, explorar el mapa y utilizar nuestras herramientas. Al terminar, volverás a donde estabas.</p>
      {authError && <div role="alert" className="mt-4 rounded-xl bg-amber-50 p-4 text-amber-900">
        <p>No pudimos comprobar tu sesión. Revisa tu conexión.</p>
        <button type="button" onClick={retrySession} className="mt-2 min-h-[44px] rounded-lg border border-amber-700 px-4 py-2 font-semibold">Volver a comprobar</button>
      </div>}
      <Link to={`/login?next=${next}`} onClick={() => rememberAuthDestination(destination)} className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Iniciar sesión</Link>
      <Link to={`/signup?next=${next}`} onClick={() => rememberAuthDestination(destination)} className="mt-3 rounded-xl border border-blue-600 px-6 py-3 font-semibold text-blue-700">Crear una cuenta</Link>
      <p className="mt-6 text-sm text-slate-500"><Link to="/privacy" className="underline">Privacidad</Link> · <Link to="/terms" className="underline">Términos de uso</Link> · <Link to="/support" className="underline">Ayuda</Link></p>
    </section>
  );
}
