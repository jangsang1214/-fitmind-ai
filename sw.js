const CACHE="fitmind-v4-6-stable-20260811";
const APP_SHELL=["./","./index.html","./style.css","./app.js","./food-db.json","./exercise-db.json","./manifest.webmanifest"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  const req=event.request;
  if(req.method!=="GET")return;
  const url=new URL(req.url);
  if(url.origin!==location.origin)return;
  if(["index.html","app.js","style.css","sw.js","food-db.json","exercise-db.json","manifest.webmanifest"].includes(url.pathname.split("/").pop())){
    event.respondWith(fetch(req,{cache:"no-store"}).then(res=>{const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));return res}).catch(()=>caches.match(req)));
  }else{
    event.respondWith(caches.match(req).then(r=>r||fetch(req)));
  }
});
