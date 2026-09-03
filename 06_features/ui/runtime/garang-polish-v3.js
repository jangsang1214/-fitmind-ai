/* GARANG POLISH v3
   Uses the approved GARANG visual references as geometry/style references only.
   Everything rendered here is code: SVG paths + DOM/CSS. No body/logo bitmap dependency.
*/
(() => {
  'use strict';
  const main=document.getElementById('main');
  if(!main)return;

  const exactMarkInner=()=>`
    <path class="g2-mark-line" d="M65 8V54"/>
    <path class="g2-mark-line" d="M65 49C64.7 72 59.2 91 47.2 110.8C40.2 122.4 32.9 132.5 35.2 138.1C38.3 145.6 50.4 149.8 65 149.8"/>
    <path class="g2-mark-line" d="M65 49C65.3 72 70.8 91 82.8 110.8C89.8 122.4 97.1 132.5 94.8 138.1C91.7 145.6 79.6 149.8 65 149.8"/>
    <ellipse class="g2-mark-ripple" cx="65" cy="159" rx="12.7" ry="3"/>
    <ellipse class="g2-mark-ripple outer" cx="65" cy="165.4" rx="29.5" ry="6.1"/>`;

  function refineMarks(root=document){
    root.querySelectorAll('svg.garang-code-mark').forEach(svg=>{
      if(svg.dataset.g3Exact==='1')return;
      svg.setAttribute('viewBox','0 0 130 180');svg.innerHTML=exactMarkInner();svg.dataset.g3Exact='1';
    });
  }

  function defs(side){
    const p=side==='front'?'f':'b';
    return `<defs>
      <linearGradient id="g3Body-${p}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#666762"/><stop offset=".24" stop-color="#3e403c"/><stop offset=".52" stop-color="#242624"/><stop offset=".78" stop-color="#484a45"/><stop offset="1" stop-color="#1b1d1b"/></linearGradient>
      <linearGradient id="g3Limb-${p}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#202220"/><stop offset=".42" stop-color="#545650"/><stop offset=".7" stop-color="#2a2c29"/><stop offset="1" stop-color="#171917"/></linearGradient>
      <radialGradient id="g3Muscle-${p}" cx="42%" cy="30%" r="76%"><stop offset="0" stop-color="#65655f"/><stop offset=".42" stop-color="#3f413d"/><stop offset=".76" stop-color="#282a27"/><stop offset="1" stop-color="#181a18"/></radialGradient>
      <linearGradient id="g3Core-${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#555750"/><stop offset=".55" stop-color="#30322f"/><stop offset="1" stop-color="#1c1e1c"/></linearGradient>
    </defs>`;
  }

  function frontSVG(){return `<svg class="g3-body-model" data-garang-body-v2="front" data-garang-anatomy-v3="front" viewBox="0 0 220 430" role="img" aria-label="전면 근육 지도">
    ${defs('front')}
    <!-- head / neck -->
    <ellipse class="g3-base" cx="110" cy="30" rx="21" ry="27"/>
    <path class="g3-base" d="M99 53c2 11 2 18-4 27l15 12 15-12c-6-9-6-16-4-27Z"/>
    <path class="g3-shadow" d="M96 31c5-13 23-20 34-8-3-15-11-21-20-21-11 0-19 8-21 20 1 5 3 8 7 9Z"/>
    <path class="g3-detail" d="M100 35q10 5 20 0M104 43q6 3 12 0M110 22v16"/>
    <!-- torso base -->
    <path class="g3-base" d="M76 77C63 81 53 91 49 108l-7 47 15 4 14-40 4 74-12 34 7 12 14-18 11-34h30l11 34 14 18 7-12-12-34 4-74 14 40 15-4-7-47c-4-17-14-27-27-31l-19-5H95Z"/>
    <!-- shoulders -->
    <path class="g3-muscle muscle-shoulders" d="M75 79c-13 1-23 8-27 19 2 7 7 13 14 17l15-13 5-21Z"/>
    <path class="g3-muscle muscle-shoulders" d="M145 79c13 1 23 8 27 19-2 7-7 13-14 17l-15-13-5-21Z"/>
    <!-- chest -->
    <path class="g3-muscle muscle-chest" d="M82 89c9-7 19-9 28-5v38c-17 1-29-7-33-20Z"/>
    <path class="g3-muscle muscle-chest" d="M138 89c-9-7-19-9-28-5v38c17 1 29-7 33-20Z"/>
    <path class="g3-highlight" d="M83 95q13-8 27-5M137 95q-13-8-27-5"/>
    <!-- arms -->
    <path class="g3-limb" d="M48 101c-8 5-12 17-14 34l-9 49c-2 11 1 17 8 20l9-4 10-47 9-34Z"/>
    <path class="g3-limb" d="M172 101c8 5 12 17 14 34l9 49c2 11-1 17-8 20l-9-4-10-47-9-34Z"/>
    <path class="g3-muscle muscle-biceps" d="M55 111c9 1 13 10 11 24l-8 31c-7-1-11-7-10-17l3-29Z"/>
    <path class="g3-muscle muscle-biceps" d="M165 111c-9 1-13 10-11 24l8 31c7-1 11-7 10-17l-3-29Z"/>
    <path class="g3-muscle muscle-triceps" d="M43 118c6 5 8 13 5 25l-8 34-7-4 6-38Z"/>
    <path class="g3-muscle muscle-triceps" d="M177 118c-6 5-8 13-5 25l8 34 7-4-6-38Z"/>
    <path class="g3-detail" d="M38 177l7 4 7-25M182 177l-7 4-7-25"/>
    <!-- abs / obliques -->
    <path class="g3-muscle muscle-core" fill="url(#g3Core-f)" d="M88 121h21v25H86Zm23 0h21l2 25h-23Zm-27 28h25v25H82Zm27 0h27l-2 25h-25Zm-29 28h27v24H78Zm29 0h29l2 24h-31Z"/>
    <path class="g3-muscle muscle-core" d="M77 119c7 5 10 13 9 26l-5 46-10-16 3-45Zm66 0c-7 5-10 13-9 26l5 46 10-16-3-45Z"/>
    <path class="g3-detail" d="M110 120v82M88 147h44M85 175h50M82 202h56"/>
    <path class="g3-fine" d="M79 129l9 12m-12 9 10 11m55-32-9 12m12 9-10 11"/>
    <!-- pelvis -->
    <path class="g3-base" d="M78 202c8 5 18 7 32 7s24-2 32-7l8 21-19 25-21-8-21 8-19-25Z"/>
    <path class="g3-detail" d="M81 209q29 13 58 0M91 232l19 8 19-8"/>
    <!-- thighs -->
    <path class="g3-limb" d="M76 226c13-3 23 3 33 16l-7 91-26 4-14-73Z"/>
    <path class="g3-limb" d="M144 226c-13-3-23 3-33 16l7 91 26 4 14-73Z"/>
    <path class="g3-muscle muscle-legs" d="M78 235c12-4 21 2 28 14l-8 67-17 5-12-55Z"/>
    <path class="g3-muscle muscle-legs" d="M142 235c-12-4-21 2-28 14l8 67 17 5 12-55Z"/>
    <path class="g3-muscle muscle-legs" d="M94 240c8 3 13 11 13 24l-5 61-11-7-6-57Z"/>
    <path class="g3-muscle muscle-legs" d="M126 240c-8 3-13 11-13 24l5 61 11-7 6-57Z"/>
    <path class="g3-detail" d="M76 268q15 6 28-1M144 268q-15 6-28-1M83 304l17 12m37-12-17 12"/>
    <!-- calves -->
    <path class="g3-limb" d="M76 331c11-5 20 1 23 15l-8 77H67l-2-53Z"/>
    <path class="g3-limb" d="M144 331c-11-5-20 1-23 15l8 77h24l2-53Z"/>
    <path class="g3-muscle muscle-legs" d="M75 342c10-4 16 2 17 14l-7 54H70l-2-39Z"/>
    <path class="g3-muscle muscle-legs" d="M145 342c-10-4-16 2-17 14l7 54h15l2-39Z"/>
    <path class="g3-detail" d="M70 371l15 10m65-10-15 10"/>
  </svg>`;}

  function backSVG(){return `<svg class="g3-body-model" data-garang-body-v2="back" data-garang-anatomy-v3="back" viewBox="0 0 220 430" role="img" aria-label="후면 근육 지도">
    ${defs('back')}
    <ellipse class="g3-base" cx="110" cy="30" rx="21" ry="27"/>
    <path class="g3-base" d="M99 53c2 11 2 18-4 27l15 12 15-12c-6-9-6-16-4-27Z"/>
    <path class="g3-shadow" d="M89 22c5-15 13-20 21-20 10 0 18 7 21 20-11-7-31-7-42 0Z"/>
    <path class="g3-base" d="M76 77C63 81 53 91 49 108l-7 47 15 4 14-40 4 74-12 34 7 12 14-18 11-34h30l11 34 14 18 7-12-12-34 4-74 14 40 15-4-7-47c-4-17-14-27-27-31l-19-5H95Z"/>
    <path class="g3-muscle muscle-shoulders" d="M76 79c-14 1-24 8-28 19 4 8 9 13 17 16l14-12 5-20Z"/>
    <path class="g3-muscle muscle-shoulders" d="M144 79c14 1 24 8 28 19-4 8-9 13-17 16l-14-12-5-20Z"/>
    <path class="g3-muscle muscle-back" d="M91 75c6-8 12-11 19-12 7 1 13 4 19 12l8 24-14 29-13-20-13 20-14-29Z"/>
    <path class="g3-muscle muscle-back" d="M78 99c9-3 18 2 32 14-8 16-15 34-19 56l-21-25 2-31Zm64 0c-9-3-18 2-32 14 8 16 15 34 19 56l21-25-2-31Z"/>
    <path class="g3-highlight" d="M91 82q19 9 38 0M77 107q18 8 33 18m33-18q-18 8-33 18"/>
    <path class="g3-limb" d="M48 101c-8 5-12 17-14 34l-9 49c-2 11 1 17 8 20l9-4 10-47 9-34Z"/>
    <path class="g3-limb" d="M172 101c8 5 12 17 14 34l9 49c2 11-1 17-8 20l-9-4-10-47-9-34Z"/>
    <path class="g3-muscle muscle-triceps" d="M52 109c9 4 12 12 9 25l-10 37c-7-2-10-8-8-18l5-33Z"/>
    <path class="g3-muscle muscle-triceps" d="M168 109c-9 4-12 12-9 25l10 37c7-2 10-8 8-18l-5-33Z"/>
    <path class="g3-muscle muscle-core" d="M92 143h36l9 38-27 24-27-24Z"/>
    <path class="g3-detail" d="M110 72v132M86 94q24 13 48 0M82 122q28 16 56 0M91 157h38"/>
    <path class="g3-base" d="M78 202c8 5 18 7 32 7s24-2 32-7l8 21-19 25-21-8-21 8-19-25Z"/>
    <path class="g3-muscle muscle-legs" d="M76 209c12-3 23 2 34 20-7 17-15 25-26 28l-16-18Z"/>
    <path class="g3-muscle muscle-legs" d="M144 209c-12-3-23 2-34 20 7 17 15 25 26 28l16-18Z"/>
    <path class="g3-limb" d="M76 239c13-3 23 3 33 16l-7 78-26 4-14-69Z"/>
    <path class="g3-limb" d="M144 239c-13-3-23 3-33 16l7 78 26 4 14-69Z"/>
    <path class="g3-muscle muscle-legs" d="M73 247c11-5 21 1 30 16l-7 56-18 4-10-51Z"/>
    <path class="g3-muscle muscle-legs" d="M147 247c-11-5-21 1-30 16l7 56 18 4 10-51Z"/>
    <path class="g3-detail" d="M72 277q16 9 31 0m45 0q-16 9-31 0M80 311l17 9m43-9-17 9"/>
    <path class="g3-limb" d="M76 331c11-5 20 1 23 15l-8 77H67l-2-53Z"/>
    <path class="g3-limb" d="M144 331c-11-5-20 1-23 15l8 77h24l2-53Z"/>
    <path class="g3-muscle muscle-legs" d="M73 340c12-4 20 4 20 18l-8 53H69l-2-41Z"/>
    <path class="g3-muscle muscle-legs" d="M147 340c-12-4-20 4-20 18l8 53h16l2-41Z"/>
    <path class="g3-detail" d="M69 369q11 11 20 12m62-12q-11 11-20 12"/>
  </svg>`;}

  function bindZones(map){
    map.querySelectorAll('.g3-muscle').forEach(zone=>{
      const key=['chest','back','shoulders','biceps','triceps','core','legs'].find(k=>zone.classList.contains(`muscle-${k}`));if(!key)return;
      zone.setAttribute('role','button');zone.setAttribute('tabindex','0');zone.setAttribute('aria-label',`${key} 운동 보기`);
      const activate=()=>main.querySelector(`[data-muscle-pick="${key}"]`)?.click();
      zone.onclick=activate;zone.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();activate();}};
    });
  }

  function upgradeAnatomy(){
    main.querySelectorAll('.muscle-map-wrap').forEach(wrap=>{
      const map=wrap.querySelector('.muscle-map.anatomical-pro');if(!map)return;
      const views=[...map.querySelectorAll('.body-view')];if(!views.length)return;
      views.forEach((view,i)=>{
        const side=i===1?'back':'front';const old=view.querySelector('svg');
        if(old?.dataset?.garangAnatomyV3===side)return;
        const tpl=document.createElement('template');tpl.innerHTML=(side==='front'?frontSVG():backSVG()).trim();old?.replaceWith(tpl.content.firstElementChild);
      });
      if(!wrap.classList.contains('g3-upgraded')){
        wrap.classList.add('g3-upgraded');wrap.dataset.g3View='front';
        const tools=document.createElement('div');tools.className='g3-anatomy-tools';tools.innerHTML='<div class="g3-view-switch"><button type="button" class="active" data-g3-view="front">FRONT</button><button type="button" data-g3-view="back">BACK</button></div><div class="g3-anatomy-legend"><span><i></i>Primary</span><span><i></i>Secondary</span><span><i></i>Tertiary</span></div>';
        wrap.insertAdjacentElement('beforebegin',tools);
        tools.querySelectorAll('[data-g3-view]').forEach(btn=>btn.onclick=()=>{wrap.dataset.g3View=btn.dataset.g3View;tools.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));});
      }
      bindZones(map);
    });
  }

  const scrollLocks=new WeakMap();
  function bottom(el){el.scrollTop=el.scrollHeight;}
  function hardBottom(el){
    bottom(el);requestAnimationFrame(()=>{bottom(el);requestAnimationFrame(()=>bottom(el));});
    [32,80,160,320,600].forEach(ms=>setTimeout(()=>bottom(el),ms));
  }
  function lockCoachLatest(){
    document.querySelectorAll('.g2-chat-scroll').forEach(scroller=>{
      if(scrollLocks.has(scroller)){hardBottom(scroller);return;}
      const mo=new MutationObserver(()=>hardBottom(scroller));mo.observe(scroller,{childList:true,subtree:true,characterData:true});
      const ro='ResizeObserver'in window?new ResizeObserver(()=>hardBottom(scroller)):null;ro?.observe(scroller);
      scroller.addEventListener('transitionend',()=>hardBottom(scroller));
      scrollLocks.set(scroller,{mo,ro});hardBottom(scroller);
    });
  }
  window.addEventListener('resize',()=>document.querySelectorAll('.g2-chat-scroll').forEach(hardBottom));
  window.visualViewport?.addEventListener('resize',()=>document.querySelectorAll('.g2-chat-scroll').forEach(hardBottom));
  document.addEventListener('focusin',e=>{if(e.target?.closest?.('.g2-composer'))document.querySelectorAll('.g2-chat-scroll').forEach(hardBottom);});

  function polish(){refineMarks(document);upgradeAnatomy();lockCoachLatest();}
  let queued=false;const observer=new MutationObserver(()=>{if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});});observer.observe(document.body,{childList:true,subtree:true});polish();
})();
