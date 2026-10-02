import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Download, Share2, X } from 'lucide-react';
import { trackAppDownloadIntent } from '../../services/analyticsService';

const DISMISS_KEY = 'geobooker:pwa-install-dismissed-at';
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function InstallPrompt() {
  const [installEvent, setInstallEvent] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);
  const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);

  useEffect(() => {
    if (Capacitor.isNativePlatform() || isStandalone()) return undefined;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    const mayShow = Date.now() - dismissedAt >= DISMISS_MS;
    if (isIOS && mayShow) setVisible(true);

    const handleInstallAvailable = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      if (mayShow) setVisible(true);
    };
    const handleInstalled = () => {
      setVisible(false);
      setInstallEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleInstallAvailable);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallAvailable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, [isIOS]);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (installEvent) {
      await installEvent.prompt();
      const choice = await installEvent.userChoice;
      if (choice.outcome === 'accepted') {
        await trackAppDownloadIntent({
          target: 'pwa_install',
          platformHint: 'pwa',
          source: 'install_prompt',
          campaign: 'pwa_install'
        });
        setVisible(false);
      }
      setInstallEvent(null);
      return;
    }
    setShowIOSHelp(true);
  };

  if (!visible) return null;

  return (
    <aside
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-md rounded-lg border border-slate-200 bg-white p-3 shadow-xl"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      aria-label="Instalar Geobooker"
    >
      <div className="flex items-start gap-3">
        <img src="/assets/icons/icon-96.png" alt="" className="h-11 w-11 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-slate-900">Descarga la app de Geobooker</p>
          <p className="mt-0.5 text-sm text-slate-600">
            {showIOSHelp ? 'En Safari toca Compartir y luego Agregar a pantalla de inicio.' : 'Instalala en tu dispositivo para abrirla como app.'}
          </p>
          <button
            type="button"
            onClick={install}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            {isIOS && !installEvent ? <Share2 className="h-4 w-4" /> : <Download className="h-4 w-4" />}
            {isIOS && !installEvent ? 'Ver como instalar' : 'Descargar app'}
          </button>
        </div>
        <button type="button" onClick={dismiss} className="rounded-md p-2 text-slate-500 hover:bg-slate-100" aria-label="Cerrar aviso">
          <X className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
