/* GARANG Accumulation Motion v5 — Cinematic Asset Controller
   Luxury material is authored outside the browser and delivered as mastered media.
   This runtime never synthesizes water, ink, lacquer, caustics, droplets, or ripples with Canvas.
   It owns playback/state only; canonical Today / Coach / check-in state and actions remain untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1?.version === '5.0.0') return;

  const VERSION='5.0.0';
  const QUALITY='cinematic-asset-v1';
  const RENDERER='media-asset-controller';
  const MANIFEST_URL='./05_assets/garang-accumulation-cinematic/v1/manifest.json?v=1.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const UA=String(navigator.userAgent||'');
  const IN_APP=/Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(UA);
  const MOBILE=/iPhone|iPad|iPod|Android/i.test(UA)||window.matchMedia?.('(max-width:760px)')?.matches;
  const SAVE_DATA=!!navigator.connection?.saveData;
  const surfaces=new Map();
  let manifest=null;
  let manifestPromise=null;
  let assetStatus='manifest-pending';
  let previousRecordCount=null;
  let queued=false;
  let retryTimer=0;
  let pageSuspended=false;
  let lastPlaybackAt=0;

  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!pageSuspended&&(!doc.hidden||IN_APP);
  const pad=value=>String(value).padStart(2,'0');
  const localDate=value=>{const d=value instanceof Date?value:new Date(value);return Number.isFinite(d.getTime())?`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`:'';};
  const today=()=>localDate(new Date());
  const list=value=>Array.isArray(value)?value:[];
  const rowDate=row=>{const explicit=String(row?.date||row?.day||'').trim();if(/^\d{4}-\d{2}-\d{2}/.test(explicit))return explicit.slice(0,10);const raw=row?.performedAt||row?.createdAt||row?.updatedAt||'';return raw?localDate(raw):'';};
  const sameDate=(row,date)=>rowDate(row)===date;

  function getState(){
    try{return window.GarangAgentStateBridge?.getLiveState?.()||window.GarangAgentStateBridge?.getState?.()||null;}catch{return null;}
  }

  function recordCountForToday(state){
    if(!state)return 0;
    const date=today();
    const records=['workouts','runs','meals','body'].reduce((sum,key)=>sum+list(state[key]).filter(row=>sameDate(row,date)).length,0);
    const checkins=[...list(state.dailyCheckins),...list(state.checkins)].filter(row=>sameDate(row,date));
    return records+(checkins.length?1:0);
  }

  function ensureStyle(){
    const old=doc.getElementById('garangAccumulationMotionStyle');
    if(old?.dataset?.garangMotionVersion===VERSION)return;
    old?.remove();
    const style=doc.createElement('style');
    style.id='garangAccumulationMotionStyle';
    style.dataset.garangMotionVersion=VERSION;
    style.textContent=`
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;isolation:isolate;overflow:hidden!important;background:#050605!important;contain:layout paint}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gac5-shell{position:absolute;inset:0;z-index:0;overflow:hidden;pointer-events:none;background:#050605;transform:translateZ(0);backface-visibility:hidden}
#main[data-garang-screen="today"] .gac5-shell:before{content:"";position:absolute;inset:-1px;z-index:3;pointer-events:none;background:linear-gradient(180deg,rgba(5,6,5,.82) 0%,rgba(5,6,5,.18) 22%,rgba(5,6,5,.04) 58%,rgba(5,6,5,.72) 100%),linear-gradient(90deg,rgba(5,6,5,.58) 0%,transparent 26%,transparent 78%,rgba(5,6,5,.18) 100%)}
#main[data-garang-screen="today"] .gac5-shell:after{content:"";position:absolute;inset:0;z-index:4;pointer-events:none;box-shadow:inset 0 0 72px rgba(0,0,0,.38)}
#main[data-garang-screen="today"] .gac5-media{position:absolute;inset:-3%;width:106%;height:106%;object-fit:cover;object-position:50% 58%;display:block;opacity:0;transition:opacity 420ms cubic-bezier(.2,.7,.2,1);pointer-events:none;background:#050605;filter:saturate(.82) contrast(1.035)}
#main[data-garang-screen="today"] .gac5-media[data-ready="1"]{opacity:1}
#main[data-garang-screen="today"] .gac5-media--event{z-index:2;opacity:0}
#main[data-garang-screen="today"] .gac5-media--event[data-playing="1"]{opacity:1}
#main[data-garang-screen="today"] .gac5-media--idle{z-index:1}
#main[data-garang-screen="today"] .gac5-fallback{position:absolute;inset:0;z-index:0;background:radial-gradient(ellipse at 56% 72%,rgba(33,39,36,.22) 0%,rgba(13,16,14,.16) 28%,rgba(5,6,5,0) 68%),#050605}
#main[data-garang-screen="today"] .gac5-fallback:after{content:"";position:absolute;left:19%;right:10%;bottom:18%;height:1px;background:linear-gradient(90deg,transparent,rgba(229,227,218,.06) 38%,rgba(126,151,142,.075) 61%,transparent);transform:rotate(-.8deg)}
#main[data-garang-screen="today"][data-garang-cinematic-status="ready"] .gac5-fallback{opacity:0}
#main[data-garang-screen="today"] .gtd3-ripple>.gac5-shell{inset:0!important;width:100%!important;height:100%!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtd3-motion-canvas{display:none!important}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gac5-media{display:none!important}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gac5-shell{background-size:cover;background-position:center}
@media(max-width:430px){#main[data-garang-screen="today"] .gac5-media{inset:-2% -7%;width:114%;height:104%;object-position:54% 62%}}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] .gac5-media{transition:none!important}}
`;
    doc.head.appendChild(style);
  }

  function resolveAsset(file){
    const value=String(file||'').trim();
    if(!value)return '';
    if(/^(https?:|data:|blob:|\/)/i.test(value))return value;
    const base=String(manifest?.basePath||'./05_assets/garang-accumulation-cinematic/v1/').replace(/\/?$/,'/');
    return `${base}${value}`;
  }

  async function loadManifest(){
    if(manifest)return manifest;
    if(manifestPromise)return manifestPromise;
    manifestPromise=fetch(MANIFEST_URL,{cache:'no-cache'})
      .then(response=>{if(!response.ok)throw new Error(`cinematic manifest ${response.status}`);return response.json();})
      .then(value=>{
        manifest=value&&typeof value==='object'?value:{};
        assetStatus=manifest.status==='ready'?'ready':String(manifest.status||'production-required');
        return manifest;
      })
      .catch(()=>{assetStatus='manifest-error';manifest={status:'manifest-error'};return manifest;});
    return manifestPromise;
  }

  function makeVideo(role){
    const video=doc.createElement('video');
    video.className=`gac5-media gac5-media--${role}`;
    video.dataset.garangCinematicMedia=role;
    video.muted=true;
    video.defaultMuted=true;
    video.playsInline=true;
    video.setAttribute('playsinline','');
    video.setAttribute('webkit-playsinline','');
    video.setAttribute('aria-hidden','true');
    video.preload=role==='idle'?'metadata':'none';
    video.tabIndex=-1;
    return video;
  }

  function sourceVideo(video,entry,{loop=false,preload='metadata'}={}){
    if(!video||!entry)return false;
    const sources=[];
    if(entry.webm)sources.push({src:resolveAsset(entry.webm),type:'video/webm'});
    if(entry.mp4)sources.push({src:resolveAsset(entry.mp4),type:'video/mp4'});
    if(!sources.length)return false;
    video.pause();
    video.removeAttribute('src');
    video.replaceChildren();
    for(const source of sources){const node=doc.createElement('source');node.src=source.src;node.type=source.type;video.appendChild(node);}
    video.loop=!!loop;
    video.preload=preload;
    video.dataset.ready='0';
    video.dataset.playing='0';
    video.load();
    return true;
  }

  function setPoster(surface){
    const poster=resolveAsset(manifest?.hero?.poster);
    if(!poster)return;
    surface.shell.style.backgroundImage=`linear-gradient(180deg,rgba(5,6,5,.18),rgba(5,6,5,.38)),url("${poster.replace(/"/g,'%22')}")`;
    surface.shell.style.backgroundSize='cover';
    surface.shell.style.backgroundPosition='50% 58%';
  }

  function bindMedia(surface){
    if(surface.bound)return;
    surface.bound=true;
    const {idle,event}=surface;
    idle.addEventListener('loadeddata',()=>{idle.dataset.ready='1';surface.host.dataset.garangCinematicReady='1';lastPlaybackAt=performance.now();});
    idle.addEventListener('playing',()=>{lastPlaybackAt=performance.now();});
    idle.addEventListener('error',()=>{surface.host.dataset.garangCinematicReady='0';});
    event.addEventListener('loadeddata',()=>{event.dataset.ready='1';});
    event.addEventListener('playing',()=>{event.dataset.playing='1';lastPlaybackAt=performance.now();});
    const settle=()=>{event.dataset.playing='0';event.pause();event.currentTime=0;surface.eventName='';if(todayActive()&&!reduced())idle.play().catch(()=>{});};
    event.addEventListener('ended',settle);
    event.addEventListener('error',settle);
  }

  function makeSurface(host){
    if(!host)return null;
    const current=surfaces.get(host);
    if(current&&current.shell.isConnected)return current;
    const shell=doc.createElement('div');shell.className='gac5-shell';shell.dataset.garangCinematicSurface='hero';shell.setAttribute('aria-hidden','true');
    const fallback=doc.createElement('div');fallback.className='gac5-fallback';fallback.setAttribute('aria-hidden','true');
    const idle=makeVideo('idle');
    const event=makeVideo('event');
    shell.append(fallback,idle,event);
    host.appendChild(shell);
    const surface={host,shell,fallback,idle,event,bound:false,configured:false,eventName:''};
    bindMedia(surface);
    surfaces.set(host,surface);
    return surface;
  }

  function removeStale(){
    for(const [host,surface] of surfaces){
      if(host.isConnected)continue;
      surface.idle.pause();surface.event.pause();surface.shell.remove();surfaces.delete(host);
    }
  }

  function configureSurface(surface){
    if(!surface||surface.configured)return;
    surface.configured=true;
    setPoster(surface);
    if(assetStatus!=='ready')return;
    const idleEntry=manifest?.hero?.idle;
    if(!sourceVideo(surface.idle,idleEntry,{loop:true,preload:SAVE_DATA?'metadata':'auto'}))return;
    if(!reduced()&&todayActive())surface.idle.play().catch(()=>{});
  }

  function eventEntry(name){return manifest?.hero?.events?.[name]||manifest?.hero?.events?.deposit||null;}

  function playEvent(name='deposit'){
    if(reduced()||assetStatus!=='ready'||!todayActive())return false;
    const surface=[...surfaces.values()].find(item=>item.host.isConnected);
    if(!surface)return false;
    const entry=eventEntry(name);if(!entry)return false;
    if(surface.eventName!==name||surface.event.dataset.sourceKey!==`${entry.webm||''}|${entry.mp4||''}`){
      if(!sourceVideo(surface.event,entry,{loop:false,preload:'auto'}))return false;
      surface.event.dataset.sourceKey=`${entry.webm||''}|${entry.mp4||''}`;
      surface.eventName=name;
    }
    try{surface.event.currentTime=0;}catch{}
    surface.idle.pause();
    const attempt=surface.event.play();
    if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{surface.event.dataset.playing='0';surface.idle.play().catch(()=>{});});
    return true;
  }

  function syncRecordState(){
    const count=recordCountForToday(getState());
    if(previousRecordCount===null){previousRecordCount=count;return;}
    if(count>previousRecordCount)playEvent('deposit');
    previousRecordCount=count;
  }

  function markRoot(){
    const m=main();if(!m)return;
    m.dataset.garangMotion=reduced()?'reduced':'active';
    m.dataset.garangMotionQuality=QUALITY;
    m.dataset.garangMotionRenderer=RENDERER;
    m.dataset.garangCinematicStatus=assetStatus;
  }

  async function sync(){
    queued=false;
    ensureStyle();removeStale();
    const m=main();if(!m||m.dataset.garangScreen!=='today')return;
    const host=m.querySelector('.gtd3-ripple');
    if(!host){clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,120);return;}
    const surface=makeSurface(host);
    markRoot();
    await loadManifest();
    markRoot();
    if(!surface.host.isConnected)return;
    configureSurface(surface);
    syncRecordState();
    if(reduced()){
      surface.idle.pause();surface.event.pause();surface.event.dataset.playing='0';setPoster(surface);
    }else if(assetStatus==='ready'&&todayActive()&&!surface.event.dataset.playing){
      surface.idle.play().catch(()=>{});
    }
  }

  function queueSync(){if(queued)return;queued=true;setTimeout(sync,16);}
  function lifecycleSync(){queueSync();clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,180);}
  function stop(){for(const surface of surfaces.values()){surface.idle.pause();surface.event.pause();surface.event.dataset.playing='0';}}
  function resume(){if(!todayActive()||reduced())return;for(const surface of surfaces.values()){if(surface.host.isConnected&&assetStatus==='ready'&&!surface.event.dataset.playing)surface.idle.play().catch(()=>{});}}

  reducedQuery?.addEventListener?.('change',lifecycleSync);
  window.addEventListener('resize',lifecycleSync,{passive:true});
  window.addEventListener('orientationchange',lifecycleSync,{passive:true});
  window.addEventListener('pagehide',()=>{pageSuspended=true;stop();});
  window.addEventListener('pageshow',()=>{pageSuspended=false;lifecycleSync();setTimeout(resume,40);});
  doc.addEventListener('visibilitychange',()=>{if(!IN_APP&&doc.hidden)stop();else if(!doc.hidden){pageSuspended=false;lifecycleSync();setTimeout(resume,40);}});
  window.addEventListener('garang:screen-rendered',lifecycleSync);
  window.addEventListener('garang:state-updated',lifecycleSync);
  window.addEventListener('garang:state-hydrated',lifecycleSync);
  window.addEventListener('garang:route-completed',lifecycleSync);
  window.addEventListener('garang:workout-intelligence-rendered',lifecycleSync);

  const api=Object.freeze({
    version:VERSION,
    quality:QUALITY,
    renderer:RENDERER,
    manifestUrl:MANIFEST_URL,
    sync:queueSync,
    stop,
    resume,
    playEvent,
    get assetStatus(){return assetStatus;},
    get activeSurfaces(){return [...surfaces.values()].filter(x=>x.host.isConnected).map(()=> 'hero');},
    get reducedMotion(){return reduced();},
    get inAppBrowser(){return IN_APP;},
    get mobile(){return MOBILE;},
    get lastPlaybackAt(){return lastPlaybackAt;}
  });
  window.GarangAccumulationMotionV1=api;
  window.GarangAccumulationMotionV5=api;
  lifecycleSync();
})();