const CACHE="fitmind-v2-20260811";const ASSETS=["./","./index.html","./style.css","./app.js","./food-db.json","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("fetch",e=>e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request))));
