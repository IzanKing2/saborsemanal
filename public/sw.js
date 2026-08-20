const CACHE_NAME = "saborsemanal-public-v2";
const PUBLIC_SHELL = ["/", "/recetas", "/planificador"];
// Requires auth, so it's never pre-cached at install time (that would just
// cache a login redirect) — only cached at runtime, after a real visit
// while online, so the last-seen list is available offline at the store.
const OFFLINE_CAPABLE_PAGE = "/dashboard/lista-compra";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PUBLIC_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isPublicPage =
    url.pathname === "/" ||
    url.pathname === "/recetas" ||
    url.pathname === "/planificador";
  const isOfflineCapablePage = url.pathname === OFFLINE_CAPABLE_PAGE;

  if (request.mode === "navigate" && (isPublicPage || isOfflineCapablePage)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((response) => response || (isOfflineCapablePage ? undefined : caches.match("/"))),
        ),
    );
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        });
        return cached || network;
      }),
    );
  }
});
