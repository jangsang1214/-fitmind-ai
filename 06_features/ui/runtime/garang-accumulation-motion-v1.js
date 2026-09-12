/* GARANG Accumulation Motion v3
   Mobile-first water motion for Today.
   Canvas owns pixels only; canonical Today / Coach / check-in state and actions stay untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1?.version === '3.0.0') return;

  const VERSION='3.0.0';
  const QUALITY='fluid-mobile-v3';
  const RENDERER='canvas2d-resilient';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const UA=String(navigator.userAgent||'');
  const IN_APP=/Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(UA);
  const MOBILE=/iPhone|iPad|iPod|Android/i.test(UA)||window.matchMedia?.('(max-width:760px)')?.matches;
  const SAVE_DATA=!!navigator.connection?.saveData;
  const FPS=SAVE_DATA?18:(MOBILE||IN_APP?24:30);
  const FRAME_MS=1000/FPS;
  const MAX_DPR=Math.min(window.devicePixelRatio||1,MOBILE?1.5:1.75);
  const TAU=Math.PI*2;
  const surfaces=new Map();
  let raf=0,lastFrame=0,lastPaint=0,queued=false,retryTimer=0,watchdogTimer=0,pageSuspended=false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!pageSuspended&&(!doc.hidden||IN_APP);

  function ensureStyle(){
    const old=doc.getElementById('garangAccumulationMotionStyle');
    if(old?.dataset?.garangMotionVersion===VERSION)return;
    old?.remove();
    const style=doc.createElement('style');style.id='garangAccumulationMotionStyle';style.dataset.garangMotionVersion=VERSION;style.textContent=`
#main[data-garang-screen="today"] .gtd3-motion-canvas{position:absolute;inset:0;width:100%;height:100%;display:block!important;pointer-events:none!important;z-index:0;opacity:1;transform:translateZ(0);backface-visibility:hidden}
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;isolation:isolate;overflow:hidden!important}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gtd3-ripple>.gtd3-motion-canvas{inset:0!important;width:100%!important;height:100%!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtd3-motion-canvas{inset:0!important;z-index:0;opacity:.9}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>.gtd3-motion-canvas{inset:0!important;z-index:0;opacity:.84}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gtd3-motion-canvas{opacity:.78}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] .gtd3-motion-canvas{filter:none!important;transform:none!important}}
`;doc.head.appendChild(style);
  }

  function fit(surface){
    const rect=surface.host.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width)),h=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(MAX_DPR,Math.max(1,window.devicePixelRatio||1));
    if(surface.w===w&&surface.h===h&&surface.dpr===dpr)return false;
    surface.w=w;surface.h=h;surface.dpr=dpr;
    surface.canvas.width=Math.max(1,Math.round(w*dpr));
    surface.canvas.height=Math.max(1,Math.round(h*dpr));
    surface.canvas.style.width=`${w}px`;surface.canvas.style.height=`${h}px`;
    surface.ctx.setTransform(dpr,0,0,dpr,0,0);
    return true;
  }

  function makeSurface(host,type){
    if(!host)return null;
    const existing=surfaces.get(host);
    if(existing){
      existing.type=type;
      if(!existing.canvas.isConnected||existing.canvas.parentElement!==host)host.appendChild(existing.canvas);
      fit(existing);return existing;
    }
    const canvas=doc.createElement('canvas');canvas.className='gtd3-motion-canvas';canvas.dataset.garangMotionSurface=type;canvas.dataset.garangMotionQuality=QUALITY;canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{alpha:true});if(!ctx)return null;
    host.appendChild(canvas);
    const surface={host,canvas,ctx,type,w:0,h:0,dpr:1,visible:true,startedAt:performance.now(),observer:null};
    fit(surface);
    if('IntersectionObserver' in window&&type!=='hero'){
      surface.observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.target===host)surface.visible=entry.isIntersecting&&entry.intersectionRatio>.005;if(surface.visible)schedule();},{rootMargin:'180px 0px',threshold:[0,.005,.1]});
      surface.observer.observe(host);
    }
    surfaces.set(host,surface);return surface;
  }

  function removeStale(){
    for(const [host,surface] of surfaces){if(host.isConnected)continue;surface.observer?.disconnect();surfaces.delete(host);}
  }
  function glow(ctx,x,y,r,alpha){
    if(r<=0||alpha<=0)return;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(200,236,224,${alpha*.55})`);g.addColorStop(.34,`rgba(111,187,164,${alpha*.25})`);g.addColorStop(1,'rgba(18,54,45,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  }
  function fluidRing(ctx,cx,cy,rx,ry,alpha,width,phase=0){
    if(alpha<=.002)return;ctx.save();ctx.lineWidth=width;ctx.shadowColor=`rgba(121,190,169,${alpha*.35})`;ctx.shadowBlur=4;const g=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);g.addColorStop(0,`rgba(94,157,138,${alpha*.18})`);g.addColorStop(.28,`rgba(225,241,235,${alpha*.74})`);g.addColorStop(.58,`rgba(121,190,169,${alpha*.5})`);g.addColorStop(1,`rgba(74,124,110,${alpha*.12})`);ctx.strokeStyle=g;ctx.beginPath();const seg=72;for(let i=0;i<=seg;i++){const a=i/seg*TAU,n=1+.025*Math.sin(a*3+phase)+.012*Math.sin(a*5-phase*.8),x=cx+Math.cos(a)*rx*n,y=cy+Math.sin(a)*ry*(2-n);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.stroke();ctx.restore();
  }
  function droplet(ctx,x,y,r,stretch,alpha){
    ctx.save();ctx.translate(x,y);ctx.scale(1,stretch);const rr=r/Math.max(1,stretch*.72);ctx.shadowColor=`rgba(126,197,176,${alpha*.28})`;ctx.shadowBlur=r*2.2;const g=ctx.createRadialGradient(-rr*.28,-rr*.45,rr*.04,0,0,rr*1.3);g.addColorStop(0,`rgba(248,252,249,${alpha*.98})`);g.addColorStop(.16,`rgba(183,222,210,${alpha*.82})`);g.addColorStop(.48,`rgba(63,119,102,${alpha*.64})`);g.addColorStop(.78,`rgba(8,25,20,${alpha*.78})`);g.addColorStop(1,'rgba(47,110,91,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(0,-rr*1.4);ctx.bezierCurveTo(rr*.18,-rr*.92,rr*.9,-rr*.34,rr*.82,rr*.38);ctx.bezierCurveTo(rr*.74,rr*.98,rr*.34,rr*1.18,0,rr*1.2);ctx.bezierCurveTo(-rr*.34,rr*1.18,-rr*.74,rr*.98,-rr*.82,rr*.38);ctx.bezierCurveTo(-rr*.9,-rr*.34,-rr*.18,-rr*.92,0,-rr*1.4);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=alpha*.72;ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=Math.max(.6,r*.07);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-rr*.38,-rr*.58);ctx.quadraticCurveTo(-rr*.53,-rr*.2,-rr*.38,rr*.12);ctx.stroke();ctx.restore();
  }
  function surfacePlane(ctx,w,h,cx,waterY,energy){
    const haze=ctx.createRadialGradient(cx,waterY,0,cx,waterY,w*.55);haze.addColorStop(0,`rgba(96,163,143,${.07+.04*energy})`);haze.addColorStop(.42,`rgba(46,104,87,${.03+.02*energy})`);haze.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=haze;ctx.fillRect(0,waterY-h*.25,w,h*.5);
    const line=ctx.createLinearGradient(0,waterY,w,waterY);line.addColorStop(0,'rgba(121,181,163,0)');line.addColorStop(.22,'rgba(121,181,163,.1)');line.addColorStop(.5,`rgba(223,239,233,${.12+.07*energy})`);line.addColorStop(.78,'rgba(121,181,163,.08)');line.addColorStop(1,'rgba(121,181,163,0)');ctx.strokeStyle=line;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(0,waterY);ctx.quadraticCurveTo(cx,waterY-1.2,w,waterY);ctx.stroke();
  }

  function drawHero(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;
    const cycle=MOBILE?4.15:4.7,elapsed=Math.max(0,(time-surface.startedAt)/1000),phase=staticOnly?.64:(elapsed%cycle)/cycle,cx=w*.53,waterY=h*.68;
    surfacePlane(ctx,w,h,cx,waterY,phase>.4?1:0);
    const sweep=(phase*w*1.35)-w*.18;glow(ctx,sweep,waterY,w*.085,.08);
    if(phase<.42){
      const t=smooth(phase/.42),y=lerp(-h*.02,waterY-h*.09,t),speed=clamp((t-.2)/.8,0,1),r=Math.max(7.5,Math.min(11.5,w*.026)),stretch=1+.5*speed;glow(ctx,cx,y,r*2.8,.16);droplet(ctx,cx,y,r,stretch,.88);
    }else{
      const impact=clamp((phase-.42)/.14,0,1),ripple=clamp((phase-.42)/.58,0,1),pulse=Math.sin(impact*Math.PI);
      if(phase<.56){
        glow(ctx,cx,waterY,w*(.07+.09*pulse),.22*pulse);ctx.save();ctx.strokeStyle=`rgba(219,239,232,${.18*pulse})`;ctx.lineWidth=.8;const base=w*(.035+.025*impact),peak=h*(.08+.08*pulse);ctx.beginPath();ctx.moveTo(cx-base,waterY);ctx.quadraticCurveTo(cx-base*.5,waterY-peak*.28,cx-base*.2,waterY-peak*.16);ctx.quadraticCurveTo(cx,waterY-peak,cx+base*.2,waterY-peak*.16);ctx.quadraticCurveTo(cx+base*.5,waterY-peak*.28,cx+base,waterY);ctx.stroke();ctx.restore();
      }
      for(let i=0;i<4;i++){
        const delay=i*.105,rt=clamp((ripple-delay)/(1-delay),0,1);if(rt<=0)continue;const e=easeOut(rt),rx=w*(.05+i*.035)+w*(.34+i*.028)*e,ry=rx*(.18+i*.004),alpha=(.28-i*.045)*Math.pow(1-rt,1.2);fluidRing(ctx,cx+(i%2?2:-1),waterY+(i-1)*.5,rx,ry,alpha,i===0?1:.7,phase*TAU+i*.7);
      }
      if(ripple<.36){const jet=Math.sin(clamp(ripple/.36,0,1)*Math.PI),jh=h*.18*jet,jw=Math.max(2,w*.012);const g=ctx.createLinearGradient(cx,waterY-jh,cx,waterY);g.addColorStop(0,`rgba(226,242,235,${.25*jet})`);g.addColorStop(.55,`rgba(102,170,150,${.23*jet})`);g.addColorStop(1,'rgba(20,55,45,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx,waterY-jh);ctx.bezierCurveTo(cx+jw*.3,waterY-jh*.7,cx+jw,waterY-jh*.2,cx+jw*.65,waterY);ctx.lineTo(cx-jw*.65,waterY);ctx.bezierCurveTo(cx-jw,waterY-jh*.2,cx-jw*.3,waterY-jh*.7,cx,waterY-jh);ctx.fill();}
    }
  }

  function drawScore(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.35:(elapsed%5.2)/5.2,y=h*.72;ctx.save();ctx.globalCompositeOperation='screen';const glowX=w*(.12+.76*t);glow(ctx,glowX,y,Math.max(12,w*.22),.06);ctx.lineWidth=.65;const g=ctx.createLinearGradient(0,y,w,y);g.addColorStop(0,'rgba(121,181,163,.04)');g.addColorStop(.48,'rgba(220,239,232,.15)');g.addColorStop(1,'rgba(121,181,163,.02)');ctx.strokeStyle=g;ctx.beginPath();for(let x=0;x<=w;x+=4){const nx=x/Math.max(1,w),py=y+Math.sin(nx*TAU*1.25-t*TAU)*1.6+Math.sin(nx*TAU*2.1+t*TAU*.6)*.6;if(x===0)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();ctx.restore();
  }

  function drawCheckin(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.28:(elapsed%6.2)/6.2,baseY=h*.74;ctx.save();ctx.globalCompositeOperation='screen';for(let layer=0;layer<2;layer++){ctx.strokeStyle=`rgba(121,190,169,${.045-layer*.012})`;ctx.lineWidth=.55;ctx.beginPath();for(let x=w*.42;x<=w+6;x+=7){const nx=x/w,py=baseY+(layer*5)+Math.sin(nx*TAU*1.7-t*TAU+layer*.8)*2.5;if(x===w*.42)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();}glow(ctx,w*(.55+.4*t),baseY,Math.max(24,w*.12),.035);ctx.restore();
  }

  function draw(surface,time,staticOnly=false){if(surface.type==='hero')drawHero(surface,time,staticOnly);else if(surface.type==='score')drawScore(surface,time,staticOnly);else drawCheckin(surface,time,staticOnly);}
  function drawActive(time,staticOnly=false){
    let active=0;for(const surface of surfaces.values()){
      if(!surface.host.isConnected||surface.host.closest('#main')?.dataset?.garangScreen!=='today'||surface.visible===false)continue;
      draw(surface,time,staticOnly);active++;
    }
    if(active)lastPaint=performance.now();return active;
  }

  function sync(){
    queued=false;ensureStyle();removeStale();const m=main();if(!m||m.dataset.garangScreen!=='today')return;
    const hero=m.querySelector('.gtd3-ripple'),score=m.querySelector('#garangTodayFlow .gtf-state-primary'),checkin=m.querySelector('#garangTodayFlow .gtf-checkin-access');
    makeSurface(hero,'hero');makeSurface(score,'score');makeSurface(checkin,'checkin');
    if(!hero||!score||!checkin){clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,140);}
    m.dataset.garangMotion=reduced()?'reduced':'active';m.dataset.garangMotionQuality=QUALITY;
    const now=performance.now();if(reduced()){drawActive(now,true);stop();}else{drawActive(now,false);schedule();armWatchdog();}
  }
  function tick(time){
    raf=0;if(!todayActive()||reduced())return;if(time-lastFrame>=FRAME_MS){lastFrame=time;drawActive(time,false);}raf=requestAnimationFrame(tick);
  }
  function schedule(){if(raf||reduced()||!todayActive())return;raf=requestAnimationFrame(tick);}
  function armWatchdog(){
    clearTimeout(watchdogTimer);if(reduced()||!todayActive())return;watchdogTimer=setTimeout(()=>{if(reduced()||!todayActive())return;const now=performance.now();if(now-lastPaint>240)drawActive(now,false);schedule();armWatchdog();},IN_APP?120:220);
  }
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;clearTimeout(watchdogTimer);watchdogTimer=0;}
  function queueSync(){if(queued)return;queued=true;setTimeout(sync,16);}
  function lifecycleSync(){queueSync();clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,180);}

  reducedQuery?.addEventListener?.('change',lifecycleSync);
  window.addEventListener('resize',lifecycleSync,{passive:true});
  window.addEventListener('orientationchange',lifecycleSync,{passive:true});
  window.addEventListener('pagehide',()=>{pageSuspended=true;stop();});
  window.addEventListener('pageshow',()=>{pageSuspended=false;lifecycleSync();});
  doc.addEventListener('visibilitychange',()=>{if(!IN_APP&&doc.hidden)stop();else if(!doc.hidden){pageSuspended=false;lifecycleSync();}});
  window.addEventListener('garang:screen-rendered',lifecycleSync);
  window.addEventListener('garang:state-updated',lifecycleSync);
  window.addEventListener('garang:state-hydrated',lifecycleSync);
  window.addEventListener('garang:route-completed',lifecycleSync);
  window.addEventListener('garang:workout-intelligence-rendered',lifecycleSync);

  const api=Object.freeze({version:VERSION,quality:QUALITY,renderer:RENDERER,sync:queueSync,stop,get activeSurfaces(){return [...surfaces.values()].filter(x=>x.host.isConnected).map(x=>x.type);},get reducedMotion(){return reduced();},get inAppBrowser(){return IN_APP;},get lastPaintAt(){return lastPaint;}});
  window.GarangAccumulationMotionV1=api;window.GarangAccumulationMotionV3=api;lifecycleSync();
})();