// Torii fan app service worker: network-first with cache fallback, so chapters you've opened
// (pages + images) can be read again offline. Only the fan app's own screens are cached; the
// collaboration workspace always goes to the network.
const CACHE = "torii-v2";
const FAN = /^\/(read|manga|figures|collabs|shelf|account|cart|verify)(\/|$)/;
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/read", "/manifest.webmanifest", "/icon-192.png"]).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  const cacheable = (req.mode === "navigate" && FAN.test(url.pathname)) || url.pathname.startsWith("/api/store/page") || url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icon");
  if (!cacheable) return;
  e.respondWith(
    fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("/read") : Response.error())))
  );
});
