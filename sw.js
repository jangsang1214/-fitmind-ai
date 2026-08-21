const CACHE="garang-v9-9-5-composer";
const APP_ASSETS=["./","./index.html","./manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(APP_ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=="GET" || u.origin!==self.location.origin) return;
  const p=u.pathname.toLowerCase();
  const fresh=/\.(html?|js|css|json|jsonl|webmanifest)$/.test(p);
  if(fresh){
    e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{
      if(r && r.ok){const copy=r.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});}
      return r;
    }).catch(()=>caches.match(e.request).then(r=>r||new Response("Offline",{status:503}))));
  }else{
    e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
  }
});
