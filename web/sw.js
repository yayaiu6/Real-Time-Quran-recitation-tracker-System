// Service Worker for Recite Quran (اتلو القران)
// Provides complete offline caching, dynamic caching, and Cross-Origin Isolation (COOP/COEP) for WebAssembly.

const CACHE_NAME = 'recite-quran-pwa-v22-1793586920';
const PERMANENT_CACHE_NAME = 'recite-quran-permanent-assets';

const STATIC_PRECACHE = [
  './',
  'index.html',
  'manifest.json',
  'icons/favicon.png',
  'icons/apple-touch-icon.png',
  'icons/Icon-192.png',
  'icons/Icon-512.png',
  'icons/Icon-maskable-192.png',
  'icons/Icon-maskable-512.png',
  'js/pwa_install.js',
  'js/qvp.js',
  'js/sherpa-onnx-asr.js',
  'js/sherpa_official_app.js',
  'js/sherpa-onnx-wasm-main-asr.js',
  'flutter_bootstrap.js',
  'flutter.js',
  'main.dart.js',
  'version.json',
  'canvaskit/canvaskit.js',
  'canvaskit/canvaskit.wasm',
  'canvaskit/chromium/canvaskit.wasm',
  'assets/AssetManifest.bin',
  'assets/AssetManifest.bin.json',
  'assets/FontManifest.json',
  'assets/NOTICES',
  'assets/assets/fonts/Cairo-Regular.ttf',
  'assets/assets/fonts/Cairo-Medium.ttf',
  'assets/assets/fonts/Cairo-SemiBold.ttf',
  'assets/assets/fonts/Cairo-Bold.ttf',
  'assets/assets/fonts/HafsSmart_08.ttf',
  'assets/fonts/HafsSmart_08.ttf',
  'assets/fonts/MaterialIcons-Regular.otf',
  'assets/assets/icon/app_icon.png',
  'assets/packages/quran_tajweedformer/assets/model/tokens.txt',
  'assets/packages/quran_tajweedformer/assets/json/riwayat.json',
  'assets/packages/qvp_flutter/assets/wasm/qvp_ffi.wasm',
  'assets/packages/record_web/assets/js/record.worklet.js',
  'assets/packages/wakelock_plus/assets/no_sleep.js',
  'assets/shaders/ink_sparkle.frag',
  'assets/shaders/stretch_effect.frag'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Precache in batches of 4 to prevent QUIC stream congestion
      const batchSize = 4;
      for (let i = 0; i < STATIC_PRECACHE.length; i += batchSize) {
        const batch = STATIC_PRECACHE.slice(i, i + batchSize);
        await Promise.allSettled(
          batch.map((url) =>
            cache.add(url).catch((err) =>
              console.warn('[SW] Precache skipped:', url, err)
            )
          )
        );
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && !k.includes('permanent'))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

function addCoopCoepHeaders(response) {
  if (!response || response.status !== 200 || response.type === 'opaque' || response.bodyUsed) {
    return response;
  }
  if (response.headers.get('Cross-Origin-Opener-Policy') === 'same-origin') {
    return response;
  }
  try {
    const headers = new Headers(response.headers);
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
    headers.set('Cross-Origin-Resource-Policy', 'cross-origin');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (_) {
    return response;
  }
}

function ensureWasmMime(response, url) {
  if (!response || response.type === 'opaque' || response.bodyUsed) return response;
  if (url.pathname.endsWith('.wasm')) {
    if (response.headers.get('Content-Type') !== 'application/wasm') {
      try {
        const headers = new Headers(response.headers);
        headers.set('Content-Type', 'application/wasm');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (_) {
        return response;
      }
    }
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Model download endpoint is saved directly to IndexedDB
  if (url.pathname.includes('/download-model')) return;

  // On-demand Mushaf QVP pages from same-origin proxy or CDN are cached directly in IndexedDB
  if (url.pathname.startsWith('/api/qvp') || url.hostname.includes('cdn.quran.ws')) return;

  // Stream Quran audio directly through browser native HTTP range request pipeline
  if (url.hostname.includes('everyayah.com') ||
    url.hostname.includes('mp3quran.net') ||
    url.pathname.endsWith('.mp3')) return;

  // Hard reload (Ctrl+F5 / Cmd+Shift+R): bypass cache, fetch latest from network, and update cache
  if (event.request.cache === 'reload' || event.request.headers.get('cache-control')?.includes('no-cache')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return ensureWasmMime(addCoopCoepHeaders(res), url);
        })
        .catch(async () => {
          const cached = await caches.match(event.request, { ignoreSearch: true });
          return cached ? ensureWasmMime(addCoopCoepHeaders(cached), url) : Response.error();
        })
    );
    return;
  }

  // 1. Navigation requests & entry bootstrap scripts: Network First, fallback to cached
  const isBootstrapOrVersion = url.pathname.endsWith('/flutter_bootstrap.js') ||
    url.pathname.endsWith('/version.json') ||
    url.pathname.endsWith('/manifest.json') ||
    url.pathname.endsWith('/pwa_install.js');

  if (event.request.mode === 'navigate' || isBootstrapOrVersion) {
    event.respondWith(
      fetch(event.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return addCoopCoepHeaders(res);
        })
        .catch(async () => {
          const cleanPath = url.pathname.replace(/^\//, '');
          const cached = (await caches.match(event.request, { ignoreSearch: true })) ||
            (await caches.match(cleanPath, { ignoreSearch: true })) ||
            (await caches.match('index.html')) ||
            (await caches.match('./'));
          return cached ? addCoopCoepHeaders(cached) : Response.error();
        })
    );
    return;
  }

  // 2. Static assets: Cache First, fallback to Network with dynamic caching
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cached) => {
      if (cached) return ensureWasmMime(cached, url);

      return fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return ensureWasmMime(res, url);
      }).catch(async () => {
        const cleanPath = url.pathname.replace(/^\//, '');
        const fallback = (await caches.match(cleanPath, { ignoreSearch: true })) ||
          (await caches.match(url.pathname, { ignoreSearch: true }));
        return fallback ? ensureWasmMime(fallback, url) : Response.error();
      });
    })
  );
});
