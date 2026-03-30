// RideGO Service Worker
const CACHE_NAME = 'ridego-v5';
const CACHE_STATIC = 'ridego-static-v5';

// Файли що кешуємо при встановленні
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon.ico',
  '/manifest.json'
];

// ── INSTALL ──────────────────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
      // addAll може зфейлитись якщо хоч один файл не знайдено
      // тому додаємо по одному щоб не ламати весь SW
      return Promise.allSettled(
        STATIC_ASSETS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE ─────────────────────────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_STATIC && k !== CACHE_NAME;
        }).map(function(k) {
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── FETCH ─────────────────────────────────────────────────────
self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = new URL(req.url);

  // Тільки GET запити
  if (req.method !== 'GET') return;

  // Firebase, Cloudinary, Nominatim — завжди мережа (не кешуємо API)
  var skipCache = [
    'firebaseio.com',
    'googleapis.com',
    'cloudfunctions.net',
    'cloudinary.com',
    'nominatim.openstreetmap.org',
    'identitytoolkit.googleapis.com',
    'securetoken.googleapis.com',
    'api.qrserver.com',
    'cdnjs.cloudflare.com',  // Font Awesome, Leaflet — завжди з CDN, не кешуємо
    'fonts.googleapis.com',  // Google Fonts CSS — не кешуємо
    'fonts.gstatic.com'      // Google Fonts woff2 — браузер сам кешує
  ];
  if (skipCache.some(function(d) { return url.hostname.includes(d); })) {
    return; // дозволяємо браузеру обробити
  }

  // Зображення з Cloudinary — кешуємо
  if (url.hostname === 'res.cloudinary.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(req).then(function(cached) {
          if (cached) return cached;
          return fetch(req).then(function(resp) {
            if (resp && resp.status === 200) {
              cache.put(req, resp.clone());
            }
            return resp;
          }).catch(function() {
            return cached || new Response('', { status: 408 });
          });
        });
      })
    );
    return;
  }

  // Навігація (HTML сторінки) — Network first, fallback до /index.html
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function() {
        return caches.match('/index.html').then(function(cached) {
          return cached || new Response('<h1>Немає з\'єднання з інтернетом</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  // JS і CSS — завжди з мережі (не кешуємо щоб оновлення одразу доходили до юзерів)
  if (url.pathname.match(/\.(js|css)$/)) {
    e.respondWith(
      fetch(req).then(function(resp) {
        return resp;
      }).catch(function() {
        return caches.match(req);
      })
    );
    return;
  }

  // Інші статичні ресурси (шрифти, іконки) — Cache first
  if (url.pathname.match(/\.(woff2?|ttf|svg|ico|png|webp)$/)) {
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(resp) {
          if (resp && resp.status === 200) {
            caches.open(CACHE_STATIC).then(function(cache) {
              cache.put(req, resp.clone());
            });
          }
          return resp;
        }).catch(function() {
          return cached || new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // Решта — Network first
  e.respondWith(
    fetch(req).catch(function() {
      return caches.match(req);
    })
  );
});

// ── PUSH NOTIFICATIONS ────────────────────────────────────────
self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'RideGO', {
      body: data.body || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: data.tag || 'ridego',
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  var url = e.notification.data && e.notification.data.url || '/';
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(function(cls) {
      for (var i = 0; i < cls.length; i++) {
        if (cls[i].url === url && 'focus' in cls[i]) return cls[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
