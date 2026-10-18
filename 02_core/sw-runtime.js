const CACHE_PREFIX='garang-app-shell-';
const CACHE=`${CACHE_PREFIX}v40-20261018`;
const EXTRA_ASSETS=[
  './06_features/ui/runtime/garang-state-event-durability-v1.js?v=1.1.0',
  './06_features/ui/runtime/garang-today-checkin-override-v1.js?v=1.3.0',
  './06_features/ui/runtime/garang-today-workout-prep-integration-v1.js?v=1.0.3',
  './06_features/ui/runtime/garang-mobile-checkin-planner-shortcut-v1.js?v=1.0.0',
  './03_styles/runtime/garang-reference-ui-v2.css?v=2.0.0',
  './03_styles/runtime/garang-reference-ui-v2-guards.css?v=2.1.6-commercial-nav-safe',
  './03_styles/runtime/garang-reference-ui-commercial-v1.css?v=1.0.1-layout-safe',
  './03_styles/runtime/garang-commercial-target-v3.css?v=3.0.0-founder-approved',
  './03_styles/runtime/garang-commercial-target-v3-1.css?v=3.1.0-screenshot-driven',
  './03_styles/runtime/garang-commercial-target-v3-2.css?v=3.2.0-live-set-contract',
  './03_styles/runtime/garang-commercial-target-v3-3.css?v=3.3.0-detail-access',
  './03_styles/runtime/garang-commercial-target-v3-4.css?v=3.4.0-progressive-details',
  './03_styles/runtime/garang-commercial-target-v3-5.css?v=3.5.0-nutrition-actions',
  './03_styles/runtime/garang-commercial-target-v3-6.css?v=3.6.0-draft-reset-access',
  './03_styles/runtime/garang-commercial-target-v3-7.css?v=3.7.0-screenshot-integrity',
  './03_styles/runtime/garang-commercial-target-v3-8.css?v=3.8.0-workout-draft-touch',
  './03_styles/runtime/garang-commercial-target-v3-9.css?v=3.9.0-coach-density',
  './03_styles/runtime/garang-commercial-i18n-v1.css?v=1.0.0-language-safe',
  './06_features/ui/runtime/garang-reference-ui-v2.js?v=2.0.6-stable-markup',
  './05_assets/body-model-v6/male-front.svg?v=7.3.0-anatomical-mass',
  './05_assets/body-model-v6/male-side.svg?v=7.3.0-anatomical-mass',
  './05_assets/body-model-v6/male-back.svg?v=7.3.0-anatomical-mass',
  './05_assets/body-model-v6/female-front.svg?v=7.3.0-anatomical-mass',
  './05_assets/body-model-v6/female-side.svg?v=7.3.0-anatomical-mass',
  './05_assets/body-model-v6/female-back.svg?v=7.3.0-anatomical-mass'
];

async function precache(){
  const cache=await caches.open(CACHE);
  const indexResponse=await fetch('./index.html',{cache:'reload'});
  if(!indexResponse.ok)throw new Error(`index ${indexResponse.status}`);
  await cache.put('./index.html',indexResponse.clone());
  await cache.put('./',indexResponse.clone());
  const html=await indexResponse.text();
  const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(match=>match[1]);
  const unique=[...new Set([...assets,...EXTRA_ASSETS])];
  await Promise.allSettled(unique.map(async url=>{
    const response=await fetch(url,{cache:'reload'});
    if(response.ok)await cache.put(url,response.clone());
  }));
}

self.addEventListener('install',event=>{
  event.waitUntil(precache().then(()=>self.skipWaiting()));
});

self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(key=>key.startsWith(CACHE_PREFIX)&&key!==CACHE).map(key=>caches.delete(key)));
    await self.clients.claim();
  })());
});

async function networkFirst(request){
  const cache=await caches.open(CACHE);
  try{
    const response=await fetch(request,{cache:'no-store'});
    if(response&&response.ok)await cache.put(request,response.clone());
    return response;
  }catch(error){
    const cached=await cache.match(request);
    if(cached)return cached;
    throw error;
  }
}

self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  if(event.request.mode==='navigate'){
    event.respondWith(networkFirst(event.request).catch(async()=>{
      const cache=await caches.open(CACHE);
      return (await cache.match('./index.html'))||Response.error();
    }));
    return;
  }
  /* Never answer script/style/data requests with index.html. Exact versioned assets only. */
  event.respondWith(networkFirst(event.request).catch(()=>Response.error()));
});
