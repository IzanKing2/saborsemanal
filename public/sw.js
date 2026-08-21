const CACHE_NAME = "saborsemanal-public-v5";
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
  // Next.js client-side transitions (clicking a Link) fetch an RSC/flight
  // payload tagged with these headers instead of a full HTML document, and
  // never trigger request.mode === "navigate". Reaching the shopping list
  // through in-app navigation (the common case) would otherwise never warm
  // the cache. We also intercept that plain document request (see the
  // offline-banner warm-up fetch) as long as it isn't itself an RSC fetch,
  // so a normal in-app visit caches the same full-page HTML a hard
  // navigation/reload would need for the offline fallback below.
  const isRscRequest =
    request.headers.has("RSC") || request.headers.has("Next-Router-State-Tree");

  if (
    (request.mode === "navigate" || (isOfflineCapablePage && !isRscRequest)) &&
    (isPublicPage || isOfflineCapablePage)
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // clone() must run synchronously, before the original response's
          // body is handed off below -- once that body starts being read,
          // a clone deferred inside the async caches.open().then() chain
          // would throw "body already used".
          const copy = response.clone();
          // Without waitUntil, the browser can kill this worker as soon as
          // the response below is delivered to the page -- the dangling
          // cache write would then silently never complete, and nothing
          // ever actually got cached despite this code looking correct.
          event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          return response;
        })
        .catch(() =>
          caches.match(request).then((response) => {
            if (response) return response;
            if (!isOfflineCapablePage) return caches.match("/");
            // Exact week (query string) not cached -- fall back to whatever
            // week of this page was last cached rather than showing
            // nothing, since ignoring the query is strictly better than a
            // hard failure while offline.
            return caches.match(url.pathname, { ignoreSearch: true });
          }),
        ),
    );
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/icon.svg") {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)));
          }
          return response;
        });
        return cached || network;
      }),
    );
  }
});
