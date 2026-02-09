// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

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

  useEffect(() => {
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    getSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email, password, fullName = '') => {
    const { data, error } = await supabase.auth.signUp({ email, password });

    // Si el registro fue exitoso, guardar datos de ubicación
    if (data?.user && !error) {
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
    return { data, error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {/* opcional: podríamos mostrar un loader aquí */}
      {!loading && children}
    </AuthContext.Provider>
  );
};
