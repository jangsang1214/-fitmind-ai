const CACHE='garang-vector-coach-v3-1-20260903';
const SHELL=[
  './','./index.html','./styles.css','./garang-target-ui.css','./garang-functional-recovery.css','./garang-runtime-final.css','./garang-brand-runtime-v2.css','./garang-polish-v3.css',
  './app.js','./garang-functional-recovery.js','./garang-brand-runtime-v2.js','./garang-polish-v3.js','./garang-polish-v3-fix.js','./firebase-config.js','./garang-services-config.js',
  './manifest.webmanifest','./garang-mark.svg','./garang-app-icon.svg','./exercise-db.json','./food-db.json'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    await Promise.all(clients.map(client=>client.navigate(client.url).catch(()=>null)));
  })());
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
