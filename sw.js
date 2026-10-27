// Imbiss Hirsch – offline cache. Bump VERSION after changing files.
const VERSION = "ih-app-v3";
const CORE = ["./", "index.html", "personal.html", "kueche.html", "kueche.webmanifest", "app.css", "config.js", "fallback-menu.js", "img/cover.jpg",
  "manifest.webmanifest", "personal.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-64.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // never cache live data (menu, orders, login)
  if (url.hostname.endsWith("supabase.co")) return;
  const sameOrigin = url.origin === location.origin;
  // pages and app code: network first so updates show up right away, cache as offline fallback
  if (req.mode === "navigate" || (sameOrigin && /\.(html|js|css|webmanifest)$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: req.mode === "navigate"}).then(r => r || caches.match("index.html"))));
    return;
  }
  // images, fonts, libraries: cache first
  const cacheable = sameOrigin || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.hostname);
  if (!cacheable) return;
  e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
    return res;
  })));
});
