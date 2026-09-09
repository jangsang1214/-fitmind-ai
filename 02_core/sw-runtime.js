const CACHE_PREFIX='garang-app-shell-';
const CACHE=`${CACHE_PREFIX}v19-20260909`;

async function precache(){
  const cache=await caches.open(CACHE);
  const indexResponse=await fetch('./index.html',{cache:'reload'});
  if(!indexResponse.ok)throw new Error(`index ${indexResponse.status}`);
  await cache.put('./index.html',indexResponse.clone());
  await cache.put('./',indexResponse.clone());
  const html=await indexResponse.text();
  const assets=[...html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)].map(match=>match[1]);
  const unique=[...new Set(assets)];
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
