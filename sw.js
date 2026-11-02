/* Mirror service worker: fresh HTML online, cached assets and offline fallback.
   Bump CACHE_VERSION on every deploy so old caches are invalidated cleanly. */
var CACHE_VERSION = 'n4deem-mirror-snake-2026-11-02-v3';
var ASSETS = [
  '/',
  '/index.html',
  '/assets/webfonts/DepartureMono-Regular.woff2',
  '/resume/Nadeem_resume.pdf'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(function (cache) { return cache.addAll(ASSETS.map(function (url) { return new Request(url, { cache: "reload" }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (key) {
          if (key !== CACHE_VERSION) return caches.delete(key);
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;
  // Never pin a visitor to an old terminal after a deployment.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(new Request(request, { cache: 'no-cache' })).then(function (response) {
        if (response && response.ok && response.type === 'basic') {
          var copy = response.clone();
          event.waitUntil(caches.open(CACHE_VERSION).then(function (cache) {
            return cache.put(request, copy);
          }));
        }
        return response;
      }).catch(function () {
        return caches.match(request, { ignoreSearch: true }).then(function (cached) {
          return cached || caches.match('/index.html');
        });
      })
    );
    return;
  }
  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      if (cached) return cached;
      return fetch(request).then(function (response) {
        if (response && response.ok && response.type === 'basic') {
          var copy = response.clone();
          caches.open(CACHE_VERSION).then(function (cache) { cache.put(request, copy); });
        }
        return response;
      });
    })
  );
});
