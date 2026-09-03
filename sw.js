const CACHE='garang-functional-recovery-v1';
const SHELL=[
  './','./index.html','./styles.css','./garang-target-ui.css','./garang-functional-recovery.css',
  './app.js','./garang-functional-recovery.js','./firebase-config.js','./garang-services-config.js',
  './manifest.webmanifest','./garang-mark.svg','./garang-app-icon.svg','./exercise-db.json','./food-db.json'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  // Network-first prevents an old reference facade/model from surviving in an installed PWA.
  event.respondWith(fetch(event.request).then(response=>{
    if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));}
    return response;
  }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('./index.html'))));
});
