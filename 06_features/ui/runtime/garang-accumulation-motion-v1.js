/* GARANG Accumulation Motion v4
   Art-directed ink-water motion for Today.
   Reference language: physical water tension + black reflective ripple + Korean restraint.
   Canvas owns pixels only; canonical Today / Coach / check-in state and actions stay untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1?.version === '4.0.0') return;

  const VERSION='4.0.0';
  const QUALITY='ink-water-korean-luxury-v4';
  const RENDERER='canvas2d-art-directed';
  const ART_DIRECTION='ink-water-moon-jar';
  const PALETTE='ink-silver-jade';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const UA=String(navigator.userAgent||'');
  const IN_APP=/Instagram|FBAN|FBAV|Line\/|Twitter|MicroMessenger/i.test(UA);
  const MOBILE=/iPhone|iPad|iPod|Android/i.test(UA)||window.matchMedia?.('(max-width:760px)')?.matches;
  const SAVE_DATA=!!navigator.connection?.saveData;
  const FPS=SAVE_DATA?18:(MOBILE||IN_APP?24:30);
  const FRAME_MS=1000/FPS;
  const MAX_DPR=Math.min(window.devicePixelRatio||1,MOBILE?1.65:1.9);
  const TAU=Math.PI*2;
  const surfaces=new Map();
  let raf=0,lastFrame=0,lastPaint=0,queued=false,retryTimer=0,watchdogTimer=0,pageSuspended=false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const easeIn=t=>Math.pow(clamp(t,0,1),2.4);
  const frac=v=>v-Math.floor(v);
  const seeded=n=>frac(Math.sin(n*12.9898+78.233)*43758.5453);
  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!pageSuspended&&(!doc.hidden||IN_APP);

  function ensureStyle(){
    const old=doc.getElementById('garangAccumulationMotionStyle');
    if(old?.dataset?.garangMotionVersion===VERSION)return;
    old?.remove();
    const style=doc.createElement('style');style.id='garangAccumulationMotionStyle';style.dataset.garangMotionVersion=VERSION;style.textContent=`
#main[data-garang-screen="today"] .gtd3-motion-canvas{position:absolute;inset:0;width:100%;height:100%;display:block!important;pointer-events:none!important;z-index:0;opacity:1;transform:translateZ(0);backface-visibility:hidden}
#main[data-garang-screen="today"] .gtd3-ripple{position:relative;isolation:isolate;overflow:hidden!important;height:100px!important;margin-top:3px!important;background:radial-gradient(ellipse at 50% 67%,rgba(242,239,233,.018),rgba(8,9,8,0) 55%)!important}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gtd3-ripple>.gtd3-motion-canvas{inset:0!important;width:100%!important;height:100%!important}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtd3-motion-canvas{inset:0!important;z-index:0;opacity:.82}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>.gtd3-motion-canvas{inset:0!important;z-index:0;opacity:.48}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gtd3-motion-canvas{opacity:.9}
@media(max-width:600px){#main[data-garang-screen="today"] .gtd3-ripple{height:92px!important;margin-top:2px!important}}
@media(max-width:390px){#main[data-garang-screen="today"] .gtd3-ripple{height:88px!important}}
@media(min-width:760px){#main[data-garang-screen="today"] .gtd3-ripple{height:154px!important}}
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
    const canvas=doc.createElement('canvas');
    canvas.className='gtd3-motion-canvas';
    canvas.dataset.garangMotionSurface=type;
    canvas.dataset.garangMotionQuality=QUALITY;
    canvas.dataset.garangMotionArt=ART_DIRECTION;
    canvas.dataset.garangMotionPalette=PALETTE;
    canvas.setAttribute('aria-hidden','true');
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

  function ellipsePath(ctx,cx,cy,rx,ry,warp=0,phase=0,start=0,end=TAU,steps=96){
    ctx.beginPath();
    for(let i=0;i<=steps;i++){
      const a=start+(end-start)*(i/steps);
      const n=1+warp*Math.sin(a*3.1+phase)+warp*.46*Math.sin(a*5.3-phase*.73)+warp*.22*Math.cos(a*7.2+phase*.41);
      const x=cx+Math.cos(a)*rx*n;
      const y=cy+Math.sin(a)*ry*(2-n*.96);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
  }

  function softGlow(ctx,x,y,rx,ry,alpha,tint='silver'){
    if(alpha<=0)return;
    ctx.save();ctx.translate(x,y);ctx.scale(1,ry/Math.max(1,rx));
    const g=ctx.createRadialGradient(0,0,0,0,0,rx);
    if(tint==='jade'){
      g.addColorStop(0,`rgba(142,190,174,${alpha*.34})`);g.addColorStop(.42,`rgba(84,130,116,${alpha*.14})`);g.addColorStop(1,'rgba(37,57,51,0)');
    }else{
      g.addColorStop(0,`rgba(245,244,239,${alpha*.3})`);g.addColorStop(.38,`rgba(184,191,188,${alpha*.13})`);g.addColorStop(1,'rgba(120,130,126,0)');
    }
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,rx,0,TAU);ctx.fill();ctx.restore();
  }

  function inkPool(ctx,w,h,cx,waterY,energy,variation){
    const pool=ctx.createRadialGradient(cx,waterY,0,cx,waterY,w*.52);
    pool.addColorStop(0,`rgba(220,224,221,${.024+.014*energy})`);
    pool.addColorStop(.18,`rgba(116,126,122,${.018+.01*energy})`);
    pool.addColorStop(.44,'rgba(25,29,27,.012)');
    pool.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=pool;ctx.fillRect(0,waterY-h*.45,w,h*.72);

    ctx.save();ctx.globalCompositeOperation='screen';
    const y=waterY+(variation-.5)*1.4;
    const line=ctx.createLinearGradient(w*.06,y,w*.94,y);
    line.addColorStop(0,'rgba(238,238,233,0)');
    line.addColorStop(.2,'rgba(197,201,198,.025)');
    line.addColorStop(.47,`rgba(241,241,236,${.07+.04*energy})`);
    line.addColorStop(.54,`rgba(134,171,159,${.035+.018*energy})`);
    line.addColorStop(.82,'rgba(203,206,201,.02)');line.addColorStop(1,'rgba(235,235,230,0)');
    ctx.strokeStyle=line;ctx.lineWidth=.62;
    ctx.beginPath();ctx.moveTo(w*.06,y);ctx.quadraticCurveTo(cx,y-1.1-variation*.7,w*.94,y);ctx.stroke();
    ctx.restore();
  }

  function reflectiveDrop(ctx,x,y,r,stretch,alpha,tilt=0){
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.scale(1,stretch);
    const rr=r/Math.max(.9,stretch*.72);
    ctx.shadowColor=`rgba(224,228,224,${alpha*.1})`;ctx.shadowBlur=r*1.65;
    const g=ctx.createRadialGradient(-rr*.31,-rr*.47,rr*.06,rr*.08,rr*.08,rr*1.28);
    g.addColorStop(0,`rgba(252,251,246,${alpha*.92})`);
    g.addColorStop(.11,`rgba(198,204,201,${alpha*.78})`);
    g.addColorStop(.24,`rgba(65,76,72,${alpha*.78})`);
    g.addColorStop(.47,`rgba(8,12,11,${alpha*.96})`);
    g.addColorStop(.73,`rgba(20,28,25,${alpha*.92})`);
    g.addColorStop(.88,`rgba(106,143,131,${alpha*.34})`);
    g.addColorStop(1,'rgba(11,17,15,0)');
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.moveTo(0,-rr*1.46);
    ctx.bezierCurveTo(rr*.15,-rr*1.02,rr*.77,-rr*.5,rr*.84,rr*.24);
    ctx.bezierCurveTo(rr*.9,rr*.82,rr*.45,rr*1.22,0,rr*1.24);
    ctx.bezierCurveTo(-rr*.45,rr*1.22,-rr*.9,rr*.82,-rr*.84,rr*.24);
    ctx.bezierCurveTo(-rr*.77,-rr*.5,-rr*.15,-rr*1.02,0,-rr*1.46);
    ctx.fill();ctx.shadowBlur=0;
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=alpha*.78;ctx.strokeStyle='rgba(248,246,238,.9)';ctx.lineWidth=Math.max(.6,r*.065);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-rr*.37,-rr*.7);ctx.bezierCurveTo(-rr*.53,-rr*.43,-rr*.51,-rr*.06,-rr*.36,rr*.12);ctx.stroke();
    ctx.globalAlpha=alpha*.3;ctx.strokeStyle='rgba(122,176,158,.8)';ctx.lineWidth=Math.max(.45,r*.042);
    ctx.beginPath();ctx.moveTo(rr*.29,-rr*.05);ctx.quadraticCurveTo(rr*.48,rr*.26,rr*.23,rr*.55);ctx.stroke();ctx.restore();
  }

  function reflectiveBowl(ctx,cx,cy,rx,ry,alpha,variation){
    if(alpha<=.002)return;ctx.save();ctx.globalCompositeOperation='screen';softGlow(ctx,cx,cy,rx*.82,ry*2.3,alpha*.42,'silver');
    const g=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);
    g.addColorStop(0,'rgba(235,234,228,0)');g.addColorStop(.17,`rgba(205,207,202,${alpha*.14})`);g.addColorStop(.43,`rgba(246,245,239,${alpha*.64})`);g.addColorStop(.58,`rgba(116,161,146,${alpha*.18})`);g.addColorStop(.83,`rgba(224,225,220,${alpha*.12})`);g.addColorStop(1,'rgba(240,239,233,0)');
    ctx.strokeStyle=g;ctx.lineWidth=.85;ellipsePath(ctx,cx,cy,rx,ry,.015+variation*.004,variation*TAU,Math.PI*.02,Math.PI*.98,60);ctx.stroke();ctx.restore();
  }

  function brokenRipple(ctx,cx,cy,rx,ry,alpha,width,phase,index,variation){
    if(alpha<=.002)return;const warp=.008+index*.0025+variation*.004;ctx.save();ctx.globalCompositeOperation='screen';
    ctx.strokeStyle=`rgba(176,181,178,${alpha*.11})`;ctx.lineWidth=Math.max(.45,width*.7);ellipsePath(ctx,cx,cy,rx,ry,warp,phase,0,TAU,92);ctx.stroke();
    const silver=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);silver.addColorStop(0,'rgba(245,244,238,0)');silver.addColorStop(.25,`rgba(220,221,216,${alpha*.17})`);silver.addColorStop(.55,`rgba(249,248,242,${alpha*.76})`);silver.addColorStop(.82,`rgba(181,185,182,${alpha*.2})`);silver.addColorStop(1,'rgba(245,244,238,0)');
    ctx.strokeStyle=silver;ctx.lineWidth=width;ctx.shadowColor=`rgba(235,235,229,${alpha*.12})`;ctx.shadowBlur=3.2;ellipsePath(ctx,cx,cy,rx,ry,warp,phase,.12*Math.PI+(variation-.5)*.16,.8*Math.PI+index*.035,54);ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle=`rgba(121,174,157,${alpha*.18})`;ctx.lineWidth=Math.max(.45,width*.62);ellipsePath(ctx,cx,cy,rx,ry,warp,phase,1.06*Math.PI+index*.04,1.42*Math.PI+(variation-.5)*.1,28);ctx.stroke();
    ctx.strokeStyle=`rgba(242,241,235,${alpha*.34})`;ctx.lineWidth=Math.max(.42,width*.48);ellipsePath(ctx,cx,cy,rx,ry,warp,phase,1.55*Math.PI+index*.025,1.84*Math.PI+variation*.035,24);ctx.stroke();ctx.restore();
  }

  function impactColumn(ctx,cx,waterY,w,h,pulse,variation){
    if(pulse<=.002)return;const height=h*(.14+.12*pulse),half=Math.max(2,w*(.009+.004*variation));ctx.save();ctx.globalCompositeOperation='screen';
    const g=ctx.createLinearGradient(cx,waterY-height,cx,waterY);g.addColorStop(0,`rgba(248,247,241,${.28*pulse})`);g.addColorStop(.22,`rgba(187,195,190,${.2*pulse})`);g.addColorStop(.55,`rgba(28,39,35,${.08*pulse})`);g.addColorStop(.82,`rgba(115,166,150,${.12*pulse})`);g.addColorStop(1,'rgba(238,238,233,0)');ctx.fillStyle=g;
    ctx.beginPath();ctx.moveTo(cx,waterY-height);ctx.bezierCurveTo(cx+half*.25,waterY-height*.82,cx+half*.8,waterY-height*.3,cx+half,waterY);ctx.lineTo(cx-half,waterY);ctx.bezierCurveTo(cx-half*.8,waterY-height*.3,cx-half*.25,waterY-height*.82,cx,waterY-height);ctx.fill();
    ctx.strokeStyle=`rgba(247,246,240,${.18*pulse})`;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(cx-.6,waterY-height*.84);ctx.quadraticCurveTo(cx-half*.32,waterY-height*.46,cx-half*.22,waterY-height*.2);ctx.stroke();ctx.restore();
  }

  function drawHero(surface,time,staticOnly=false){
    fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;
    const cycle=MOBILE?4.45:4.9,elapsed=Math.max(0,(time-surface.startedAt)/1000),cycleIndex=Math.floor(elapsed/cycle),phase=staticOnly?.64:(elapsed%cycle)/cycle,variation=staticOnly?.43:seeded(cycleIndex+1.7),cx=w*.51+(variation-.5)*w*.035,waterY=h*.67;
    inkPool(ctx,w,h,cx,waterY,phase>.34?1:.35,variation);softGlow(ctx,cx+w*.05,waterY+h*.01,w*.18,h*.2,.028,'silver');
    if(phase<.37){const t=smooth(phase/.37),fall=easeIn(t),y=lerp(h*.05,waterY-h*.105,fall),speed=clamp((t-.18)/.82,0,1),r=Math.max(8.2,Math.min(12.4,w*.0275)),stretch=1+.46*speed;softGlow(ctx,cx,y,r*2.3,r*2.6,.065,'silver');reflectiveDrop(ctx,cx,y,r,stretch,.93,(variation-.5)*.035);reflectiveBowl(ctx,cx,waterY,w*.07,h*.025,.045*t,variation);return;}
    const impactT=clamp((phase-.37)/.14,0,1),pulse=Math.sin(impactT*Math.PI),rippleT=clamp((phase-.37)/.63,0,1);softGlow(ctx,cx,waterY,w*(.085+.08*pulse),h*(.16+.08*pulse),.12*pulse,'silver');softGlow(ctx,cx+w*.025,waterY,w*.1,h*.11,.035*pulse,'jade');reflectiveBowl(ctx,cx,waterY,w*(.055+.045*pulse),h*(.018+.014*pulse),.42*pulse,variation);
    if(phase<.53){const crown=pulse;ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle=`rgba(236,236,230,${.2*crown})`;ctx.lineWidth=.65;const base=w*(.032+.02*impactT),peak=h*(.085+.065*crown);ctx.beginPath();ctx.moveTo(cx-base,waterY);ctx.bezierCurveTo(cx-base*.62,waterY-peak*.12,cx-base*.43,waterY-peak*.42,cx-base*.2,waterY-peak*.16);ctx.quadraticCurveTo(cx,waterY-peak,cx+base*.18,waterY-peak*.18);ctx.bezierCurveTo(cx+base*.45,waterY-peak*.44,cx+base*.68,waterY-peak*.1,cx+base,waterY);ctx.stroke();ctx.restore();impactColumn(ctx,cx+(variation-.5)*1.5,waterY,w,h,crown,variation);}
    for(let i=0;i<5;i++){const delay=i*.092,rt=clamp((rippleT-delay)/(1-delay),0,1);if(rt<=0)continue;const e=easeOut(rt),rx=w*(.045+i*.027)+w*(.33+i*.023)*e,ry=rx*(.175+i*.004),alpha=(.31-i*.041)*Math.pow(1-rt,1.14),xShift=((i%2?1:-1)*(1.2+i*.35))+(variation-.5)*i*1.1;brokenRipple(ctx,cx+xShift,waterY+(i-2)*.28,rx,ry,alpha,i<2?.92:.68,phase*TAU+i*.71,i,variation);}
    if(rippleT>.12&&rippleT<.52){const linger=Math.sin(clamp((rippleT-.12)/.4,0,1)*Math.PI),offset=w*(.07+.11*rippleT);softGlow(ctx,cx-offset,waterY+h*.012,w*.055,h*.06,.027*linger,'jade');}
  }

  function drawScore(surface,time,staticOnly=false){fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.34:(elapsed%6.4)/6.4,y=h*.72,variation=.38;ctx.save();ctx.globalCompositeOperation='screen';const sweep=w*(.04+.92*t);softGlow(ctx,sweep,y,Math.max(10,w*.18),Math.max(6,h*.15),.025,'silver');ctx.strokeStyle='rgba(238,237,231,.075)';ctx.lineWidth=.5;ellipsePath(ctx,w*.5,y,w*.44,h*.08,.008,variation+t*TAU,Math.PI*.04,Math.PI*.96,58);ctx.stroke();ctx.strokeStyle='rgba(121,174,157,.055)';ctx.lineWidth=.45;ellipsePath(ctx,w*.5,y+2,w*.34,h*.055,.012,variation-t*TAU*.7,Math.PI*.1,Math.PI*.84,48);ctx.stroke();ctx.restore();}
  function drawCheckin(surface,time,staticOnly=false){fit(surface);const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);if(w<2||h<2)return;const elapsed=Math.max(0,(time-surface.startedAt)/1000),t=staticOnly?.31:(elapsed%7.2)/7.2,baseY=h*.72;ctx.save();ctx.globalCompositeOperation='screen';ctx.strokeStyle='rgba(235,234,228,.035)';ctx.lineWidth=.5;ctx.beginPath();for(let x=w*.48;x<=w+5;x+=6){const nx=x/Math.max(1,w),py=baseY+Math.sin(nx*TAU*1.08-t*TAU)*1.25+Math.sin(nx*TAU*2.3+t*TAU*.4)*.42;if(x===w*.48)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();ctx.strokeStyle='rgba(121,174,157,.024)';ctx.beginPath();for(let x=w*.56;x<=w+5;x+=7){const nx=x/Math.max(1,w),py=baseY+5+Math.sin(nx*TAU*.96-t*TAU*.83+.7)*1.05;if(x===w*.56)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();softGlow(ctx,w*(.6+.34*t),baseY,Math.max(18,w*.085),Math.max(9,h*.17),.014,'jade');ctx.restore();}
  function draw(surface,time,staticOnly=false){if(surface.type==='hero')drawHero(surface,time,staticOnly);else if(surface.type==='score')drawScore(surface,time,staticOnly);else drawCheckin(surface,time,staticOnly);}
  function drawActive(time,staticOnly=false){let active=0;for(const surface of surfaces.values()){if(!surface.host.isConnected||surface.host.closest('#main')?.dataset?.garangScreen!=='today'||surface.visible===false)continue;draw(surface,time,staticOnly);active++;}if(active)lastPaint=performance.now();return active;}

  function sync(){queued=false;ensureStyle();removeStale();const m=main();if(!m||m.dataset.garangScreen!=='today')return;const hero=m.querySelector('.gtd3-ripple'),score=m.querySelector('#garangTodayFlow .gtf-state-primary'),checkin=m.querySelector('#garangTodayFlow .gtf-checkin-access');makeSurface(hero,'hero');makeSurface(score,'score');makeSurface(checkin,'checkin');if(!hero||!score||!checkin){clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,140);}m.dataset.garangMotion=reduced()?'reduced':'active';m.dataset.garangMotionQuality=QUALITY;m.dataset.garangMotionArt=ART_DIRECTION;m.dataset.garangMotionPalette=PALETTE;const now=performance.now();if(reduced()){drawActive(now,true);stop();}else{drawActive(now,false);schedule();armWatchdog();}}
  function tick(time){raf=0;if(!todayActive()||reduced())return;if(time-lastFrame>=FRAME_MS){lastFrame=time;drawActive(time,false);}raf=requestAnimationFrame(tick);}
  function schedule(){if(raf||reduced()||!todayActive())return;raf=requestAnimationFrame(tick);}
  function armWatchdog(){clearTimeout(watchdogTimer);if(reduced()||!todayActive())return;watchdogTimer=setTimeout(()=>{if(reduced()||!todayActive())return;const now=performance.now();if(now-lastPaint>240)drawActive(now,false);schedule();armWatchdog();},IN_APP?120:220);}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;clearTimeout(watchdogTimer);watchdogTimer=0;}
  function queueSync(){if(queued)return;queued=true;setTimeout(sync,16);}
  function lifecycleSync(){queueSync();clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,180);}

  reducedQuery?.addEventListener?.('change',lifecycleSync);window.addEventListener('resize',lifecycleSync,{passive:true});window.addEventListener('orientationchange',lifecycleSync,{passive:true});window.addEventListener('pagehide',()=>{pageSuspended=true;stop();});window.addEventListener('pageshow',()=>{pageSuspended=false;lifecycleSync();});window.addEventListener('visibilitychange',()=>{if(doc.hidden&&!IN_APP)stop();else lifecycleSync();});window.addEventListener('garang:screen-rendered',lifecycleSync);window.addEventListener('garang:state-updated',lifecycleSync);window.addEventListener('garang:state-hydrated',lifecycleSync);window.addEventListener('garang:route-completed',lifecycleSync);window.addEventListener('garang:workout-intelligence-rendered',lifecycleSync);

  const api=Object.freeze({version:VERSION,quality:QUALITY,renderer:RENDERER,artDirection:ART_DIRECTION,palette:PALETTE,sync:queueSync,stop,get activeSurfaces(){return [...surfaces.values()].filter(x=>x.host.isConnected).map(x=>x.type);},get reducedMotion(){return reduced();},get inAppBrowser(){return IN_APP;},get lastPaintAt(){return lastPaint;}});
  window.GarangAccumulationMotionV1=api;window.GarangAccumulationMotionV4=api;lifecycleSync();
})();