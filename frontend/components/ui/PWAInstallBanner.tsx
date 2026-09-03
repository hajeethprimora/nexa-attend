'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);

      // Check if user has already dismissed prompt in this session
      const isDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!isDismissed) {
        setShowBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register Service Worker in browser
    if ('serviceWorker' in navigator && typeof window !== 'undefined') {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('[PWA] ServiceWorker registered with scope:', registration.scope);
        },
        (err) => {
          console.warn('[PWA] ServiceWorker registration failed:', err);
        }
      );
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User response to install prompt:', outcome);

    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 animate-in slide-in-from-bottom duration-300">
      <div className="p-4 rounded-3xl bg-gray-900 text-white border border-gray-800 shadow-2xl flex items-center justify-between gap-3 backdrop-blur-xl bg-gray-900/95">
        <div className="flex items-center space-x-3">
          <div className="relative w-11 h-11 rounded-2xl overflow-hidden border border-gray-700 shrink-0 shadow-md">
            <Image
              src="/softnix-logo.jpg"
              alt="Softnix Logo"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h4 className="text-xs font-black tracking-tight text-white flex items-center">
              SOFTNIX Attend
              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-600 text-white uppercase">App</span>
            </h4>
            <p className="text-[11px] text-gray-400">Install to your home screen for 1-tap access</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install</span>
          </button>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            aria-label="Close install prompt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallBanner;
