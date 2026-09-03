/* GARANG recovery service worker: root-safe for GitHub project Pages. */
const CACHE='garang-approved-reference-v42-core';
const ASSETS=[
  './','./index.html','./app.js','./pwa.js','./manifest.webmanifest','./runtime-manifest.json','./garang-v10-core.js','./version.js','./today.js','./data-schema.js',
  './ui-translations.js','./ui-final-translations.js','./storage.js','./performance.js',
  './records.js','./adapters.js','./features.js','./firebase-config.js','./services-config.js','./commercial-core.js',
  './styles.css','./garang-v10-release.css','./garang-planner-v10.css','./final.css','./commercial.css',
  './garang-v10.9-mobile-max.css','./garang-mark.svg','./garang-app-icon.svg',
  './exercise-db.json','./food-db.json','./exercise_knowledge.jsonl','./food_knowledge.jsonl',
  './fitmind_rules.jsonl','./fitmind_sft.jsonl','./synthetic_korean_dialogue_v6.jsonl'
];
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)));});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE&&(/garang|fitmind/i.test(k))).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){event.respondWith(fetch(event.request).catch(()=>caches.match('./index.html')));return;}
  event.respondWith(fetch(event.request).then(response=>{if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,copy)));}return response;}).catch(()=>caches.match(event.request,{ignoreSearch:true})));
});
