// PWA Installation & Service Worker Manager for Recite Quran (اتلو القران)
(function() {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                       window.navigator.standalone === true ||
                       window.location.search.includes('source=pwa');

  // 1. Clean up legacy / conflicting service workers and register primary sw.js
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const reg of registrations) {
        const script = (reg.active && reg.active.scriptURL) ||
                       (reg.installing && reg.installing.scriptURL) ||
                       (reg.waiting && reg.waiting.scriptURL) || '';
        if (script.includes('flutter_service_worker.js') || script.includes('coi-serviceworker')) {
          reg.unregister().then(() => console.log('[PWA] Cleaned up legacy service worker:', script));
        }
      }
    }).catch(() => {});

    // Register primary sw.js without forced page reloads
    window.registerAppServiceWorker = function() {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
          .then((reg) => { if (navigator.onLine) reg.update().catch(() => {}); })
          .catch((err) => console.warn('[PWA] ServiceWorker error:', err));
      }
    };

    window.registerAppServiceWorker();
  }

  if (isStandalone) return;

  function isDismissed() {
    return sessionStorage.getItem('pwa_banner_dismissed') === 'true';
  }

  function dismissBanner(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
  }

  // 2. Chromium / Android / Desktop Install Prompt
  let deferredPrompt = null;
  function tryShowInstallBanner() {
    if (isDismissed() || !deferredPrompt) return;
    const splash = document.getElementById('splash-overlay');
    if (splash && document.body.contains(splash) && splash.style.display !== 'none' && splash.style.opacity !== '0') {
      setTimeout(tryShowInstallBanner, 2000);
      return;
    }

    const banner = document.getElementById('pwa-install-banner');
    const btn = document.getElementById('pwa-install-btn');
    const close = document.getElementById('pwa-close-btn');

    if (banner && !isDismissed()) {
      banner.style.display = 'block';
      if (btn) {
        btn.onclick = async () => {
          if (deferredPrompt) {
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            banner.style.display = 'none';
          }
        };
      }
      if (close) close.onclick = () => dismissBanner('pwa-install-banner');
    }
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    setTimeout(tryShowInstallBanner, 2500);
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    ['pwa-install-banner', 'pwa-ios-banner'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  });

  // 3. iOS Safari Guided Install Prompt
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /safari/.test(ua) && !/crios|fxios|opios|edgios|chrome/.test(ua);
  const isInApp = /(fban|fbav|instagram|twitter|line|whatsapp|snapchat|telegram)/i.test(ua);

  if (isIos && isSafari && !isInApp && !isDismissed()) {
    setTimeout(() => {
      if (isDismissed()) return;
      const banner = document.getElementById('pwa-ios-banner');
      const close = document.getElementById('pwa-ios-close-btn');
      if (banner) {
        banner.style.display = 'block';
        if (close) close.onclick = () => dismissBanner('pwa-ios-banner');
      }
    }, 2500);
  }
})();
