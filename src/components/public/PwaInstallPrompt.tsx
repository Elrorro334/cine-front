'use client';

import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Verificar si ya está instalada en modo standalone
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

  if (isInstalled || !isInstallable || dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Instalar aplicación"
      className="fixed bottom-4 right-4 z-50 bg-[#121212]/95 backdrop-blur-md border border-[#E11D2F] rounded-2xl p-4 shadow-2xl max-w-sm w-full mx-auto text-white no-print"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E11D2F] flex items-center justify-center shrink-0 shadow-md">
          <i className="fa-solid fa-download text-white text-base" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-white">
            Descargar Cine Xilotzin
          </h2>
          <p className="text-[11px] text-[#A0A0A0] mt-0.5 leading-snug font-sans">
            Instala la aplicación en tu computadora para acceso directo a cartelera, boletos y pre-órdenes.
          </p>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              onClick={handleInstallClick}
              className="bg-[#E11D2F] hover:bg-[#c81928] text-white text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition-colors shadow flex items-center gap-1.5 cursor-pointer font-sans"
            >
              <i className="fa-solid fa-desktop text-xs" aria-hidden="true" />
              <span>Instalar App</span>
            </button>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="text-[11px] text-[#A0A0A0] hover:text-white px-2 py-1 transition-colors cursor-pointer font-sans"
            >
              Ahora no
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="text-[#A0A0A0] hover:text-white text-xs p-1 cursor-pointer"
          aria-label="Cerrar aviso de instalación"
        >
          <i className="fa-solid fa-xmark" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
