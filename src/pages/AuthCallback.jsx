// src/pages/AuthCallback.jsx
// Maneja el callback de OAuth (Google, Apple, Facebook) después de autenticación.
//
// AuthProvider owns session restoration and Supabase events on every platform.
// This page must not run a competing timeout that sends an authenticated user
// back to login while the provider is still processing the OAuth callback.
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { trackAuthFunnelEvent, trackUserLogin } from '../services/analyticsService';
import { getOAuthError } from '../utils/oauthErrors';
import { getPlatform } from '../utils/platformDetection';
import { useAuth } from '../contexts/AuthContext';
import { activatePremiumPromotion } from '../services/premiumService';
import { isPremiumPromoActive } from '../config/promotions';
import { clearPremiumIntent, hasPremiumIntent } from '../config/premiumFlow';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');
    const { user, loading, authError, retrySession } = useAuth();
    const callbackError = getOAuthError(searchParams.toString(), window.location.hash);
    const callbackErrorCode = callbackError?.code;

    useEffect(() => {
        if (callbackErrorCode) {
            setStatus('error');
            trackAuthFunnelEvent('oauth_callback_error', {
                funnel: 'login', method: 'oauth', errorCode: callbackErrorCode,
                dedupeKey: `oauth_callback_error:${callbackErrorCode}`
            });
            return;
        }
        if (loading) {
            setStatus('processing');
            return;
        }
        if (authError) {
            setStatus('timeout');
            return;
        }
        if (!user?.id) {
            setStatus('error');
            return;
        }

        setStatus('success');
        const provider = user.app_metadata?.provider || 'oauth';
        try {
            trackAuthFunnelEvent('oauth_callback_success', {
                funnel: 'login', method: provider, userId: user.id
            });
            Promise.resolve(trackUserLogin(user.id, provider)).catch(() => {});
        } catch { /* Analytics cannot prevent navigation after a confirmed login. */ }

        const persistProfile = async () => {
            try {
                const registrationDomain = window.location.hostname;
                const preferredLanguage = registrationDomain.includes('.mx') ? 'es' : 'en';
                await supabase.from('user_profiles').upsert({
                    id: user.id,
                    email: user.email,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
                    preferred_language: preferredLanguage,
                    registration_domain: registrationDomain,
                    last_login_at: new Date().toISOString(),
                    last_login_platform: getPlatform(),
                    last_seen_at: new Date().toISOString(),
                    last_seen_platform: getPlatform(),
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id', ignoreDuplicates: false });
            } catch (e) {
                console.warn('[AuthCallback] No se pudo persistir user_profiles:', e);
            }
        };

        void persistProfile();
        if (isPremiumPromoActive() && hasPremiumIntent()) {
            void supabase.auth.getSession().then(({ data }) => {
                if (data?.session?.user?.id !== user.id) return;
                return activatePremiumPromotion(data.session.access_token).then(() => clearPremiumIntent());
            }).catch(() => console.warn('[AuthCallback] Premium se podrá activar desde el panel'));
        }
        const redirectTimeoutId = setTimeout(() => navigate('/dashboard', { replace: true }), 500);
        return () => clearTimeout(redirectTimeoutId);
    }, [user, loading, authError, navigate, searchParams, callbackErrorCode]);

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
                            {callbackError?.message || 'No se pudo completar el acceso. Puedes volver a intentarlo.'}
                        </p>
                        <button type="button" onClick={() => navigate('/login', { replace: true })} className="mt-5 min-h-[44px] rounded-xl bg-blue-600 px-6 py-3 text-white">Volver al acceso</button>
                    </>
                )}

                {status === 'timeout' && (
                    <>
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                            <span className="text-3xl" aria-hidden="true">⏱️</span>
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            No pudimos comprobar tu sesión
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Revisa tu conexión y vuelve a intentar. Conservaremos la sesión si ya está activa.
                        </p>
                        <button type="button" onClick={retrySession} className="mt-5 min-h-[44px] rounded-xl bg-blue-600 px-6 py-3 text-white">Volver a intentar</button>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
