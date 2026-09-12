/* GARANG Accumulation Motion v1
   Brand motion system for Today.
   Canvas owns motion only; canonical Today/Coach/check-in state and actions remain untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1) return;

  const VERSION='1.0.0';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const SAVE_DATA=!!navigator.connection?.saveData;
  const MAX_DPR=Math.min(window.devicePixelRatio||1,1.75);
  const FPS=SAVE_DATA?18:30;
  const FRAME_MS=1000/FPS;
  const surfaces=new Map();
  let raf=0,lastFrame=0,queued=false;

  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const easeInOut=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
  const seeded=(seed)=>{const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!doc.hidden;

  function ensureStyle(){
    if(doc.getElementById('garangAccumulationMotionStyle'))return;
    const style=doc.createElement('style');
    style.id='garangAccumulationMotionStyle';
    style.textContent=`
#main[data-garang-screen="today"] .gtd3-ripple{isolation:isolate;overflow:hidden!important;min-height:126px}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gtd3-motion-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0}
#main[data-garang-screen="today"] .gtd3-ripple .gtd3-motion-canvas{inset:-8% -8% -12% -16%;width:124%;height:120%}
#main[data-garang-screen="today"] .gtd3-ripple small{z-index:2}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtd3-motion-canvas{inset:-14px;z-index:0}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtf-state-visual,
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtf-signal,
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access{position:relative!important;overflow:hidden!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>.gtd3-motion-canvas{inset:0;z-index:0;opacity:.9}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gtd3-motion-canvas{opacity:.78}
@media(prefers-reduced-motion:reduce){#main[data-garang-screen="today"] .gtd3-motion-canvas{filter:none!important}}
`;
    doc.head.appendChild(style);
  }

  function fit(surface){
    const rect=surface.host.getBoundingClientRect();
    const w=Math.max(1,Math.round(rect.width));
    const h=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(MAX_DPR,Math.max(1,window.devicePixelRatio||1));
    if(surface.w===w&&surface.h===h&&surface.dpr===dpr)return false;
    surface.w=w;surface.h=h;surface.dpr=dpr;
    surface.canvas.width=Math.max(1,Math.round(w*dpr));
    surface.canvas.height=Math.max(1,Math.round(h*dpr));
    surface.canvas.style.width=`${w}px`;
    surface.canvas.style.height=`${h}px`;
    surface.ctx.setTransform(dpr,0,0,dpr,0,0);
    return true;
  }

  function makeSurface(host,type){
    if(!host)return null;
    const existing=surfaces.get(host);
    if(existing){existing.type=type;fit(existing);return existing;}
    const canvas=doc.createElement('canvas');
    canvas.className='gtd3-motion-canvas';
    canvas.dataset.garangMotionSurface=type;
    canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
    if(!ctx)return null;
    host.appendChild(canvas);
    const surface={host,canvas,ctx,type,w:0,h:0,dpr:1,visible:true,seed:Math.random()*9999,observer:null};
    fit(surface);
    if('IntersectionObserver'in window){
      surface.observer=new IntersectionObserver(entries=>{
        for(const entry of entries)if(entry.target===host)surface.visible=entry.isIntersecting&&entry.intersectionRatio>.01;
        schedule();
      },{rootMargin:'80px 0px',threshold:[0,.01,.15]});
      surface.observer.observe(host);
    }
    surfaces.set(host,surface);
    return surface;
  }

  function removeStale(){
    for(const [host,surface] of surfaces){
      if(host.isConnected)continue;
      surface.observer?.disconnect();
      surfaces.delete(host);
    }
  }

  function softGlow(ctx,x,y,r,alpha){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,`rgba(135,205,183,${alpha})`);
    g.addColorStop(.28,`rgba(86,162,141,${alpha*.55})`);
    g.addColorStop(1,'rgba(22,71,59,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  }

  function ellipseRing(ctx,cx,cy,rx,ry,alpha,width,phase=0){
    ctx.save();ctx.translate(cx,cy);ctx.rotate(phase);
    ctx.strokeStyle=`rgba(145,210,190,${alpha})`;ctx.lineWidth=width;
    ctx.beginPath();ctx.ellipse(0,0,Math.max(.1,rx),Math.max(.1,ry),0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  function drawHero(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);
    const seed=surface.seed;
    const cycle=4.35+seeded(seed)*1.15;
    const now=staticOnly?cycle*.66:(time/1000+seeded(seed+3)*cycle)%cycle;
    const impact=cycle*.43;
    const cx=w*.52,waterY=h*.73;
    const ambient=ctx.createLinearGradient(0,0,w,h);
    ambient.addColorStop(0,'rgba(9,31,26,0)');ambient.addColorStop(.48,'rgba(18,62,52,.12)');ambient.addColorStop(1,'rgba(92,171,147,.055)');
    ctx.fillStyle=ambient;ctx.fillRect(0,0,w,h);softGlow(ctx,cx,waterY,w*.46,.055);
    const plane=ctx.createRadialGradient(cx,waterY,4,cx,waterY,w*.6);
    plane.addColorStop(0,'rgba(136,210,188,.11)');plane.addColorStop(.45,'rgba(81,154,134,.04)');plane.addColorStop(1,'rgba(5,14,12,0)');
    ctx.fillStyle=plane;ctx.beginPath();ctx.ellipse(cx,waterY,w*.62,h*.18,0,0,Math.PI*2);ctx.fill();

    if(now<impact){
      const t=clamp(now/impact,0,1),y=-h*.12+(waterY+h*.03)*easeInOut(t),stretch=1+Math.sin(t*Math.PI)*.55,r=Math.max(2.2,w*.025);
      ctx.save();ctx.translate(cx,y);ctx.scale(1/stretch,stretch);
      const drop=ctx.createRadialGradient(-r*.2,-r*.35,r*.08,0,0,r*1.25);
      drop.addColorStop(0,'rgba(232,255,248,.8)');drop.addColorStop(.22,'rgba(135,215,191,.68)');drop.addColorStop(.58,'rgba(63,145,123,.38)');drop.addColorStop(1,'rgba(26,79,65,.04)');
      ctx.fillStyle=drop;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.restore();softGlow(ctx,cx,y,r*3,.12*(1-t*.4));
    }

    if(now>=impact){
      const t=clamp((now-impact)/(cycle-impact),0,1),hit=Math.exp(-Math.pow(t-.055,2)/.0024);
      softGlow(ctx,cx,waterY,w*(.18+.14*t),.11*(1-t)+.02);
      if(hit>.02){ctx.fillStyle=`rgba(188,236,220,${.18*hit})`;ctx.beginPath();ctx.ellipse(cx,waterY,w*.06*(1+hit),h*.018*(1-hit*.3),0,0,Math.PI*2);ctx.fill();}
      for(let i=0;i<5;i++){
        const delay=i*.105,rt=clamp((t-delay)/(1-delay),0,1);if(rt<=0)continue;
        const eased=easeOut(rt),jitter=(seeded(seed+i*9)-.5)*.035,maxRx=w*(.16+i*.075+jitter),rx=6+maxRx*eased,ry=rx*(.245+(seeded(seed+i*4)-.5)*.018);
        const alpha=(.18-i*.023)*(1-rt)*(.78+.22*Math.sin((rt+i*.21)*Math.PI));
        ellipseRing(ctx,cx+(seeded(seed+i)-.5)*2.4,waterY+(seeded(seed+i+2)-.5)*1.5,rx,ry,Math.max(0,alpha),i===0?.9:.55,(seeded(seed+i+11)-.5)*.015);
      }
      for(let i=0;i<3;i++){
        const drift=((time/1000)*(7+i*2)+seeded(seed+i)*70)%(w*.82);
        ctx.strokeStyle=`rgba(120,187,167,${.016+i*.006})`;ctx.lineWidth=.55;
        ctx.beginPath();ctx.ellipse(cx,waterY+i*3,w*.22+drift*.22,h*(.028+i*.012),0,0,Math.PI*2);ctx.stroke();
      }
    }
  }

  function drawScore(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);
    const t=staticOnly?.45:(time/1000+surface.seed)%5.2/5.2,breath=(Math.sin(t*Math.PI*2-Math.PI/2)+1)/2,cx=w/2,cy=h/2;
    softGlow(ctx,cx,cy,Math.min(w,h)*(.45+.04*breath),.035+.022*breath);
    for(let i=0;i<3;i++){const p=(t+i*.29)%1,r=Math.min(w,h)*(.31+.17*p);ellipseRing(ctx,cx,cy,r,r,.055*(1-p),.5,0);}
  }

  function drawCheckin(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);
    const t=staticOnly?.52:(time/1000+surface.seed*.1)%6.4/6.4,cx=w*.92,cy=h*.52;
    const glow=ctx.createRadialGradient(cx,cy,0,cx,cy,w*.42);
    glow.addColorStop(0,'rgba(104,184,160,.075)');glow.addColorStop(.45,'rgba(62,127,109,.028)');glow.addColorStop(1,'rgba(13,31,27,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(let i=0;i<4;i++){const p=(t+i*.19)%1,rx=w*(.07+.34*p),ry=h*(.1+.38*p);ellipseRing(ctx,cx,cy,rx,ry,.048*(1-p),.5,(i-1.5)*.012);}
  }

  function draw(surface,time,staticOnly=false){fit(surface);if(surface.type==='hero')drawHero(surface,time,staticOnly);else if(surface.type==='score')drawScore(surface,time,staticOnly);else drawCheckin(surface,time,staticOnly);}

  function sync(){
    queued=false;ensureStyle();removeStale();
    const m=main();if(!m||m.dataset.garangScreen!=='today')return;
    makeSurface(m.querySelector('.gtd3-ripple'),'hero');
    makeSurface(m.querySelector('#garangTodayFlow .gtf-state-primary'),'score');
    makeSurface(m.querySelector('#garangTodayFlow .gtf-checkin-access'),'checkin');
    m.dataset.garangMotion=reduced()?'reduced':'active';
    if(reduced()){for(const surface of surfaces.values())if(surface.host.isConnected)draw(surface,0,true);stop();}else schedule();
  }

  function tick(time){
    raf=0;if(!todayActive()||reduced())return;
    if(time-lastFrame<FRAME_MS){raf=requestAnimationFrame(tick);return;}lastFrame=time;
    let active=0;
    for(const surface of surfaces.values()){
      if(!surface.host.isConnected||surface.host.closest('#main')?.dataset?.garangScreen!=='today'||surface.visible===false)continue;
      draw(surface,time,false);active++;
    }
    if(active)raf=requestAnimationFrame(tick);
  }
  function schedule(){if(raf||reduced()||!todayActive())return;raf=requestAnimationFrame(tick);}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}
  function queueSync(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync));}

  reducedQuery?.addEventListener?.('change',queueSync);
  window.addEventListener('resize',queueSync,{passive:true});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();else queueSync();});
  window.addEventListener('pageshow',queueSync);
  window.addEventListener('garang:screen-rendered',queueSync);
  window.addEventListener('garang:state-updated',queueSync);
  window.addEventListener('garang:state-hydrated',queueSync);
  window.addEventListener('garang:route-completed',queueSync);
  window.addEventListener('garang:workout-intelligence-rendered',queueSync);

  window.GarangAccumulationMotionV1=Object.freeze({version:VERSION,sync:queueSync,stop,get activeSurfaces(){return [...surfaces.values()].filter(x=>x.host.isConnected).map(x=>x.type);},get reducedMotion(){return reduced();}});
  queueSync();
})();
