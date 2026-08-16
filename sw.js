const CACHE = "super-me-v2-30";
const ASSETS = [
  "/",
  "/index.html",
  "/styles.css",
  "/discipline.css",
  "/brand.css",
  "/storage-safety.js",
  "/app.js",
  "/photo-ui.js",
  "/goals-v2.js",
  "/sport-flags.js",
  "/books.js",
  "/weight.js",
  "/discipline-ui.js",
  "/nav-v2.js",
  "/smoking.js",
  "/meditation.js",
  "/reading-label.js",
  "/health-details.js",
  "/body-card-click.js",
  "/drive-backup-ui.js",
  "/universal-plus-v3.js",
  "/entry-manager.js",
  "/movement-calories.js",
  "/smart-message.js",
  "/discipline-30.js",
  "/weekly-recap.js",
  "/salt-ui.js",
  "/coffee-ui.js",
  "/manifest.json",
  "/icon-superme-v2-192.svg",
  "/icon-superme-v2-512.svg"
];

self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", event => {
  event.waitUntil(Promise.all([
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))),
    self.clients.claim()
  ]));
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.startsWith("/api/")) return;
  const isNavigation = req.mode === "navigate" || url.pathname === "/" || url.pathname === "/index.html";
  if (isNavigation) {
    event.respondWith(fetch(req).then(response => {const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return response;}).catch(()=>caches.match(req).then(r=>r||caches.match("/index.html"))));
    return;
  }
  event.respondWith(fetch(req).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(req,copy));return response;}).catch(()=>caches.match(req)));
});
