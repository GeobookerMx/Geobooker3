import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gift, CheckCircle, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { trackUserSignup } from '../services/analyticsService';
import { getPremiumPromoDeadlineLabel, isPremiumPromoActive } from '../config/promotions';
import { activatePremiumPromotion } from '../services/premiumService';

const PREMIUM_AFTER_LOGIN_KEY = 'geobooker_activate_premium_after_login';

const RegisterPage = () => {
  const navigate = useNavigate();
  const premiumPromoActive = isPremiumPromoActive();
  const [loading, setLoading] = useState(false);
  const [showPremiumIntro, setShowPremiumIntro] = useState(premiumPromoActive);
  const [acceptFreePremium, setAcceptFreePremium] = useState(premiumPromoActive);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.fullName.trim()) {
      toast.error('Ingresa tu nombre');
      return;
    }

    if (!formData.email.trim()) {
      toast.error('Ingresa tu correo');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName.trim(),
            accepted_free_premium_launch: premiumPromoActive && acceptFreePremium,
          },
        },
      });

      if (error) throw error;

      if (data.user?.id) {
        trackUserSignup(data.user.id, 'email');
        try {
          await supabase.from('user_profiles').upsert(
            {
              id: data.user.id,
              email: data.user.email,
              full_name: formData.fullName.trim(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'id', ignoreDuplicates: false }
          );
        } catch (profileErr) {
          console.warn('No se pudo guardar el perfil inicial:', profileErr);
        }
      }

      if (premiumPromoActive && acceptFreePremium) {
        if (data.session?.access_token) {
          try {
            await activatePremiumPromotion(data.session.access_token);
            toast.success('Cuenta creada y Premium gratis activado.');
            navigate('/dashboard');
            return;
          } catch (premiumError) {
            console.warn('No se pudo activar Premium al registrar:', premiumError);
            localStorage.setItem(PREMIUM_AFTER_LOGIN_KEY, 'true');
          }
        } else {
          localStorage.setItem(PREMIUM_AFTER_LOGIN_KEY, 'true');
        }
      }

      toast.success('Cuenta creada correctamente. Revisa tu correo si se requiere confirmación.');
      navigate('/login');
    } catch (error) {
      console.error('Error al registrarse:', error);
      toast.error(error.message || 'No se pudo crear la cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center px-4 py-12">
      {showPremiumIntro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl">
            <button
              type="button"
              onClick={() => setShowPremiumIntro(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-4 inline-flex rounded-2xl bg-emerald-100 p-3 text-emerald-700">
              <Gift className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-950">Activa Premium GRATIS por lanzamiento</h2>
            <p className="mt-3 text-gray-600">
              Al aceptarlo, tu cuenta podrá usar herramientas completas al iniciar sesión:
              más fotos, perfil más fuerte, redes sociales, métricas y mayor visibilidad.
            </p>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Disponible sin costo hasta el <strong>{getPremiumPromoDeadlineLabel('es-MX')}</strong>.
              No necesitas tarjeta para activarlo durante esta etapa.
            </div>
            <button
              type="button"
              onClick={() => {
                setAcceptFreePremium(true);
                setShowPremiumIntro(false);
              }}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-3 font-bold text-white shadow-lg hover:from-emerald-600 hover:to-green-700"
            >
              <CheckCircle className="h-5 w-5" />
              Aceptar Premium GRATIS
            </button>
            <button
              type="button"
              onClick={() => {
                setAcceptFreePremium(false);
                setShowPremiumIntro(false);
              }}
              className="mt-3 w-full rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50"
            >
              Continuar sin activarlo por ahora
            </button>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/welcome" className="inline-block mb-4">
            <img
              src="/images/geobooker-logo.png"
              alt="Geobooker"
              className="h-16 w-auto mx-auto"
            />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crear cuenta</h1>
          <p className="text-gray-600">Regístrate dentro de la app para usar Geobooker</p>
        </div>

        {premiumPromoActive && (
          <div className="mb-5 rounded-2xl border-2 border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50 p-4 shadow-sm">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptFreePremium}
                onChange={(event) => setAcceptFreePremium(event.target.checked)}
                className="mt-1 h-5 w-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>
                <span className="block font-bold text-emerald-950">Sí, quiero Premium GRATIS al iniciar sesión</span>
                <span className="mt-1 block text-sm text-emerald-800">
                  Desbloquea herramientas completas: hasta 10 fotos por negocio, redes sociales,
                  métricas, perfil destacado y más visibilidad.
                </span>
              </span>
            </label>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Nombre completo</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Correo electrónico</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="tu@correo.com"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Contraseña</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">Confirmar contraseña</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                placeholder="Repite tu contraseña"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando cuenta...' : acceptFreePremium ? 'Crear cuenta + activar Premium gratis' : 'Crear cuenta'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/welcome" className="text-blue-600 hover:underline text-sm">
            ← Volver
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
