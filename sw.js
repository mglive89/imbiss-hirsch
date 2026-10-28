/* Imbiss – service worker for all apps (scope = project root).
   Bump VERSION after changing files so installed apps update. */
const VERSION = "imbiss-v3";
const CORE = [
  "kunde/", "kunde/index.html", "kunde/manifest.webmanifest",
  "kasse/", "kasse/index.html", "kasse/manifest.webmanifest",
  "dashboard/", "dashboard/index.html", "dashboard/manifest.webmanifest",
  "kueche/", "kueche/index.html", "kueche/manifest.webmanifest",
  "abholung/", "abholung/index.html", "abholung/manifest.webmanifest",
  "shared/ih.css", "shared/ih.js", "shared/staff.js", "shared/config.js", "shared/menu-fallback.js",
  "assets/logo.jpg", "assets/cover.jpg",
  ...["kunde", "kasse", "dashboard", "kueche", "abholung"].flatMap(a => [`assets/icons/${a}-192.png`, `assets/icons/${a}-64.png`, `assets/icons/${a}-apple.png`]),
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;            // live data never from cache
  const same = url.origin === location.origin;
  // pages and app code: network first (updates show up at once), cache as offline fallback
  if (req.mode === "navigate" || (same && /\.(html|js|css|webmanifest)$/.test(url.pathname))) {
    e.respondWith(fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((r) => r || caches.match(new URL("kunde/", self.registration.scope).href))));
    return;
  }
  // images, fonts, libraries: cache first
  if (!(same || /fonts\.(googleapis|gstatic)\.com|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net/.test(url.hostname))) return;
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
