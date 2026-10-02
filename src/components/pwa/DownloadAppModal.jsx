// src/components/pwa/DownloadAppModal.jsx
import React, { useEffect, useState } from 'react';
import { Check, Download, MapPin, Share2, Smartphone, X, Zap } from 'lucide-react';
import { trackAppDownloadIntent } from '../../services/analyticsService';

const DISMISS_KEY = 'app_modal_dismissed';
const DISMISS_DAYS = 7;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function DownloadAppModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setIsInstalled(true);
      return undefined;
    }

    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    const lastDismissed = localStorage.getItem(DISMISS_KEY);
    if (lastDismissed) {
      const dismissedDate = new Date(lastDismissed);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < DISMISS_DAYS) return undefined;
    }

    const handleBeforeInstall = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const timer = window.setTimeout(() => {
      setIsVisible(true);
    }, 30000);

    const pageViews = Number.parseInt(sessionStorage.getItem('page_views') || '0', 10) + 1;
    sessionStorage.setItem('page_views', pageViews.toString());

    let pageViewTimer = null;
    if (pageViews >= 3) {
      pageViewTimer = window.setTimeout(() => setIsVisible(true), 5000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.clearTimeout(timer);
      if (pageViewTimer) window.clearTimeout(pageViewTimer);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        await trackAppDownloadIntent({
          target: 'pwa_install',
          platformHint: 'pwa',
          source: 'download_app_modal',
          campaign: 'pwa_install'
        });
        setIsVisible(false);
        localStorage.setItem('app_installed', 'true');
      }
      setDeferredPrompt(null);
      return;
    }

    if (isIOS) {
      await trackAppDownloadIntent({
        target: 'pwa_install_help',
        platformHint: 'ios',
        source: 'download_app_modal',
        campaign: 'pwa_install'
      });
      alert('Para instalar:\n\n1. Toca el boton Compartir\n2. Selecciona Agregar a pantalla de inicio\n3. Toca Agregar');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(DISMISS_KEY, new Date().toISOString());
  };

  if (isInstalled || !isVisible) return null;

  const benefits = [
    { icon: Zap, text: 'Acceso rapido desde tu pantalla de inicio' },
    { icon: MapPin, text: 'Busqueda local, mapa y fichas a la mano' },
    { icon: Smartphone, text: 'Experiencia optimizada para telefono' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-blue-700 via-indigo-700 to-slate-950 p-6 text-white">
          <button
            type="button"
            onClick={handleDismiss}
            className="absolute right-4 top-4 rounded-full bg-white/15 p-2 transition hover:bg-white/25"
            aria-label="Cerrar aviso"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg">
            <img
              src="/images/geobooker-app-icon-original.jpg"
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="text-center text-2xl font-bold">Lleva Geobooker contigo</h2>
          <p className="mt-2 text-center text-sm text-blue-100">
            Instala la app para abrir busqueda local, mapa y fichas mas rapido.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-6 space-y-4">
            {benefits.map((benefit) => {
              const Icon = benefit.icon;
              return (
                <div key={benefit.text} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                    <Icon className="h-5 w-5 text-blue-700" />
                  </div>
                  <span className="text-gray-700">{benefit.text}</span>
                  <Check className="ml-auto h-5 w-5 text-green-500" />
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleInstall}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-blue-700 px-6 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-800"
          >
            {isIOS && !deferredPrompt ? <Share2 className="h-6 w-6" /> : <Download className="h-6 w-6" />}
            Descargar app gratis
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="mt-3 w-full py-2 text-sm text-gray-500 transition hover:text-gray-700"
          >
            Quizas mas tarde
          </button>
        </div>
      </div>
    </div>
  );
}
