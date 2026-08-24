import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  MapPin,
  Search,
  ShieldCheck,
  Smartphone,
  Store,
} from 'lucide-react';
import SEO from '../components/SEO';
import AppQRCode from '../components/common/AppQRCode';
import {
  APP_LINKS,
  buildTrackedDownloadUrl,
  hasAndroidStoreLink,
  hasIosStoreLink,
} from '../config/appLinks';
import { captureQrAttribution, getStoredQrAttribution } from '../services/qrAttributionService';
import { trackAppDownloadIntent } from '../services/analyticsService';

const detectPlatform = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  return 'desktop';
};

const DownloadPage = () => {
  const [platform, setPlatform] = useState('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [attribution, setAttribution] = useState(() => getStoredQrAttribution());

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  useEffect(() => {
    const captured = captureQrAttribution(window.location.href);
    if (captured) setAttribution(captured);
  }, []);

  const trackingSource = attribution?.utm_source || 'download_page';

  const platformCards = useMemo(() => ([
    {
      id: 'android',
      title: 'Android',
      storeName: 'Google Play',
      available: hasAndroidStoreLink(),
      href: APP_LINKS.androidStoreUrl,
      target: 'android_store',
      description: 'Instala Geobooker desde Google Play y accede rápidamente a la búsqueda y al mapa.',
      className: 'from-emerald-500 to-green-600',
    },
    {
      id: 'ios',
      title: 'iPhone y iPad',
      storeName: 'App Store',
      available: hasIosStoreLink(),
      href: APP_LINKS.iosStoreUrl,
      target: 'ios_store',
      description: 'Descarga la app oficial para iPhone y iPad desde App Store.',
      className: 'from-slate-700 to-slate-950',
    },
  ]), []);

  const preferredCard = platformCards.find((card) => card.id === platform && card.available);
  const universalQrUrl = buildTrackedDownloadUrl({
    platform: 'generic',
    source: 'qr',
    medium: 'scan',
    campaign: 'download_hub',
    target: 'hub',
  });

  const trackStoreClick = (card) => {
    trackAppDownloadIntent({
      target: card.target,
      platformHint: card.id,
      source: trackingSource,
      campaign: attribution?.utm_campaign || `${card.id}_store`,
    });
  };

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      await trackAppDownloadIntent({
        target: 'pwa_install',
        platformHint: platform,
        source: trackingSource,
        campaign: attribution?.utm_campaign || 'pwa_install',
      });
    }
    setDeferredPrompt(null);
  };

  const structuredData = [{
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Geobooker',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Android, iOS, Web',
    url: APP_LINKS.downloadHub,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'MXN' },
  }];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a,_#0f172a_55%,_#020617)] text-white">
      <SEO
        title="Descargar Geobooker | Android, iPhone y PWA"
        description="Descarga Geobooker para buscar negocios, servicios, productos y espacios comerciales cerca de ti."
        url={APP_LINKS.downloadHub}
        structuredData={structuredData}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Descarga oficial de Geobooker
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">
            Encuentra lo que necesitas cerca de ti
          </h1>
          <p className="mt-5 text-lg text-slate-300">
            Busca negocios, servicios, productos y espacios comerciales desde la app o desde cualquier navegador.
          </p>

          {preferredCard ? (
            <a
              href={preferredCard.href}
              onClick={() => trackStoreClick(preferredCard)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              Descargar en {preferredCard.storeName}
            </a>
          ) : deferredPrompt && !isInstalled ? (
            <button
              type="button"
              onClick={handlePwaInstall}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              Instalar Geobooker
            </button>
          ) : null}
        </header>

        <section className="mt-12 grid gap-8 rounded-[32px] border border-white/10 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <AppQRCode
            size={220}
            darkMode
            value={universalQrUrl}
            label="Escanea para elegir tu descarga"
            subtitle="Android, iPhone o acceso web"
            className="self-center"
          />

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">Un acceso, tres opciones</p>
            <h2 className="mt-2 text-3xl font-bold">Lleva Geobooker contigo</h2>
            <p className="mt-4 text-slate-300">
              El QR abre esta página y te permite elegir la tienda correcta. Cada clic de descarga se registra de forma agregada para mejorar la experiencia, sin afirmar que una instalación ocurrió hasta que la plataforma la confirme.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [Search, 'Búsqueda por necesidad'],
                [MapPin, 'Resultados por ubicación'],
                [Store, 'Negocios y espacios'],
              ].map(([Icon, label]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-slate-950/45 p-4">
                  {React.createElement(Icon, { className: 'mb-3 h-6 w-6 text-cyan-300', 'aria-hidden': true })}
                  <p className="text-sm font-semibold">{label}</p>
                </div>
              ))}
            </div>

            {isInstalled ? (
              <div className="mt-6 flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 p-4 text-emerald-100">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
                Geobooker ya está instalada en este dispositivo.
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2" aria-label="Opciones de descarga">
          {platformCards.map((card) => {
            const qrValue = buildTrackedDownloadUrl({
              platform: card.id,
              source: 'qr',
              medium: 'scan',
              campaign: `${card.id}_store`,
              target: card.target,
            });

            return (
              <article key={card.id} className="rounded-[28px] bg-white p-6 text-slate-900 shadow-xl">
                <div className={`inline-flex rounded-full bg-gradient-to-r ${card.className} px-3 py-1 text-xs font-bold uppercase tracking-wide text-white`}>
                  Disponible
                </div>
                <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
                  <AppQRCode
                    size={136}
                    value={qrValue}
                    label={`Abrir ${card.storeName}`}
                    subtitle="Enlace oficial"
                  />
                  <div className="text-center sm:text-left">
                    <h2 className="text-2xl font-bold">{card.title}</h2>
                    <p className="mt-3 text-sm text-slate-600">{card.description}</p>
                    <a
                      href={card.href}
                      onClick={() => trackStoreClick(card)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                    >
                      <Smartphone className="h-4 w-4" aria-hidden="true" />
                      Abrir {card.storeName}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {deferredPrompt && !isInstalled ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
            <h2 className="text-xl font-bold">También puedes instalar la versión web</h2>
            <p className="mt-2 text-sm text-slate-300">Crea un acceso directo en tu dispositivo sin salir del navegador.</p>
            <button
              type="button"
              onClick={handlePwaInstall}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-5 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Instalar versión web
            </button>
          </section>
        ) : null}

        <div className="mt-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-medium text-cyan-300 hover:text-cyan-200">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Volver al inicio
          </Link>
        </div>
      </div>
    </main>
  );
};

export default DownloadPage;
