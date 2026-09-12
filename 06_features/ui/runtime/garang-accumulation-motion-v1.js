/* GARANG Accumulation Motion v4 — Ink Water
   Reference direction: real water tension + near-black reflective rings + Korean restraint.
   One action becomes one drop. Repetition becomes a ripple. The remaining trace becomes accumulation.
   Canvas owns pixels only; canonical Today / Coach / check-in state and actions remain untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1?.version === '4.0.0') return;

  const VERSION='4.0.0';
  const QUALITY='ink-water-v4';
  const RENDERER='canvas2d-ink-water';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const UA=String(navigator.userAgent||'');
  const IN_APP=/Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(UA);
  const MOBILE=/iPhone|iPad|iPod|Android/i.test(UA)||window.matchMedia?.('(max-width:760px)')?.matches;
  const SAVE_DATA=!!navigator.connection?.saveData;
  const FPS=SAVE_DATA?18:(MOBILE||IN_APP?24:30);
  const FRAME_MS=1000/FPS;
  const MAX_DPR=Math.min(window.devicePixelRatio||1,MOBILE?1.55:1.8);
  const TAU=Math.PI*2;
  const surfaces=new Map();
  let raf=0,lastFrame=0,lastPaint=0,queued=false,retryTimer=0,watchdogTimer=0,pageSuspended=false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const easeIn=t=>Math.pow(clamp(t,0,1),3);
  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!pageSuspended&&(!doc.hidden||IN_APP);
  const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x);};

  function ensureStyle(){
    const old=doc.getElementById('garangAccumulationMotionStyle');
    if(old?.dataset?.garangMotionVersion===VERSION)return;
    old?.remove();
    const style=doc.createElement('style');style.id='garangAccumulationMotionStyle';style.dataset.garangMotionVersion=VERSION;style.textContent=`
#main[data-garang-screen="today"] .gtd3-motion-canvas{position:absolute;inset:0;width:100%;height:100%;display:block!important;pointer-events:none!important;z-index:0;opacity:1;transform:translateZ(0);backface-visibility:hidden}
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;isolation:isolate;overflow:hidden!important;background:radial-gradient(ellipse at 52% 70%,rgba(241,237,228,.012),transparent 36%),linear-gradient(180deg,rgba(0,0,0,0),rgba(2,3,3,.32) 72%,rgba(0,0,0,.2))}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gtd3-ripple>.gtd3-motion-canvas{inset:0!important;width:100%!important;height:100%!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtd3-motion-canvas{inset:-8% -10%!important;width:120%!important;height:116%!important;z-index:0;opacity:.72}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access{position:relative!important;isolation:isolate;overflow:hidden!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>.gtd3-motion-canvas{inset:0!important;z-index:0;opacity:.5}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gtd3-motion-canvas{opacity:.72}
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
    surface.texture=null;
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
    const surface={host,canvas,ctx,type,w:0,h:0,dpr:1,visible:true,startedAt:performance.now(),observer:null,texture:null};
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

  function buildTexture(surface){
    if(surface.texture)return surface.texture;
    const c=doc.createElement('canvas'),size=64;c.width=size;c.height=size;const cx=c.getContext('2d',{alpha:true});if(!cx)return null;
    const image=cx.createImageData(size,size),data=image.data;
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      const i=(y*size+x)*4,n=(Math.sin(x*.91+y*1.37)+Math.sin(x*.31-y*.73)+Math.sin((x+y)*.17))*0.333;
      const v=Math.round(128+n*26);data[i]=v;data[i+1]=v;data[i+2]=v;data[i+3]=18;
    }
    cx.putImageData(image,0,0);surface.texture=c;return c;
  }

  function inkHaze(surface,alpha=.12){
    const {ctx,w,h}=surface,texture=buildTexture(surface);if(!texture)return;
    ctx.save();ctx.globalAlpha=alpha;ctx.globalCompositeOperation='soft-light';const pattern=ctx.createPattern(texture,'repeat');if(pattern){ctx.fillStyle=pattern;ctx.fillRect(0,0,w,h);}ctx.restore();
  }

  function softGlow(ctx,x,y,rx,ry,alpha,warm=true){
    if(rx<=0||ry<=0||alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.scale(1,ry/rx);const g=ctx.createRadialGradient(0,0,0,0,0,rx);g.addColorStop(0,warm?`rgba(242,239,233,${alpha})`:`rgba(120,170,153,${alpha})`);g.addColorStop(.28,warm?`rgba(218,222,218,${alpha*.32})`:`rgba(97,148,132,${alpha*.28})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();
  }

  function reflectedArc(ctx,cx,cy,rx,ry,start,end,alpha,width=1,teal=0){
    if(alpha<=.002)return;ctx.save();ctx.lineCap='round';ctx.lineWidth=width;const g=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);g.addColorStop(0,`rgba(242,239,233,${alpha*.04})`);g.addColorStop(.22,`rgba(242,239,233,${alpha*.26})`);g.addColorStop(.5,`rgba(247,245,238,${alpha})`);g.addColorStop(.73,`rgba(${teal?120:235},${teal?170:236},${teal?153:231},${alpha*(teal ? .42 : .5)})`);g.addColorStop(1,`rgba(242,239,233,${alpha*.03})`);ctx.strokeStyle=g;ctx.shadowColor=`rgba(242,239,233,${alpha*.2})`;ctx.shadowBlur=width*2.4;ctx.beginPath();ctx.ellipse(cx,cy,rx,ry,0,start,end);ctx.stroke();ctx.restore();
  }

  function imperfectRipple(ctx,cx,cy,rx,ry,alpha,width,phase,seed){
    if(alpha<=.002)return;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=width;ctx.globalCompositeOperation='screen';
    const seg=116,start=-Math.PI*.94,end=Math.PI*.94;let drawing=false;ctx.beginPath();
    for(let i=0;i<=seg;i++){
      const p=i/seg,a=start+(end-start)*p,breakWave=Math.sin(a*2.2+seed*7.1)+Math.sin(a*4.6-seed*4.3);
      const visible=breakWave>-1.46||p>.32&&p<.68;
      const n=1+.011*Math.sin(a*3+phase+seed*3.1)+.006*Math.sin(a*7-phase*.7);
      const x=cx+Math.cos(a)*rx*n+(seed-.5)*1.7,y=cy+Math.sin(a)*ry*(2-n);
      if(!visible){drawing=false;continue;}if(!drawing){ctx.moveTo(x,y);drawing=true;}else ctx.lineTo(x,y);
    }
    const g=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);g.addColorStop(0,`rgba(242,239,233,${alpha*.03})`);g.addColorStop(.18,`rgba(242,239,233,${alpha*.22})`);g.addColorStop(.42,`rgba(248,247,243,${alpha*.9})`);g.addColorStop(.63,`rgba(242,239,233,${alpha*.48})`);g.addColorStop(.76,`rgba(120,170,153,${alpha*.11})`);g.addColorStop(1,`rgba(242,239,233,${alpha*.02})`);ctx.strokeStyle=g;ctx.shadowColor=`rgba(242,239,233,${alpha*.16})`;ctx.shadowBlur=3;ctx.stroke();ctx.restore();
  }

  function droplet(ctx,x,y,r,stretch,alpha,seed){
    ctx.save();ctx.translate(x,y);ctx.scale(1,stretch);const rr=r/Math.max(1,stretch*.72);
    ctx.globalCompositeOperation='screen';softGlow(ctx,0,rr*.24,rr*2.2,rr*1.7,alpha*.035,true);ctx.globalCompositeOperation='source-over';
    const g=ctx.createRadialGradient(-rr*.3,-rr*.5,rr*.03,rr*.08,rr*.08,rr*1.4);g.addColorStop(0,`rgba(255,255,252,${alpha*.9})`);g.addColorStop(.08,`rgba(224,229,225,${alpha*.42})`);g.addColorStop(.24,`rgba(82,90,88,${alpha*.22})`);g.addColorStop(.58,`rgba(5,8,8,${alpha*.78})`);g.addColorStop(.83,`rgba(16,24,23,${alpha*.82})`);g.addColorStop(1,`rgba(120,170,153,${alpha*.035})`);ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(0,-rr*1.34);ctx.bezierCurveTo(rr*(.16+seed*.04),-rr*.96,rr*.86,-rr*.35,rr*.79,rr*.34);ctx.bezierCurveTo(rr*.72,rr*.92,rr*.34,rr*1.12,0,rr*1.17);ctx.bezierCurveTo(-rr*.36,rr*1.11,-rr*.73,rr*.91,-rr*.8,rr*.33);ctx.bezierCurveTo(-rr*.86,-rr*.35,-rr*(.16+seed*.03),-rr*.96,0,-rr*1.34);ctx.fill();
    ctx.strokeStyle=`rgba(246,244,238,${alpha*.75})`;ctx.lineWidth=Math.max(.55,r*.055);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-rr*.38,-rr*.62);ctx.quadraticCurveTo(-rr*.55,-rr*.2,-rr*.4,rr*.06);ctx.stroke();
    ctx.strokeStyle=`rgba(120,170,153,${alpha*.16})`;ctx.beginPath();ctx.moveTo(rr*.18,rr*.55);ctx.quadraticCurveTo(rr*.48,rr*.45,rr*.56,rr*.18);ctx.stroke();ctx.restore();
  }

  function waterPlane(surface,cx,waterY,energy){
    const {ctx,w,h}=surface;const pool=ctx.createRadialGradient(cx,waterY,0,cx,waterY,w*.62);pool.addColorStop(0,`rgba(242,239,233,${.015+.008*energy})`);pool.addColorStop(.24,`rgba(27,31,30,${.18+.05*energy})`);pool.addColorStop(.58,'rgba(6,8,8,.08)');pool.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=pool;ctx.fillRect(0,waterY-h*.28,w,h*.58);
    reflectedArc(ctx,cx,waterY,w*.36,h*.018,-Math.PI*.96,-Math.PI*.04,.08+.035*energy,.65,0);
    reflectedArc(ctx,cx,waterY+1,w*.21,h*.009,.08*Math.PI,.92*Math.PI,.055+.02*energy,.55,1);
  }

  function drawImpact(ctx,cx,waterY,w,h,pulse,seed){
    if(pulse<=.002)return;ctx.save();ctx.globalCompositeOperation='screen';softGlow(ctx,cx,waterY,w*.09,h*.09,pulse*.055,true);
    const base=w*(.026+.02*pulse),peak=h*(.07+.055*pulse);ctx.strokeStyle=`rgba(246,244,238,${.42*pulse})`;ctx.lineWidth=.72;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(cx-base,waterY);ctx.quadraticCurveTo(cx-base*.58,waterY-peak*.24,cx-base*.22,waterY-peak*.12);ctx.quadraticCurveTo(cx+(seed-.5)*2,waterY-peak,cx+base*.2,waterY-peak*.13);ctx.quadraticCurveTo(cx+base*.58,waterY-peak*.24,cx+base,waterY);ctx.stroke();ctx.restore();
  }

  function drawJet(ctx,cx,waterY,w,h,t,seed){
    if(t<=0||t>=1)return;const p=Math.sin(t*Math.PI),jh=h*.155*p,jw=Math.max(1.6,w*.0085);ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createLinearGradient(cx,waterY-jh,cx,waterY);g.addColorStop(0,`rgba(248,247,243,${.28*p})`);g.addColorStop(.45,`rgba(214,220,216,${.15*p})`);g.addColorStop(.76,`rgba(120,170,153,${.045*p})`);g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx+(seed-.5)*1.2,waterY-jh);ctx.bezierCurveTo(cx+jw*.25,waterY-jh*.72,cx+jw,waterY-jh*.22,cx+jw*.65,waterY);ctx.lineTo(cx-jw*.65,waterY);ctx.bezierCurveTo(cx-jw,waterY-jh*.22,cx-jw*.25,waterY-jh*.72,cx+(seed-.5)*1.2,waterY-jh);ctx.fill();ctx.restore();
  }

  function cycleState(surface,time,staticOnly=false){
    const baseCycle=MOBILE?5.15:5.65,elapsed=Math.max(0,(time-surface.startedAt)/1000),index=Math.floor(elapsed/baseCycle),seed=hash(index+surface.type.length*13.1),variation=(seed-.5)*.5,cycle=baseCycle+variation,local=staticOnly?cycle*.61:(elapsed-(index*baseCycle));return {phase:clamp(local/cycle,0,1),seed,index};
  }

  function drawHero(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;inkHaze(surface,.055);
    const {phase,seed}=cycleState(surface,time,staticOnly),cx=w*(.5+(seed-.5)*.018),waterY=h*.69;
    waterPlane(surface,cx,waterY,phase>.38?1:.35);
    const holdIn=.1,dropEnd=.38,impactEnd=.5,rippleEnd=.9;
    if(phase<dropEnd){
      const raw=clamp((phase-holdIn)/(dropEnd-holdIn),0,1),t=easeIn(raw),y=lerp(h*.06,waterY-h*.08,t),speed=clamp((raw-.08)/.92,0,1),r=Math.max(7.8,Math.min(12.8,w*.028)),stretch=1+.48*speed;droplet(ctx,cx,y,r,stretch,.93,seed);
    }else{
      const impact=clamp((phase-dropEnd)/(impactEnd-dropEnd),0,1),ripple=clamp((phase-dropEnd)/(rippleEnd-dropEnd),0,1),pulse=Math.sin(impact*Math.PI);drawImpact(ctx,cx,waterY,w,h,pulse,seed);drawJet(ctx,cx,waterY,w,h,clamp((phase-dropEnd)/.22,0,1),seed);
      for(let i=0;i<5;i++){
        const delay=i*.095,rt=clamp((ripple-delay)/(1-delay),0,1);if(rt<=0)continue;const e=easeOut(rt),rx=w*(.045+i*.028)+w*(.37+i*.02)*e,ry=rx*(.16+i*.004),alpha=(.24-i*.032)*Math.pow(1-rt,1.17);imperfectRipple(ctx,cx,waterY+(i-2)*.32,rx,ry,alpha,i===0?.95:.72,phase*TAU+i*.77,hash(seed*100+i));
      }
      const traceT=clamp((phase-.66)/.34,0,1),traceAlpha=.075*(1-smooth(traceT));if(traceAlpha>0)imperfectRipple(ctx,cx,waterY,w*.43,h*.072,traceAlpha,.58,phase*2.1,seed+.4);
    }
    const stillness=clamp((phase-.88)/.12,0,1);if(stillness>0)reflectedArc(ctx,cx,waterY,w*.27,h*.012,-Math.PI*.92,-Math.PI*.16,.035*(1-stillness*.45),.5,0);
  }

  function drawScore(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;inkHaze(surface,.025);
    const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.42:(elapsed%7.4)/7.4,cx=w*.5,cy=h*.7,breathe=.5+.5*Math.sin(t*TAU);
    reflectedArc(ctx,cx,cy,w*(.31+.012*breathe),h*(.055+.004*breathe),-Math.PI*.92,-Math.PI*.08,.055+.018*breathe,.52,0);
    reflectedArc(ctx,cx,cy+1,w*(.19+.009*breathe),h*(.033+.003*breathe),.1*Math.PI,.9*Math.PI,.026+.01*breathe,.45,1);
    softGlow(ctx,cx+w*(t-.5)*.12,cy,w*.17,h*.15,.018,true);
  }

  function drawCheckin(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.3:(elapsed%8.6)/8.6,cx=w*.76,cy=h*.78,breathe=.5+.5*Math.sin(t*TAU);
    reflectedArc(ctx,cx,cy,w*.22,h*.12,-Math.PI*.92,-Math.PI*.16,.025+.012*breathe,.48,0);
    reflectedArc(ctx,cx+w*.02,cy+2,w*.15,h*.08,.16*Math.PI,.85*Math.PI,.016+.006*breathe,.42,1);
  }

  function draw(surface,time,staticOnly=false){if(surface.type==='hero')drawHero(surface,time,staticOnly);else if(surface.type==='score')drawScore(surface,time,staticOnly);else drawCheckin(surface,time,staticOnly);}
  function drawActive(time,staticOnly=false){let active=0;for(const surface of surfaces.values()){if(!surface.host.isConnected||surface.host.closest('#main')?.dataset?.garangScreen!=='today'||surface.visible===false)continue;draw(surface,time,staticOnly);active++;}if(active)lastPaint=performance.now();return active;}

  function sync(){
    queued=false;ensureStyle();removeStale();const m=main();if(!m||m.dataset.garangScreen!=='today')return;
    const hero=m.querySelector('.gtd3-ripple'),score=m.querySelector('#garangTodayFlow .gtf-state-primary'),checkin=m.querySelector('#garangTodayFlow .gtf-checkin-access');
    makeSurface(hero,'hero');makeSurface(score,'score');makeSurface(checkin,'checkin');
    if(!hero||!score||!checkin){clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,140);}
    m.dataset.garangMotion=reduced()?'reduced':'active';m.dataset.garangMotionQuality=QUALITY;m.dataset.garangMotionRenderer=RENDERER;
    const now=performance.now();if(reduced()){drawActive(now,true);stop();}else{drawActive(now,false);schedule();armWatchdog();}
  }
  function tick(time){raf=0;if(!todayActive()||reduced())return;if(time-lastFrame>=FRAME_MS){lastFrame=time;drawActive(time,false);}raf=requestAnimationFrame(tick);}
  function schedule(){if(raf||reduced()||!todayActive())return;raf=requestAnimationFrame(tick);}
  function armWatchdog(){clearTimeout(watchdogTimer);if(reduced()||!todayActive())return;watchdogTimer=setTimeout(()=>{if(reduced()||!todayActive())return;const now=performance.now();if(now-lastPaint>260)drawActive(now,false);schedule();armWatchdog();},IN_APP?120:240);}
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
  window.GarangAccumulationMotionV1=api;window.GarangAccumulationMotionV3=api;window.GarangAccumulationMotionV4=api;lifecycleSync();
})();