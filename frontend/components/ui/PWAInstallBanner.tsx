'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'softnix_pwa_dismissed_until';
const DISMISS_DAYS = 14;

const isDismissed = () => {
  try {
    return Number(localStorage.getItem(DISMISS_KEY) || 0) > Date.now();
  } catch {
    return false;
  }
};

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;

const isIosSafari = () => {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return iOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden');

  useEffect(() => {
    // Register the service worker (production only: in dev it would cache hot-reload assets)
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(err => console.warn('[PWA] Service worker registration failed:', err));
    }

    if (isStandalone() || isDismissed()) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode('prompt');
    };
    const onInstalled = () => {
      setMode('hidden');
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);

    // iOS never fires beforeinstallprompt: show manual instructions after a short delay
    let iosTimer: ReturnType<typeof setTimeout> | undefined;
    if (isIosSafari()) iosTimer = setTimeout(() => setMode('ios'), 4000);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      if (iosTimer) clearTimeout(iosTimer);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice.catch(() => undefined);
    setDeferredPrompt(null);
    setMode('hidden');
  };

  const handleDismiss = () => {
    setMode('hidden');
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + DISMISS_DAYS * 86400000));
    } catch {
      /* storage unavailable */
    }
  };

  if (mode === 'hidden') return null;

  return (
    <div
      className="fixed left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-50"
      style={{ bottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      role="dialog"
      aria-label="Install Softnix Attend"
    >
      <div className="p-4 rounded-3xl bg-gray-900/95 text-white border border-gray-800 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden border border-gray-700 shrink-0">
            <Image src="/icons/icon-192.png" alt="" fill sizes="44px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-black tracking-tight text-white">Install Softnix Attend</h4>
            {mode === 'ios' ? (
              <p className="text-[11px] text-gray-300 leading-snug">
                Tap <Share className="inline w-3.5 h-3.5 -mt-0.5" aria-label="Share" /> then <span className="font-semibold">Add to Home Screen</span>
              </p>
            ) : (
              <p className="text-[11px] text-gray-400">One-tap clock in from your home screen</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {mode === 'prompt' && (
            <button
              onClick={handleInstallClick}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all flex items-center space-x-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
