/* GARANG Accumulation Motion v2
   Premium fluid brand motion for Today.
   Motion is visual-only: canonical Today/Coach/check-in state and actions remain untouched.
*/
(() => {
  'use strict';
  if (window.GarangAccumulationMotionV1?.version === '2.0.0') return;

  const VERSION='2.0.0';
  const QUALITY='fluid-v2';
  const doc=document;
  const main=()=>doc.getElementById('main');
  const reducedQuery=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const SAVE_DATA=!!navigator.connection?.saveData;
  const LOW_POWER=SAVE_DATA||Number(navigator.deviceMemory||8)<=2;
  const MAX_DPR=Math.min(window.devicePixelRatio||1,LOW_POWER?1.35:1.65);
  const FPS=LOW_POWER?20:30;
  const FRAME_MS=1000/FPS;
  const surfaces=new Map();
  let raf=0,lastFrame=0,queued=false,retryTimer=0;

  const TAU=Math.PI*2;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const smoother=t=>{t=clamp(t,0,1);return t*t*t*(t*(t*6-15)+10);};
  const easeOut=t=>1-Math.pow(1-clamp(t,0,1),3);
  const seeded=seed=>{const x=Math.sin(seed*12.9898+78.233)*43758.5453;return x-Math.floor(x);};
  const reduced=()=>!!reducedQuery?.matches;
  const todayActive=()=>main()?.dataset?.garangScreen==='today'&&!doc.hidden;

  function ensureStyle(){
    if(doc.getElementById('garangAccumulationMotionStyle'))return;
    const style=doc.createElement('style');
    style.id='garangAccumulationMotionStyle';
    style.textContent=`
#main[data-garang-screen="today"] .gtd3-ripple{isolation:isolate;overflow:hidden!important;min-height:126px;background:radial-gradient(ellipse at 58% 74%,rgba(62,110,96,.045),transparent 58%)}
#main[data-garang-screen="today"] .gtd3-ripple>img{display:none!important;visibility:hidden!important;opacity:0!important}
#main[data-garang-screen="today"] .gtd3-motion-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0;contain:strict}
#main[data-garang-screen="today"] .gtd3-ripple .gtd3-motion-canvas{inset:-10% -8% -13% -18%;width:126%;height:123%}
#main[data-garang-screen="today"] .gtd3-ripple small{position:relative;z-index:2}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary{position:relative!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtd3-motion-canvas{inset:-15px;z-index:0;opacity:.96}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtf-state-visual,
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>.gtf-signal,
#main[data-garang-screen="today"] #garangTodayFlow .gtf-state-primary>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access{position:relative!important;overflow:hidden!important;isolation:isolate}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>.gtd3-motion-canvas{inset:0;z-index:0;opacity:.92}
#main[data-garang-screen="today"] #garangTodayFlow .gtf-checkin-access>*:not(.gtd3-motion-canvas){position:relative;z-index:1}
#main[data-garang-screen="today"][data-garang-motion="reduced"] .gtd3-motion-canvas{opacity:.82}
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
    if(existing){
      existing.type=type;
      if(!existing.canvas.isConnected||existing.canvas.parentElement!==host)host.appendChild(existing.canvas);
      fit(existing);
      return existing;
    }
    const canvas=doc.createElement('canvas');
    canvas.className='gtd3-motion-canvas';
    canvas.dataset.garangMotionSurface=type;
    canvas.dataset.garangMotionQuality=QUALITY;
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
      },{rootMargin:'120px 0px',threshold:[0,.01,.2]});
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

  function withScreen(ctx,fn){ctx.save();ctx.globalCompositeOperation='screen';fn();ctx.restore();}
  function withLighter(ctx,fn){ctx.save();ctx.globalCompositeOperation='lighter';fn();ctx.restore();}

  function radialGlow(ctx,x,y,r,alpha=1,warm=false){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    if(warm){
      g.addColorStop(0,`rgba(235,240,235,${alpha*.22})`);
      g.addColorStop(.26,`rgba(174,216,203,${alpha*.16})`);
      g.addColorStop(.64,`rgba(74,134,116,${alpha*.065})`);
    }else{
      g.addColorStop(0,`rgba(178,231,215,${alpha*.18})`);
      g.addColorStop(.34,`rgba(96,178,154,${alpha*.09})`);
    }
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fill();
  }

  function deformedEllipsePath(ctx,cx,cy,rx,ry,seed,phase=0,rough=.018,segments=84){
    ctx.beginPath();
    const a1=seeded(seed+2)*TAU,a2=seeded(seed+9)*TAU,a3=seeded(seed+17)*TAU;
    for(let i=0;i<=segments;i++){
      const a=i/segments*TAU;
      const n=1+Math.sin(a*2+a1)*rough*.55+Math.sin(a*3+a2)*rough*.28+Math.sin(a*5+a3)*rough*.17;
      const drift=Math.sin(a+phase)*rough*.32;
      const x=cx+Math.cos(a+phase)*rx*(n+drift);
      const y=cy+Math.sin(a+phase)*ry*(n-drift*.6);
      if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
    }
    ctx.closePath();
  }

  function strokeFluidRing(ctx,cx,cy,rx,ry,seed,alpha,width,phase=0,rough=.018){
    if(alpha<=.001||rx<1||ry<.3)return;
    ctx.save();
    ctx.shadowColor=`rgba(112,193,169,${alpha*.72})`;
    ctx.shadowBlur=Math.max(1,width*4.5);
    ctx.lineWidth=width*3.2;
    ctx.strokeStyle=`rgba(70,133,116,${alpha*.11})`;
    deformedEllipsePath(ctx,cx,cy,rx,ry,seed,phase,rough);
    ctx.stroke();
    ctx.shadowBlur=0;
    ctx.lineWidth=width;
    const grad=ctx.createLinearGradient(cx-rx,cy,cx+rx,cy);
    grad.addColorStop(0,`rgba(145,190,178,${alpha*.18})`);
    grad.addColorStop(.28,`rgba(238,247,242,${alpha*.78})`);
    grad.addColorStop(.5,`rgba(115,194,170,${alpha*.54})`);
    grad.addColorStop(.72,`rgba(214,235,228,${alpha*.5})`);
    grad.addColorStop(1,`rgba(73,131,114,${alpha*.13})`);
    ctx.strokeStyle=grad;
    deformedEllipsePath(ctx,cx,cy,rx,ry,seed,phase,rough);
    ctx.stroke();
    ctx.restore();
  }

  function drawSurfacePlane(ctx,w,h,cx,waterY,energy){
    const haze=ctx.createRadialGradient(cx,waterY,0,cx,waterY,w*.72);
    haze.addColorStop(0,`rgba(88,139,125,${.055+.05*energy})`);
    haze.addColorStop(.3,`rgba(33,78,66,${.035+.02*energy})`);
    haze.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=haze;ctx.fillRect(0,waterY-h*.25,w,h*.5);

    const glass=ctx.createLinearGradient(0,waterY-h*.09,0,waterY+h*.15);
    glass.addColorStop(0,'rgba(242,245,241,0)');
    glass.addColorStop(.45,`rgba(180,203,195,${.018+.015*energy})`);
    glass.addColorStop(.51,`rgba(228,239,235,${.055+.03*energy})`);
    glass.addColorStop(.57,'rgba(66,115,101,.018)');
    glass.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=glass;ctx.fillRect(0,waterY-h*.1,w,h*.26);

    ctx.save();ctx.globalAlpha=.35+.25*energy;
    for(let i=0;i<5;i++){
      const y=waterY+(i-2)*1.8;
      const g=ctx.createLinearGradient(cx-w*.4,y,cx+w*.4,y);
      g.addColorStop(0,'rgba(255,255,255,0)');
      g.addColorStop(.45,`rgba(203,228,219,${.035-i*.003})`);
      g.addColorStop(.55,`rgba(102,172,151,${.05-i*.004})`);
      g.addColorStop(1,'rgba(255,255,255,0)');
      ctx.strokeStyle=g;ctx.lineWidth=.45;ctx.beginPath();ctx.moveTo(cx-w*.46,y);ctx.quadraticCurveTo(cx,y+(i%2?1:-1),cx+w*.46,y);ctx.stroke();
    }
    ctx.restore();
  }

  function drawDroplet(ctx,x,y,r,stretch,alpha){
    ctx.save();ctx.translate(x,y);ctx.scale(1,stretch);
    const rr=r/Math.max(1,stretch*.78);
    ctx.shadowColor=`rgba(141,205,187,${alpha*.22})`;ctx.shadowBlur=r*2.4;
    const body=ctx.createRadialGradient(-rr*.32,-rr*.42,rr*.05,rr*.05,rr*.08,rr*1.25);
    body.addColorStop(0,`rgba(250,253,251,${alpha*.9})`);
    body.addColorStop(.12,`rgba(205,230,222,${alpha*.76})`);
    body.addColorStop(.38,`rgba(71,119,106,${alpha*.62})`);
    body.addColorStop(.68,`rgba(7,20,17,${alpha*.82})`);
    body.addColorStop(.9,`rgba(62,120,103,${alpha*.3})`);
    body.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=body;
    ctx.beginPath();ctx.moveTo(0,-rr*1.35);
    ctx.bezierCurveTo(rr*.22,-rr*.95,rr*.94,-rr*.3,rr*.82,rr*.38);
    ctx.bezierCurveTo(rr*.73,rr*.95,rr*.34,rr*1.18,0,rr*1.2);
    ctx.bezierCurveTo(-rr*.34,rr*1.18,-rr*.73,rr*.95,-rr*.82,rr*.38);
    ctx.bezierCurveTo(-rr*.94,-rr*.3,-rr*.22,-rr*.95,0,-rr*1.35);ctx.fill();
    ctx.shadowBlur=0;
    const rim=ctx.createLinearGradient(-rr,-rr,rr,rr);
    rim.addColorStop(0,`rgba(255,255,255,${alpha*.55})`);
    rim.addColorStop(.3,`rgba(137,194,178,${alpha*.08})`);
    rim.addColorStop(.72,`rgba(244,249,246,${alpha*.32})`);
    rim.addColorStop(1,`rgba(81,145,126,${alpha*.1})`);
    ctx.strokeStyle=rim;ctx.lineWidth=Math.max(.45,r*.055);ctx.beginPath();ctx.ellipse(0,rr*.16,rr*.76,rr*.98,0,0,TAU);ctx.stroke();
    ctx.globalAlpha=alpha*.75;ctx.strokeStyle='rgba(255,255,255,.95)';ctx.lineWidth=Math.max(.42,r*.045);ctx.lineCap='round';
    ctx.beginPath();ctx.moveTo(-rr*.39,-rr*.56);ctx.quadraticCurveTo(-rr*.56,-rr*.18,-rr*.4,rr*.18);ctx.stroke();
    ctx.globalAlpha=alpha*.28;ctx.beginPath();ctx.arc(rr*.34,rr*.4,rr*.1,0,TAU);ctx.stroke();ctx.restore();
  }

  function drawImpactCrown(ctx,cx,waterY,w,h,t,seed){
    const pulse=Math.sin(clamp(t,0,1)*Math.PI);if(pulse<=.01)return;
    const base=w*(.038+.025*smooth(t)),height=h*(.035+.11*pulse);
    ctx.save();
    const g=ctx.createLinearGradient(cx,waterY-height,cx,waterY+3);
    g.addColorStop(0,`rgba(230,243,237,${.2*pulse})`);g.addColorStop(.45,`rgba(114,181,161,${.2*pulse})`);g.addColorStop(1,'rgba(22,58,49,0)');
    ctx.strokeStyle=g;ctx.lineWidth=.7;ctx.shadowColor=`rgba(143,212,191,${.18*pulse})`;ctx.shadowBlur=6;
    ctx.beginPath();ctx.moveTo(cx-base,waterY+1);
    ctx.quadraticCurveTo(cx-base*.72,waterY-height*.28,cx-base*.35,waterY-height*.16);
    ctx.quadraticCurveTo(cx-base*.12,waterY-height*.92,cx,waterY-height);
    ctx.quadraticCurveTo(cx+base*.12,waterY-height*.92,cx+base*.35,waterY-height*.16);
    ctx.quadraticCurveTo(cx+base*.72,waterY-height*.28,cx+base,waterY+1);ctx.stroke();
    for(let i=0;i<3;i++){
      const a=(-.75+i*.75)+(seeded(seed+i)*.16-.08),px=cx+Math.sin(a)*base*.78,py=waterY-height*(.35+.4*seeded(seed+20+i));
      ctx.fillStyle=`rgba(225,242,236,${.13*pulse})`;ctx.beginPath();ctx.arc(px,py,1+.8*seeded(seed+30+i),0,TAU);ctx.fill();
    }
    ctx.restore();
  }

  function drawCaustics(ctx,cx,cy,w,progress,seed){
    ctx.save();ctx.globalCompositeOperation='screen';ctx.lineCap='round';
    for(let i=0;i<9;i++){
      const p=(progress+i*.087)%1,radius=w*(.08+p*.38),angle=seeded(seed+i*7)*TAU+progress*.2,span=.18+.22*seeded(seed+i*11),alpha=(1-p)*(.022+.025*seeded(seed+i*4));
      ctx.strokeStyle=`rgba(197,228,218,${alpha})`;ctx.lineWidth=.45+.35*seeded(seed+i);ctx.beginPath();ctx.ellipse(cx,cy,radius,radius*(.23+.02*seeded(seed+i*3)),0,angle,angle+span);ctx.stroke();
    }
    ctx.restore();
  }

  function drawHero(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);
    const seed=surface.seed,cycle=6.3+seeded(seed)*1.6,phase=staticOnly?.72:((time/1000+seeded(seed+3)*cycle)%cycle)/cycle,dropEnd=.37,impactEnd=.49;
    const cx=w*(.535+(seeded(seed+7)-.5)*.025),waterY=h*.72;
    drawSurfacePlane(ctx,w,h,cx,waterY,phase>dropEnd?1:0);radialGlow(ctx,cx,waterY,w*.34,.32,true);
    if(phase<dropEnd){
      const t=smoother(phase/dropEnd),y=lerp(-h*.1,waterY-h*.055,t),speed=smooth(clamp((t-.35)/.65,0,1)),stretch=1+.8*speed,r=Math.max(3.2,w*.0225);
      withScreen(ctx,()=>drawDroplet(ctx,cx,y,r,stretch,.72+.2*speed));
      ctx.save();ctx.globalAlpha=.08+.12*t;ctx.scale(1,-.42);drawDroplet(ctx,cx,-(waterY*2-y),r*.82,stretch*.74,.35);ctx.restore();
    }else{
      const impactT=clamp((phase-dropEnd)/(impactEnd-dropEnd),0,1),rippleT=clamp((phase-dropEnd)/(1-dropEnd),0,1);
      if(phase<impactEnd){
        drawImpactCrown(ctx,cx,waterY,w,h,impactT,seed);const squash=Math.sin(impactT*Math.PI);radialGlow(ctx,cx,waterY,w*(.07+.14*squash),.55*squash,true);
        strokeFluidRing(ctx,cx,waterY,w*(.025+.09*easeOut(impactT)),h*(.009+.015*easeOut(impactT)),seed+1,.48*(1-impactT*.45),.9,0,.045);
      }
      const decay=Math.pow(1-rippleT,1.2);
      for(let i=0;i<5;i++){
        const delay=i*.085,rt=clamp((rippleT-delay)/(1-delay),0,1);if(rt<=0)continue;
        const e=easeOut(rt),base=w*(.055+i*.045),rx=base+w*(.39+i*.018)*e,ry=rx*(.215+.018*Math.sin(seed+i)),alpha=(.23-i*.026)*Math.pow(1-rt,1.35),offsetX=(seeded(seed+i*19)-.5)*w*.012*e,offsetY=(seeded(seed+i*23)-.5)*h*.008*e;
        strokeFluidRing(ctx,cx+offsetX,waterY+offsetY,rx,ry,seed+i*13,alpha,i===0?.9:.56,(seeded(seed+i*31)-.5)*.035,.02+.012*i);
      }
      drawCaustics(ctx,cx,waterY,w,rippleT,seed);
      if(rippleT<.36){
        const jet=Math.sin(clamp(rippleT/.36,0,1)*Math.PI),jh=h*.12*jet,jw=w*.013*(.75+.25*(1-jet));
        const g=ctx.createLinearGradient(cx,waterY-jh,cx,waterY);g.addColorStop(0,`rgba(229,242,237,${.26*jet})`);g.addColorStop(.45,`rgba(95,156,138,${.26*jet})`);g.addColorStop(1,'rgba(19,49,42,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cx,waterY-jh);ctx.bezierCurveTo(cx+jw*.35,waterY-jh*.7,cx+jw,waterY-jh*.25,cx+jw*.72,waterY);ctx.lineTo(cx-jw*.72,waterY);ctx.bezierCurveTo(cx-jw,waterY-jh*.25,cx-jw*.35,waterY-jh*.7,cx,waterY-jh);ctx.fill();
      }
      withLighter(ctx,()=>radialGlow(ctx,cx,waterY,w*(.12+.18*rippleT),.12*decay,true));
    }
  }

  function drawScore(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);
    const seed=surface.seed,t=staticOnly?.42:((time/1000+seed)%7.2)/7.2,cx=w/2,cy=h/2,r=Math.min(w,h)*.36;
    radialGlow(ctx,cx,cy,r*1.45,.16+.04*Math.sin(t*TAU));ctx.save();ctx.globalCompositeOperation='screen';
    for(let i=0;i<3;i++){const p=(t+i*.33)%1,rr=r*(.78+.22*p),alpha=.075*(1-p);strokeFluidRing(ctx,cx,cy,rr,rr,seed+i*5,alpha,.5,(seeded(seed+i)-.5)*.02,.015);}
    const ribbonPhase=t*TAU;ctx.lineCap='round';
    for(let i=0;i<58;i++){
      const a0=i/58*TAU,a1=(i+1)/58*TAU,wobble0=1+.035*Math.sin(a0*3+ribbonPhase)+.016*Math.sin(a0*5-ribbonPhase*.7),wobble1=1+.035*Math.sin(a1*3+ribbonPhase)+.016*Math.sin(a1*5-ribbonPhase*.7),x0=cx+Math.cos(a0)*r*wobble0,y0=cy+Math.sin(a0)*r*wobble0,x1=cx+Math.cos(a1)*r*wobble1,y1=cy+Math.sin(a1)*r*wobble1,light=.02+.11*Math.pow(Math.max(0,Math.cos(a0-ribbonPhase*.26)),8);
      ctx.strokeStyle=`rgba(184,230,216,${light})`;ctx.lineWidth=.55;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
    }
    ctx.restore();
  }

  function drawCheckin(surface,time,staticOnly=false){
    const {ctx,w,h}=surface;ctx.clearRect(0,0,w,h);const t=staticOnly?.31:((time/1000+surface.seed*.05)%9)/9,baseY=h*.67;
    ctx.save();ctx.globalCompositeOperation='screen';
    const glow=ctx.createRadialGradient(w*.78,h*.55,0,w*.78,h*.55,w*.5);glow.addColorStop(0,'rgba(93,168,146,.07)');glow.addColorStop(.52,'rgba(55,112,96,.025)');glow.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
    for(let layer=0;layer<5;layer++){
      const y=baseY+(layer-2)*5;ctx.strokeStyle=`rgba(133,202,181,${.022+layer*.006})`;ctx.lineWidth=.45+.08*layer;ctx.beginPath();
      for(let x=-10;x<=w+10;x+=8){const nx=x/w,wave=Math.sin(nx*TAU*(1.12+layer*.06)+t*TAU+(layer*.68))*4.5+Math.sin(nx*TAU*2.2-t*TAU*.7)*1.8,drift=(nx-.5)*(layer-2)*2.1,py=y+wave+drift;if(x===-10)ctx.moveTo(x,py);else ctx.lineTo(x,py);}ctx.stroke();
    }
    ctx.restore();
  }

  function draw(surface,time,staticOnly=false){fit(surface);if(surface.type==='hero')drawHero(surface,time,staticOnly);else if(surface.type==='score')drawScore(surface,time,staticOnly);else drawCheckin(surface,time,staticOnly);}

  function sync(){
    queued=false;ensureStyle();removeStale();const m=main();if(!m||m.dataset.garangScreen!=='today')return;
    const hero=m.querySelector('.gtd3-ripple'),score=m.querySelector('#garangTodayFlow .gtf-state-primary'),checkin=m.querySelector('#garangTodayFlow .gtf-checkin-access');
    makeSurface(hero,'hero');makeSurface(score,'score');makeSurface(checkin,'checkin');
    if(!hero||!score||!checkin){clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,180);}
    m.dataset.garangMotion=reduced()?'reduced':'active';m.dataset.garangMotionQuality=QUALITY;
    if(reduced()){for(const surface of surfaces.values())if(surface.host.isConnected)draw(surface,0,true);stop();}else schedule();
  }

  function tick(time){
    raf=0;if(!todayActive()||reduced())return;if(time-lastFrame<FRAME_MS){raf=requestAnimationFrame(tick);return;}lastFrame=time;
    let active=0;for(const surface of surfaces.values()){if(!surface.host.isConnected||surface.host.closest('#main')?.dataset?.garangScreen!=='today'||surface.visible===false)continue;draw(surface,time,false);active++;}
    if(active)raf=requestAnimationFrame(tick);
  }

  function schedule(){if(raf||reduced()||!todayActive())return;raf=requestAnimationFrame(tick);}
  function stop(){if(raf)cancelAnimationFrame(raf);raf=0;lastFrame=0;}
  function queueSync(){if(queued)return;queued=true;requestAnimationFrame(()=>requestAnimationFrame(sync));}
  function lifecycleSync(){queueSync();clearTimeout(retryTimer);retryTimer=setTimeout(queueSync,240);}

  reducedQuery?.addEventListener?.('change',lifecycleSync);
  window.addEventListener('resize',queueSync,{passive:true});
  doc.addEventListener('visibilitychange',()=>{if(doc.hidden)stop();else lifecycleSync();});
  window.addEventListener('pageshow',lifecycleSync);
  window.addEventListener('garang:screen-rendered',lifecycleSync);
  window.addEventListener('garang:state-updated',lifecycleSync);
  window.addEventListener('garang:state-hydrated',lifecycleSync);
  window.addEventListener('garang:route-completed',lifecycleSync);
  window.addEventListener('garang:workout-intelligence-rendered',lifecycleSync);

  const api=Object.freeze({version:VERSION,quality:QUALITY,renderer:'canvas2d-composite',sync:queueSync,stop,get activeSurfaces(){return [...surfaces.values()].filter(x=>x.host.isConnected).map(x=>x.type);},get reducedMotion(){return reduced();}});
  window.GarangAccumulationMotionV1=api;window.GarangAccumulationMotionV2=api;lifecycleSync();
})();