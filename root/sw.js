// RideGO Service Worker
const CACHE_NAME = 'ridego-v6';
const CACHE_STATIC = 'ridego-static-v6';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/favicon.ico',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
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

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) {
          return k !== CACHE_STATIC && k !== CACHE_NAME;
        }).map(function(k) {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var req = e.request;
  var url = new URL(req.url);

  if (req.method !== 'GET') return;

  var skipCache = [
    'firebaseio.com', 'googleapis.com', 'cloudfunctions.net',
    'cloudinary.com', 'nominatim.openstreetmap.org',
    'identitytoolkit.googleapis.com', 'securetoken.googleapis.com',
    'api.qrserver.com', 'cdnjs.cloudflare.com',
    'fonts.googleapis.com', 'fonts.gstatic.com', 'exchangerate-api.com'
  ];
  if (skipCache.some(function(d) { return url.hostname.includes(d); })) return;

  if (url.hostname === 'res.cloudinary.com') {
    e.respondWith(
      caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(req).then(function(cached) {
          if (cached) return cached;
          return fetch(req).then(function(resp) {
            if (resp && resp.status === 200) cache.put(req, resp.clone());
            return resp;
          }).catch(function() { return cached || new Response('', { status: 408 }); });
        });
      })
    );
    return;
  }

  // JS і CSS — МЕРЕЖА СПОЧАТКУ, кешуємо для офлайн fallback
  if (url.pathname.match(/\.(js|css)$/)) {
    e.respondWith(
      fetch(req).then(function(resp) {
        if (resp && resp.status === 200) {
          var respClone = resp.clone();
          caches.open(CACHE_NAME).then(function(cache) { cache.put(req, respClone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(req).then(function(c) {
          return c || new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(function() {
        return caches.match('/index.html').then(function(cached) {
          return cached || new Response('<h1>Немає з\'єднання</h1>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        });
      })
    );
    return;
  }

  if (url.pathname.match(/\.(woff2?|ttf|svg|ico|png|webp|jpg|jpeg)$/)) {
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(resp) {
          if (resp && resp.status === 200) {
            caches.open(CACHE_STATIC).then(function(cache) { cache.put(req, resp.clone()); });
          }
          return resp;
        }).catch(function() { return cached || new Response('', { status: 408 }); });
      })
    );
    return;
  }

  e.respondWith(fetch(req).catch(function() { return caches.match(req); }));
});

self.addEventListener('push', function(e) {
  if (!e.data) return;
  var data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'RideGO', {
      body: data.body || '', icon: '/favicon.svg', badge: '/favicon.svg',
      tag: data.tag || 'ridego', data: { url: data.url || '/' }
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
