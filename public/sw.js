const CACHE = "gaokao-quest-v3";
const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const asset = (path) => `${BASE}${path}`;
const CORE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/data/catalog.json",
  "/data/chapters.json",
  "/data/english/catalog.json",
  "/data/english/chapters.json",
].map(asset);
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("gaokao-quest-") && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== location.origin ||
    url.pathname.startsWith(`${BASE}/admin`) ||
    url.pathname.startsWith(`${BASE}/api`)
  )
    return;
  // RSC responses have separate URLs and Vary headers; retain the original Request as the cache key.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(request, clone)),
            );
          }
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ||
            (await caches.match(asset("/offline.html"))),
        ),
    );
    return;
  }
  if (
    url.pathname.startsWith(`${BASE}/_next/static/`) ||
    url.pathname.startsWith(`${BASE}/data/`) ||
    url.pathname.endsWith(".png") ||
    request.headers.get("RSC") === "1"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fresh = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            event.waitUntil(
              caches.open(CACHE).then((cache) => cache.put(request, clone)),
            );
          }
          return response;
        });
        if (cached) {
          event.waitUntil(fresh.catch(() => {}));
          return cached;
        }
        return fresh;
      }),
    );
  }
});
