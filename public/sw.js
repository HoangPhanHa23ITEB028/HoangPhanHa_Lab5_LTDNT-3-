const CACHE_NAME = "vku-field-survey-v6";

const APP_SHELL = [
  "/",
  "/index.html",
  "/style.css",
  "/app.js",
  "/db.js",
  "/survey-schema.js",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",

  "/offline.html",
  "/styleFallBack.css",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL);
    })
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );

  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    return;
  }

  if (request.method !== "GET") {
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request, {
        ignoreVary: true,
      });

      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok && url.origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);

          await cache.put(request, networkResponse.clone());
        }

        return networkResponse;
      } catch (error) {
        if (request.mode === "navigate") {
          return caches.match("/offline.html", {
            ignoreVary: true,
          });
        }

        throw error;
      }
    })()
  );
});
