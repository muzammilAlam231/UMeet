'use client';

import { useEffect } from 'react';

/** Registers the PWA service worker in production only. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== 'production' ||
      typeof navigator === 'undefined' ||
      !('serviceWorker' in navigator)
    ) {
      return;
    }
    const register = () => {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    };
    window.addEventListener('load', register);
    return () => window.removeEventListener('load', register);
  }, []);

  return null;
}
