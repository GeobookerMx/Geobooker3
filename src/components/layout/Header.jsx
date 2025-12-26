import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import { toast } from "react-hot-toast";
import BrandLogo from "../common/BrandLogo.jsx";
import LanguageSelector from "../LanguageSelector.jsx";

export default function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    // Obtener usuario actual
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);

        // Obtener perfil del usuario (maybeSingle evita error 406 si no existe)
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        setUserProfile(profile);
      }
    };

    getUser();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setUserProfile(null);
      setShowUserMenu(false);
      toast.success('Sesión cerrada correctamente');
      navigate('/welcome');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast.error('Error al cerrar sesión');
    }
  };

  const getUserInitials = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <header className="bg-geoYellow shadow-lg sticky top-0 z-50">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center space-x-3">
          <BrandLogo size={48} className="hover:scale-105 transition-transform duration-200" />
        </Link>

        <button
          className="md:hidden flex flex-col items-center justify-center space-y-1"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Abrir menú"
        >
          <span className={`block w-6 h-[3px] bg-geoPurple transition-transform ${isOpen ? "rotate-45 translate-y-2" : ""}`} />
          <span className={`block w-6 h-[3px] bg-geoPurple transition-opacity ${isOpen ? "opacity-0" : "opacity-100"}`} />
          <span className={`block w-6 h-[3px] bg-geoPurple transition-transform ${isOpen ? "-rotate-45 -translate-y-2" : ""}`} />
        </button>

        <nav className="hidden md:flex items-center space-x-6 font-brand">
          <Link to="/" className="text-geoPurple hover:text-geoPink transition-colors">{t('nav.home')}</Link>
          <Link to="/categories" className="text-geoPurple hover:text-geoPink transition-colors">{t('nav.categories')}</Link>
          <Link to="/quienes-somos" className="text-geoPurple hover:text-geoPink transition-colors">Nosotros</Link>
          <Link to="/comunidad" className="text-geoPurple hover:text-geoPink transition-colors">Comunidad</Link>
          <Link to="/advertise" className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-4 py-1.5 rounded-lg font-bold hover:from-red-600 hover:to-orange-600 transition-all flex items-center gap-1 shadow-lg hover:scale-105">
            🚀 ¿Más ventas?
          </Link>
          <Link to="/business/register" className="bg-geoPink text-white px-4 py-2 rounded-full hover:bg-geoPurple transition-colors">+ {t('nav.addBusiness')}</Link>
          <LanguageSelector />

          {/* User Menu */}
          {user ? (
            <div className="relative flex items-center gap-2">
              {/* Dashboard notification bell */}
              <Link
                to="/dashboard"
                className="relative p-2 text-geoPurple hover:text-geoPink transition-colors group"
                title="Conoce tu tablero"
              >
                <span className="text-xl">🔔</span>
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  ✨ Conoce tu tablero
                </span>
              </Link>

              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 bg-geoPurple text-white px-3 py-2 rounded-full hover:bg-geoPink transition-colors"
              >
                <div className="w-8 h-8 bg-white text-geoPurple rounded-full flex items-center justify-center font-bold text-sm">
                  {getUserInitials()}
                </div>
                <span className="hidden lg:block">{userProfile?.full_name || 'Usuario'}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 py-2">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-semibold text-gray-900">{userProfile?.full_name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  </div>
                  <Link
                    to="/dashboard"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    📊 Mi Dashboard
                  </Link>
                  <Link
                    to="/business/register"
                    onClick={() => setShowUserMenu(false)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    🏪 Registrar Negocio
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    🚪 Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-geoPurple text-white px-4 py-2 rounded-full hover:bg-geoPink transition-colors"
            >
              Iniciar Sesión
            </Link>
          )}
        </nav>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-geoYellow shadow-inner border-t border-geoPurple/10 px-4 py-4 space-y-4 font-brand">
          <Link to="/" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">{t('nav.home')}</Link>
          <Link to="/categories" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">{t('nav.categories')}</Link>
          <Link to="/quienes-somos" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">Nosotros</Link>
          <Link to="/comunidad" onClick={() => setIsOpen(false)} className="block text-geoPurple hover:text-geoPink">Comunidad</Link>
          <Link to="/advertise" onClick={() => setIsOpen(false)} className="block text-red-600 font-bold bg-red-50 p-2 rounded">
            🚀 ¿Más ventas?
          </Link>
          <Link to="/business/register" onClick={() => setIsOpen(false)} className="block bg-geoPink text-white px-4 py-2 rounded-full w-max hover:bg-geoPurple transition">+ {t('nav.addBusiness')}</Link>

          {user ? (
            <>
              <div className="border-t border-geoPurple/10 pt-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-10 h-10 bg-geoPurple text-white rounded-full flex items-center justify-center font-bold">
                    {getUserInitials()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-geoPurple">{userProfile?.full_name || 'Usuario'}</p>
                    <p className="text-xs text-gray-600">{user.email}</p>
                  </div>
                </div>
                <Link
                  to="/dashboard"
                  onClick={() => setIsOpen(false)}
                  className="block text-geoPurple hover:text-geoPink mb-2"
                >
                  📊 Mi Dashboard
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="block text-red-600 hover:text-red-700"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setIsOpen(false)}
              className="block bg-geoPurple text-white px-4 py-2 rounded-full w-max hover:bg-geoPink transition"
            >
              Iniciar Sesión
            </Link>
          )}

          <div className="pt-2">
            <LanguageSelector />
          </div>
        </div>
      )}
    </header>
  );
}
