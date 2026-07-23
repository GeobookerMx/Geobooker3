// src/pages/DownloadPage.jsx
// Landing de descarga para QR general, Android, iPhone y PWA

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const DownloadPage = () => {
  const [platform, setPlatform] = useState('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [attribution, setAttribution] = useState(() => getStoredQrAttribution());

  useEffect(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(userAgent)) setPlatform('ios');
    else if (/android/.test(userAgent)) setPlatform('android');
    else if (/windows/.test(userAgent)) setPlatform('windows');
    else if (/macintosh|mac os x/.test(userAgent)) setPlatform('mac');

    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  useEffect(() => {
    const captured = captureQrAttribution(window.location.href);
    if (captured) {
      setAttribution(captured);
    }
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstalled(true);
    setDeferredPrompt(null);
  };

  const appSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'MobileApplication',
      name: 'Geobooker',
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Android, iOS, Web',
      url: APP_LINKS.downloadHub,
      downloadUrl: APP_LINKS.downloadHub,
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'MXN',
      },
    },
  ];

  const universalQrUrl = buildTrackedDownloadUrl({
    platform: 'generic',
    source: 'qr',
    medium: 'scan',
    campaign: 'download_hub',
    target: 'hub',
  });

  const handleDownloadClick = async (card) => {
    await trackAppDownloadIntent({
      target: card.id === 'android' ? 'android_store' : card.id === 'ios' ? 'ios_store' : 'hub',
      platformHint: card.id,
      source: attribution?.utm_source || 'download_page',
      campaign: attribution?.utm_campaign || `${card.id}_store`,
    });
  };

  const platformCards = [
    {
      id: 'android',
      title: 'Android',
      badge: hasAndroidStoreLink() ? 'Google Play listo' : 'PWA disponible hoy',
      description: hasAndroidStoreLink()
        ? 'Escanea para abrir Google Play o descargar directamente la app de Geobooker.'
        : 'Mientras conectamos Google Play, este QR lleva a la instalación web optimizada para Android.',
      qrValue: buildTrackedDownloadUrl({
        platform: 'android',
        source: 'qr',
        medium: 'scan',
        campaign: 'android_store',
        target: hasAndroidStoreLink() ? 'android_store' : 'hub',
      }),
      actionHref: hasAndroidStoreLink() ? APP_LINKS.androidStoreUrl : APP_LINKS.downloadHub,
      actionLabel: hasAndroidStoreLink() ? 'Abrir en Google Play' : 'Instalar versión web',
      gradient: 'from-green-500 to-emerald-600',
    },
    {
      id: 'ios',
      title: 'iPhone / iPad',
      badge: hasIosStoreLink() ? 'App Store listo' : 'PWA disponible hoy',
      description: hasIosStoreLink()
        ? 'Escanea para abrir App Store o descargar la app de Geobooker en iPhone y iPad.'
        : 'Mientras conectamos App Store, este QR lleva a la guía de instalación desde Safari.',
      qrValue: buildTrackedDownloadUrl({
        platform: 'ios',
        source: 'qr',
        medium: 'scan',
        campaign: 'ios_store',
        target: hasIosStoreLink() ? 'ios_store' : 'hub',
      }),
      actionHref: hasIosStoreLink() ? APP_LINKS.iosStoreUrl : APP_LINKS.downloadHub,
      actionLabel: hasIosStoreLink() ? 'Abrir en App Store' : 'Ver guía para iPhone',
      gradient: 'from-slate-700 to-slate-900',
    },
  ];

  const renderIOSInstructions = () => (
    <div className="bg-slate-900/80 rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white mb-4">Instalar en iPhone o iPad</h3>
      <ol className="space-y-3 text-slate-300 text-sm">
        <li>1. Abre Geobooker en Safari.</li>
        <li>2. Toca el botón Compartir.</li>
        <li>3. Elige "Añadir a pantalla de inicio".</li>
        <li>4. Confirma con "Añadir".</li>
      </ol>
    </div>
  );

  const renderAndroidInstructions = () => (
    <div className="bg-slate-900/80 rounded-2xl p-6 border border-white/10">
      <h3 className="text-lg font-bold text-white mb-4">Instalar en Android</h3>
      {deferredPrompt ? (
        <button
          onClick={handleInstall}
          className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition"
        >
          Instalar app ahora
        </button>
      ) : (
        <ol className="space-y-3 text-slate-300 text-sm">
          <li>1. Abre Geobooker en Chrome.</li>
          <li>2. Toca el menú del navegador.</li>
          <li>3. Elige "Instalar app" o "Añadir a inicio".</li>
        </ol>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e3a8a,_#0f172a_55%,_#020617)]">
      <SEO
        title="Descargar Geobooker App | Android, iPhone y PWA"
        description="Descarga Geobooker en Android, iPhone o instala la PWA. Escanea el QR y encuentra negocios cerca de ti."
        url={APP_LINKS.downloadHub}
        structuredData={appSchema}
      />

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 px-4 py-2 rounded-full text-sm font-semibold mb-6">
            QR oficial de descarga Geobooker
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
            Descarga Geobooker en Android, iPhone o como PWA
          </h1>
          <p className="text-slate-300 text-lg mt-5">
            Usa el QR general como punto principal de descarga. Los links quedan como respaldo, pero el flujo ideal será escanear y medir.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-8 mt-12">
          <section className="bg-white/8 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <AppQRCode
                size={220}
                darkMode={true}
                value={universalQrUrl}
                label="Escanea para descargar"
                subtitle="QR principal listo para campañas, volanteo y CRM"
                className="shrink-0"
              />

              <div className="text-center md:text-left">
                <div className="inline-flex items-center rounded-full bg-emerald-500/15 text-emerald-300 px-3 py-1 text-xs font-bold uppercase tracking-wide mb-4">
                  Descarga universal
                </div>
                <h2 className="text-2xl font-bold text-white mb-3">
                  Un solo QR maestro para campañas, flyers, sucursales, promotores y CRM
                </h2>
                <p className="text-slate-300 mb-5">
                  Este QR ya queda preparado con parámetros de rastreo para que después podamos generar variantes profesionales por canal, ciudad, promotor o campaña.
                </p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10">
                    <div className="text-2xl mb-2">📲</div>
                    <p className="text-white font-semibold text-sm">Instalación móvil</p>
                  </div>
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10">
                    <div className="text-2xl mb-2">🗺️</div>
                    <p className="text-white font-semibold text-sm">Mapa listo al abrir</p>
                  </div>
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/10">
                    <div className="text-2xl mb-2">🎯</div>
                    <p className="text-white font-semibold text-sm">Listo para CRM futuro</p>
                  </div>
                </div>
                <p className="text-slate-400 text-xs mt-5">
                  Respaldo por link: <span className="text-cyan-300">geobooker.com.mx/download</span>
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            {platform === 'android' && !isInstalled ? renderAndroidInstructions() : null}
            {platform === 'ios' && !isInstalled ? renderIOSInstructions() : null}

            {isInstalled ? (
              <div className="bg-emerald-500/15 border border-emerald-400/30 rounded-2xl p-6">
                <h3 className="text-white font-bold text-xl">App instalada</h3>
                <p className="text-emerald-100 mt-2">Geobooker ya está lista en tu pantalla de inicio.</p>
                <Link
                  to="/"
                  className="inline-flex mt-4 bg-white text-emerald-700 px-5 py-3 rounded-xl font-bold"
                >
                  Abrir Geobooker
                </Link>
              </div>
            ) : null}

            <div className="bg-slate-900/80 rounded-2xl p-6 border border-white/10">
              <h3 className="text-white font-bold text-xl mb-3">Estado actual para Fase 2</h3>
              <ul className="space-y-2 text-sm text-slate-300">
                <li>QR general ya es el activo principal de descarga.</li>
                <li>QRs por plataforma ya apuntan a tiendas reales.</li>
                <li>La base de tracking queda lista para CRM y campañas físicas.</li>
              </ul>
              {attribution ? (
                <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-4 text-xs text-slate-300">
                  <p className="font-semibold text-white mb-2">Atribución detectada</p>
                  <p>source: {attribution.utm_source || 'N/D'}</p>
                  <p>medium: {attribution.utm_medium || 'N/D'}</p>
                  <p>campaign: {attribution.utm_campaign || 'N/D'}</p>
                  <p>platform: {attribution.platform_hint || 'N/D'}</p>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        <section className="grid md:grid-cols-2 gap-6 mt-10">
          {platformCards.map((card) => (
            <div key={card.id} className="bg-white rounded-[28px] p-6 shadow-xl">
              <div className={`inline-flex bg-gradient-to-r ${card.gradient} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mb-4`}>
                {card.badge}
              </div>
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <AppQRCode
                  size={148}
                  value={card.qrValue}
                  label={`QR ${card.title}`}
                  subtitle={hasAndroidStoreLink() || hasIosStoreLink() ? 'Abre la mejor ruta disponible' : 'Usa la landing de descarga'}
                />
                <div className="text-center lg:text-left">
                  <h3 className="text-2xl font-bold text-slate-900">{card.title}</h3>
                  <p className="text-slate-600 mt-3">{card.description}</p>
                  <a
                    href={card.actionHref}
                    onClick={() => handleDownloadClick(card)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex mt-5 text-sm text-slate-700 underline underline-offset-4 hover:text-slate-900 transition"
                  >
                    Link de respaldo: {card.actionLabel}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-10 bg-white/8 backdrop-blur-xl border border-white/10 rounded-[32px] p-8">
          <h2 className="text-2xl font-bold text-white mb-4">Base profesional para QR y CRM</h2>
          <div className="grid md:grid-cols-2 gap-6 text-slate-300 text-sm">
            <div className="bg-slate-900/60 rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-semibold mb-3">Ya resuelto</h3>
              <ul className="space-y-2">
                <li>URLs oficiales de Google Play y App Store conectadas.</li>
                <li>QR general de descarga priorizado sobre links.</li>
                <li>UTMs y parámetros base listos para campañas futuras.</li>
              </ul>
            </div>
            <div className="bg-slate-900/60 rounded-2xl p-5 border border-white/10">
              <h3 className="text-white font-semibold mb-3">Siguiente nivel CRM</h3>
              <ul className="space-y-2">
                <li>Generar QR por sucursal, promotor, feria, volante o campaña.</li>
                <li>Guardar escaneos en una tabla de leads/attribution.</li>
                <li>Conectar esos QR a WhatsApp, email o journeys comerciales.</li>
              </ul>
            </div>
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link to="/" className="text-cyan-300 hover:text-cyan-200 font-medium">
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DownloadPage;
