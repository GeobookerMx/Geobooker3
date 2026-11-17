// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { clarityIdentifyUser } from "../services/trackingService";
import { Capacitor } from "@capacitor/core";
import { observeMetaConversions, rememberMetaSignup } from '../services/metaConversions';
import { observeAuthSession } from '../utils/authSessionObserver';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);      // usuario actual
  const [loading, setLoading] = useState(true); // cargando sesión inicial
  const [authError, setAuthError] = useState(null);
  const [sessionCheck, setSessionCheck] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const check = () => {
      if (document.visibilityState === 'hidden') return;
      void observeMetaConversions({ user });
    };
    check();
    window.addEventListener('geobooker:meta-ready', check);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = setInterval(check, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener('geobooker:meta-ready', check);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setAuthError(null);
    return observeAuthSession({
      auth: supabase.auth,
      timeoutMs: Capacitor.isNativePlatform() ? 15000 : 8000,
      onState: (next) => {
        if ('user' in next) setUser(next.user);
        setLoading(next.loading);
        setAuthError(next.authError);
      },
      onError: error => console.warn('[Auth] No se pudo comprobar la sesión:', error?.code || error?.name || 'auth_error'),
      onUser: (sessionUser) => {
        // Optional analytics must not throw inside Supabase's auth callback.
        try {
          const isAdmin = sessionUser.email?.includes('geobookerr@') || sessionUser.email?.includes('ventasgeobooker@');
          Promise.resolve(clarityIdentifyUser(sessionUser.id, sessionUser.email, isAdmin ? 'admin' : 'user')).catch(() => {});
        } catch { /* Authentication does not depend on analytics. */ }
      },
    });
  }, [sessionCheck]);

  const signUp = async (email, password, fullName = '') => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    // Si el registro fue exitoso, guardar datos de ubicación
    if (data?.user && !error) {
      rememberMetaSignup(data);
      try {
        const registrationDomain = window.location.hostname;
        const preferredLanguage = registrationDomain.includes('.mx') ? 'es' : 'en';

        // Actualizar user_profiles con datos de registro
        await supabase.from('user_profiles').upsert({
          id: data.user.id,
          email: email,
          full_name: fullName,
          preferred_language: preferredLanguage,
          registration_domain: registrationDomain,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });
      } catch (profileError) {
        console.error('Error saving profile data:', profileError);
      }
    }

    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error && data?.session?.user) {
      setUser(data.session.user);
      setAuthError(null);
      setLoading(false);
    }
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    loading,
    authError,
    retrySession: () => setSessionCheck(value => value + 1),
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
    logout: signOut, // ✅ alias para compatibilidad con DeleteAccountPage
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
