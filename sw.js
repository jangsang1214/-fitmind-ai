const CACHE='garang-commercial-v10-exact-reference';
const SHELL=['./','./index.html','./styles.css','./garang-target-ui.css','./garang-exact-reference.css','./garang-exact-functional.css','./garang-nutrition-reference.css','./garang-reference-data.css','./garang-final-reference-overrides.css','./garang-icon-reference.css','./app.js','./garang-reference-interactions.js','./garang-route-bridge.js','./garang-nutrition-reference.js','./garang-reference-data.js','./garang-reference-access.js','./firebase-config.js','./garang-services-config.js','./manifest.webmanifest','./garang-mark.svg'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put('./index.html',copy));return r;}).catch(()=>caches.match('./index.html')));
    return;
  }
  if(url.origin===self.location.origin){
    e.respondWith(caches.match(e.request).then(cached=>{
      const network=fetch(e.request).then(r=>{if(r&&r.ok){const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));}return r;}).catch(()=>cached);
      return cached||network;
    }));
  }
});
