const CACHE="fitmind-v8-1-final";
const APP_ASSETS=["./","./index.html"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("fitmind-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
 const u=new URL(e.request.url);
 if(e.request.method!=="GET")return;
 // Always fetch the HTML and JS from network first so an old GitHub Pages/PWA cache
 // cannot silently keep V5/V6.1 code alive.
 if(u.pathname.endsWith(".html")||u.pathname.endsWith(".js")){
   e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
     const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)); return r;
   }).catch(()=>caches.match(e.request)));
 }else{
   e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
 }
});
