import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

const getCopy = (isSpanish) => isSpanish ? {
  seoTitle: 'Descargar Geobooker | Android, iPhone y PWA',
  seoDescription: 'Descarga Geobooker para buscar negocios, servicios, productos y espacios comerciales cerca de ti.',
  official: 'Descarga oficial de Geobooker',
  heroTitle: 'Encuentra lo que necesitas cerca de ti',
  heroText: 'Busca negocios, servicios, productos y espacios comerciales desde la app o desde cualquier navegador.',
  storeCta: 'Abrir',
  installWeb: 'Instalar Geobooker',
  qrLabel: 'Escanea para elegir tu descarga',
  qrSubtitle: 'Android, iPhone o acceso web',
  oneAccess: 'Un acceso, tres opciones',
  carry: 'Lleva Geobooker contigo',
  qrText: 'El QR abre esta pagina y te permite elegir la tienda correcta. Cada clic de descarga se registra de forma agregada para mejorar la experiencia, sin afirmar que una instalacion ocurrio hasta que la plataforma la confirme.',
  benefits: ['Busqueda por necesidad', 'Resultados por ubicacion', 'Negocios y espacios'],
  installed: 'Geobooker ya esta instalada en este dispositivo.',
  available: 'Disponible',
  officialLink: 'Enlace oficial',
  webTitle: 'Tambien puedes instalar la version web',
  webText: 'Crea un acceso directo en tu dispositivo sin salir del navegador.',
  webButton: 'Instalar version web',
  back: 'Volver al inicio',
  androidDescription: 'Instala Geobooker desde Google Play y accede rapidamente a la busqueda y al mapa.',
  iosDescription: 'Descarga la app oficial para iPhone y iPad desde App Store.',
} : {
  seoTitle: 'Download Geobooker | Android, iPhone and PWA',
  seoDescription: 'Download Geobooker to find local businesses, services, products and commercial places near you.',
  official: 'Official Geobooker download',
  heroTitle: 'Find what you need near you',
  heroText: 'Search businesses, services, products and commercial places from the app or any browser.',
  storeCta: 'Open',
  installWeb: 'Install Geobooker',
  qrLabel: 'Scan to choose your download',
  qrSubtitle: 'Android, iPhone or web access',
  oneAccess: 'One access, three options',
  carry: 'Take Geobooker with you',
  qrText: 'The QR opens this page and lets you choose the right store. Download clicks are tracked in aggregate to improve the experience, without claiming an install until the platform confirms it.',
  benefits: ['Intent-based search', 'Location-based results', 'Businesses and places'],
  installed: 'Geobooker is already installed on this device.',
  available: 'Available',
  officialLink: 'Official link',
  webTitle: 'You can also install the web version',
  webText: 'Create a shortcut on your device without leaving the browser.',
  webButton: 'Install web version',
  back: 'Back to home',
  androidDescription: 'Install Geobooker from Google Play and quickly access search and the map.',
  iosDescription: 'Download the official iPhone and iPad app from the App Store.',
};

const DownloadPage = () => {
  const { i18n } = useTranslation();
  const [platform, setPlatform] = useState('desktop');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [attribution, setAttribution] = useState(() => getStoredQrAttribution());
  const copy = getCopy(i18n.language?.startsWith('es'));

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
      description: copy.androidDescription,
      className: 'from-emerald-500 to-green-600',
    },
    {
      id: 'ios',
      title: 'iPhone and iPad',
      storeName: 'App Store',
      available: hasIosStoreLink(),
      href: APP_LINKS.iosStoreUrl,
      target: 'ios_store',
      description: copy.iosDescription,
      className: 'from-slate-700 to-slate-950',
    },
  ]), [copy.androidDescription, copy.iosDescription]);

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
    await deferredPrompt.prompt();
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
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  }];

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a,_#0f172a_55%,_#020617)] text-white">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        url={APP_LINKS.downloadHub}
        structuredData={structuredData}
      />

      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <header className="mx-auto max-w-3xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            {copy.official}
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-6xl">{copy.heroTitle}</h1>
          <p className="mt-5 text-lg text-slate-300">{copy.heroText}</p>

          {preferredCard ? (
            <a
              href={preferredCard.href}
              onClick={() => trackStoreClick(preferredCard)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              {copy.storeCta} {preferredCard.storeName}
            </a>
          ) : deferredPrompt && !isInstalled ? (
            <button
              type="button"
              onClick={handlePwaInstall}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-cyan-500 px-6 py-4 font-bold text-slate-950 shadow-lg transition hover:bg-cyan-400"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              {copy.installWeb}
            </button>
          ) : null}
        </header>

        <section className="mt-12 grid gap-8 rounded-[32px] border border-white/10 bg-white/[0.07] p-7 shadow-2xl backdrop-blur-xl lg:grid-cols-[0.8fr_1.2fr] lg:p-10">
          <AppQRCode
            size={220}
            darkMode
            value={universalQrUrl}
            label={copy.qrLabel}
            subtitle={copy.qrSubtitle}
            className="self-center"
          />

          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-300">{copy.oneAccess}</p>
            <h2 className="mt-2 text-3xl font-bold">{copy.carry}</h2>
            <p className="mt-4 text-slate-300">{copy.qrText}</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                [Search, copy.benefits[0]],
                [MapPin, copy.benefits[1]],
                [Store, copy.benefits[2]],
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
                {copy.installed}
              </div>
            ) : null}
          </div>
        </section>

        <section className="mt-8 grid gap-6 md:grid-cols-2" aria-label="Download options">
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
                  {copy.available}
                </div>
                <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row">
                  <AppQRCode
                    size={136}
                    value={qrValue}
                    label={`${copy.storeCta} ${card.storeName}`}
                    subtitle={copy.officialLink}
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
                      {copy.storeCta} {card.storeName}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        {deferredPrompt && !isInstalled ? (
          <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-6 text-center">
            <h2 className="text-xl font-bold">{copy.webTitle}</h2>
            <p className="mt-2 text-sm text-slate-300">{copy.webText}</p>
            <button
              type="button"
              onClick={handlePwaInstall}
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-cyan-300/40 px-5 py-3 font-semibold text-cyan-200 transition hover:bg-cyan-400/10"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {copy.webButton}
            </button>
          </section>
        ) : null}

        <div className="mt-10 text-center">
          <Link to="/" className="inline-flex items-center gap-2 font-medium text-cyan-300 hover:text-cyan-200">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {copy.back}
          </Link>
        </div>
      </div>
    </main>
  );
};

export default DownloadPage;
