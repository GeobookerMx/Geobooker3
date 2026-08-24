import React from 'react';
import { Check, Crown, Gift, LogIn, Store } from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getPremiumPromoDeadlineLabel, isPremiumPromoActive } from '../config/promotions';
import { rememberPremiumIntent } from '../config/premiumFlow';
import { IS_IOS_NATIVE } from '../utils/iosStore';
import SEO from '../components/SEO';

const PremiumEntryPage = () => {
  const { user, loading } = useAuth();
  const promoActive = isPremiumPromoActive();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-emerald-200 border-t-emerald-600" />
      </div>
    );
  }

  // El flujo de adquisición se mantiene fuera de la app nativa de iOS.
  if (IS_IOS_NATIVE) return <Navigate to={user ? '/dashboard' : '/'} replace />;
  if (user) return <Navigate to="/dashboard/upgrade" replace />;

  const benefits = [
    'Hasta 10 fotos por negocio',
    'Redes sociales y datos de contacto completos',
    'Métricas y mejor presentación del perfil',
    'Mayor visibilidad para atraer clientes'
  ];

  const rememberIntent = () => rememberPremiumIntent(true);

  return (
    <>
      <SEO
        title="Premium para negocios | Geobooker"
        description="Activa las herramientas Premium de Geobooker para publicar fotos, redes sociales, métricas y una ficha profesional para tu negocio."
        url="/premium"
        keywords="Geobooker Premium, registrar negocio gratis, promocionar negocio local, perfil de negocio"
      />
      <main className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-slate-50 px-4 py-12">
      <section className="mx-auto max-w-4xl overflow-hidden rounded-3xl border border-emerald-100 bg-white shadow-xl">
        <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-lime-500 px-6 py-10 text-center text-white md:px-12">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
            <Crown className="h-9 w-9" aria-hidden="true" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.2em]">Herramientas completas para tu negocio</p>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            {promoActive ? 'Activa Premium GRATIS' : 'Haz crecer tu negocio con Premium'}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-emerald-50 md:text-lg">
            Crea tu cuenta o inicia sesión para administrar una ficha más completa, profesional y preparada para recibir clientes.
          </p>
        </div>

        <div className="grid gap-8 p-6 md:grid-cols-2 md:p-10">
          <div>
            <div className="mb-5 flex items-center gap-3">
              <Gift className="h-6 w-6 text-emerald-700" aria-hidden="true" />
              <h2 className="text-xl font-bold text-slate-900">
                {promoActive
                  ? `Promoción disponible hasta el ${getPremiumPromoDeadlineLabel('es-MX')}`
                  : 'Funciones Premium para una presencia más sólida'}
              </h2>
            </div>
            <ul className="space-y-3">
              {benefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Check className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col justify-center rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <Link
              to="/signup?premium=1"
              onClick={rememberIntent}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3.5 font-bold text-white transition hover:bg-emerald-700"
            >
              <Store className="h-5 w-5" aria-hidden="true" />
              Crear cuenta y activar Premium
            </Link>
            <Link
              to="/login?premium=1"
              onClick={rememberIntent}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-5 py-3 font-bold text-emerald-700 transition hover:bg-emerald-50"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Ya tengo una cuenta
            </Link>
            <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
              {promoActive
                ? 'La activación promocional no solicita tarjeta.'
                : 'Podrás revisar las condiciones vigentes antes de confirmar.'}
            </p>
          </div>
        </div>
      </section>
      </main>
    </>
  );
};

export default PremiumEntryPage;
