// src/pages/AuthCallback.jsx
// Maneja el callback de OAuth (Google, Apple, Facebook) después de autenticación.
//
// Estrategia:
// - Espera activamente al evento SIGNED_IN de Supabase en lugar de hacer polling
//   sobre getSession(). Esto evita el race condition donde getSession() responde
//   `null` porque el token de la URL todavía no se procesó internamente.
// - Hasta 8s de espera total: si para entonces no llegó SIGNED_IN, revisa una vez
//   más getSession() (cubre el caso donde la sesión ya estaba persistida y no
//   se dispara un nuevo evento).
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackUserLogin } from '../services/analyticsService';

const MAX_WAIT_MS = 8000;

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');

    useEffect(() => {
        let resolved = false;
        let timeoutId;
        let subscription;

        const persistProfile = async (sessionUser) => {
            try {
                const registrationDomain = window.location.hostname;
                const preferredLanguage = registrationDomain.includes('.mx') ? 'es' : 'en';
                await supabase.from('user_profiles').upsert({
                    id: sessionUser.id,
                    email: sessionUser.email,
                    full_name: sessionUser.user_metadata?.full_name || sessionUser.email?.split('@')[0],
                    preferred_language: preferredLanguage,
                    registration_domain: registrationDomain,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id', ignoreDuplicates: false });
            } catch (e) {
                console.warn('[AuthCallback] No se pudo persistir user_profiles:', e);
            }
        };

        const onSuccess = async (session) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            if (subscription) subscription.unsubscribe();

            setStatus('success');
            const provider = session.user?.app_metadata?.provider || 'oauth';
            try { trackUserLogin(session.user.id, provider); } catch (e) { /* analytics opcional */ }
            await persistProfile(session.user);

            // Pequeño delay para mostrar el mensaje de éxito antes de redirigir
            setTimeout(() => navigate('/', { replace: true }), 800);
        };

        const onFailure = (reason) => {
            if (resolved) return;
            resolved = true;
            clearTimeout(timeoutId);
            if (subscription) subscription.unsubscribe();

            console.error('[AuthCallback] Falló el callback:', reason);
            setStatus('error');
            setTimeout(() => {
                navigate('/login?error=' + encodeURIComponent(reason || 'callback_failed'), { replace: true });
            }, 1500);
        };

        const run = async () => {
            // 1. Revisar error explícito en query params (?error=...)
            const error = searchParams.get('error');
            const errorDescription = searchParams.get('error_description');
            if (error) {
                onFailure(errorDescription || error);
                return;
            }

            // 2. Suscribirse a onAuthStateChange ANTES de cualquier getSession()
            //    para no perder el evento SIGNED_IN si llega entre llamadas.
            const sub = supabase.auth.onAuthStateChange((event, session) => {
                if (resolved) return;
                if (event === 'SIGNED_IN' && session) {
                    onSuccess(session);
                }
            });
            subscription = sub.data.subscription;

            // 3. Revisar si Supabase ya tiene una sesión persistida (caso de retorno
            //    rápido o de PWA con detectSessionInUrl=true que ya procesó el token).
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    onSuccess(session);
                    return;
                }
            } catch (e) {
                // Ignorar — seguimos esperando el evento
            }

            // 4. Timeout global: si pasados MAX_WAIT_MS no llegó la sesión, fallar.
            timeoutId = setTimeout(() => onFailure('timeout'), MAX_WAIT_MS);
        };

        run();

        return () => {
            resolved = true;
            clearTimeout(timeoutId);
            if (subscription) subscription.unsubscribe();
        };
    }, [navigate, searchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            Completando inicio de sesión...
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Por favor espera un momento
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            ¡Inicio de sesión exitoso!
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Redirigiendo...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            Error de autenticación
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Redirigiendo al login...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
