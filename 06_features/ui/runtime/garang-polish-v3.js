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
      <linearGradient id="g3Body-${p}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5d615b"/><stop offset=".46" stop-color="#343834"/><stop offset="1" stop-color="#1b1e1b"/></linearGradient>
      <linearGradient id="g3Limb-${p}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#202420"/><stop offset=".48" stop-color="#474c46"/><stop offset="1" stop-color="#181b18"/></linearGradient>
      <linearGradient id="g3Muscle-${p}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#555b54"/><stop offset=".56" stop-color="#363b36"/><stop offset="1" stop-color="#242824"/></linearGradient>
    </defs>`;
  }
  function bodyFrame(gender='male',side='front'){
    const female=gender==='female',back=side==='back';
    const torso=female
      ?'M91 68C78 69 68 75 62 86c-7 13-8 31-6 50l5 43c2 16 8 27 17 38 8 9 17 15 32 15s24-6 32-15c9-11 15-22 17-38l5-43c2-19 1-37-6-50-6-11-16-17-29-18l-10-2c-3 5-6 8-9 8s-6-3-9-8Z'
      :'M87 68C72 70 61 77 55 90c-6 13-6 31-4 49l6 39c3 17 10 29 20 38 9 8 19 13 33 13s24-5 33-13c10-9 17-21 20-38l6-39c2-18 2-36-4-49-6-13-17-20-32-22l-13-2c-3 5-6 8-10 8s-7-3-10-8Z';
    const pelvis=female
      ?'M77 211c9 8 20 12 33 12s24-4 33-12l11 22c-10 18-25 27-44 27s-34-9-44-27Z'
      :'M79 209c8 7 18 10 31 10s23-3 31-10l10 22c-9 16-22 24-41 24s-32-8-41-24Z';
    const leftArm=female?'M61 87c-10 5-15 18-18 37l-8 53c-2 13 1 21 9 24l8-4 9-45 11-40Z':'M55 89c-11 6-17 19-20 39l-9 51c-2 12 2 20 10 23l9-5 10-45 12-41Z';
    const rightArm=female?'M159 87c10 5 15 18 18 37l8 53c2 13-1 21-9 24l-8-4-9-45-11-40Z':'M165 89c11 6 17 19 20 39l9 51c2 12-2 20-10 23l-9-5-10-45-12-41Z';
    const leftLeg=female?'M78 244c13-4 23 2 31 18l-7 69-7 82H69l-4-58 2-65Z':'M76 240c14-4 25 3 33 20l-6 72-8 81H68l-4-58 2-67Z';
    const rightLeg=female?'M142 244c-13-4-23 2-31 18l7 69 7 82h26l4-58-2-65Z':'M144 240c-14-4-25 3-33 20l6 72 8 81h27l4-58-2-67Z';
    return `<ellipse class="g3-base g3-head" cx="110" cy="31" rx="${female?16:17}" ry="${female?21:22}"/>
      <path class="g3-base g3-neck" d="M101 49c1 9 0 14-5 21 4 6 9 9 14 9s10-3 14-9c-5-7-6-12-5-21Z"/>
      <path class="g3-base g3-torso" d="${torso}"/>
      <path class="g3-limb g3-arm" d="${leftArm}"/><path class="g3-limb g3-arm" d="${rightArm}"/>
      <path class="g3-base g3-pelvis" d="${pelvis}"/>
      <path class="g3-limb g3-leg" d="${leftLeg}"/><path class="g3-limb g3-leg" d="${rightLeg}"/>
      <path class="g3-detail" d="M110 74v139${back?'M84 96q26 16 52 0M81 126q29 18 58 0':'M86 108q24 8 48 0M88 145h44M91 178h38'}"/>
      <path class="g3-fine" d="M74 103q12 10 22 13m50-13q-12 10-22 13M76 279q15 8 29 3m39-3q-15 8-29 3M74 354q12 8 22 5m50-5q-12 8-22 5"/>`;
  }
  function frontSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette" data-garang-body-v2="front" data-garang-anatomy-v3="front" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 전면 퍼포먼스 신체 지도">
    ${defs('front')}${bodyFrame(gender,'front')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M70 84c8-8 18-11 28-8l-6 24c-9 3-18-1-25-10Zm80 0c-8-8-18-11-28-8l6 24c9 3 18-1 25-10Z':'M64 84c10-9 21-12 32-8l-7 25c-11 3-20-2-28-11Zm92 0c-10-9-21-12-32-8l7 25c11 3 20-2 28-11Z'}"/>
    <path class="g3-muscle muscle-chest" d="M82 96c9-8 19-11 28-8v37c-15 1-27-6-32-19Zm56 0c-9-8-19-11-28-8v37c15 1 27-6 32-19Z"/>
    <path class="g3-muscle muscle-biceps" d="M56 116c8 2 11 10 9 23l-7 29c-6 0-10-6-9-15l3-26Zm108 0c-8 2-11 10-9 23l7 29c6 0 10-6 9-15l-3-26Z"/>
    <path class="g3-muscle muscle-triceps" d="M45 125c5 4 7 11 5 21l-7 29-6-3 5-33Zm130 0c-5 4-7 11-5 21l7 29 6-3-5-33Z"/>
    <path class="g3-muscle muscle-core" d="M88 123c7 4 13 6 22 6s15-2 22-6l5 30-4 41c-8 8-15 12-23 12s-15-4-23-12l-4-41Z"/>
    <path class="g3-detail" d="M110 130v69M94 149q16 5 32 0M92 174q18 6 36 0"/>
    <path class="g3-muscle muscle-legs" d="M77 252c11-4 21 2 30 18l-7 57-17 4-11-43Zm66 0c-11-4-21 2-30 18l7 57 17 4 11-43ZM74 337c10-4 17 3 18 16l-7 55H71l-2-39Zm72 0c-10-4-17 3-18 16l7 55h14l2-39Z"/>
    <path class="g3-highlight" d="M84 100q13-7 26-5m26 5q-13-7-26-5M92 137q18 5 36 0M82 264q12 6 23 3m33-3q-12 6-23 3"/>
  </svg>`;}
  function backSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette" data-garang-body-v2="back" data-garang-anatomy-v3="back" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 후면 퍼포먼스 신체 지도">
    ${defs('back')}${bodyFrame(gender,'back')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M70 84c8-8 18-11 28-8l-6 24c-9 3-18-1-25-10Zm80 0c-8-8-18-11-28-8l6 24c9 3 18-1 25-10Z':'M64 84c10-9 21-12 32-8l-7 25c-11 3-20-2-28-11Zm92 0c-10-9-21-12-32-8l7 25c11 3 20-2 28-11Z'}"/>
    <path class="g3-muscle muscle-back" d="M88 80c7-7 14-10 22-10s15 3 22 10l8 25-12 30-18-19-18 19-12-30ZM78 107c11-5 21 0 32 13-9 15-15 33-18 54l-21-25 2-29Zm64 0c-11-5-21 0-32 13 9 15 15 33 18 54l21-25-2-29Z"/>
    <path class="g3-muscle muscle-triceps" d="M54 115c8 4 11 12 8 24l-8 32c-6-1-10-7-8-17l4-29Zm112 0c-8 4-11 12-8 24l8 32c6-1 10-7 8-17l-4-29Z"/>
    <path class="g3-muscle muscle-core" d="M91 151h38l7 35-26 22-26-22Z"/>
    <path class="g3-muscle muscle-legs" d="M78 226c12-4 23 2 32 19-8 16-17 24-28 28l-16-18Zm64 0c-12-4-23 2-32 19 8 16 17 24 28 28l16-18ZM75 269c11-4 21 2 29 17l-7 44-17 3-10-39Zm70 0c-11-4-21 2-29 17l7 44 17 3 10-39ZM73 337c11-4 18 3 19 17l-7 54H70l-2-39Zm74 0c-11-4-18 3-19 17l7 54h15l2-39Z"/>
    <path class="g3-highlight" d="M91 88q19 8 38 0M81 116q17 8 29 20m29-20q-17 8-29 20M79 281q13 7 25 4m37-4q-13 7-25 4"/>
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
        const side=i===1?'back':'front',gender=map.dataset.gender==='female'?'female':'male',old=view.querySelector('svg');
        if(old?.dataset?.garangAnatomyV3===side&&old?.dataset?.garangGender===gender)return;
        const tpl=document.createElement('template');tpl.innerHTML=(side==='front'?frontSVG(gender):backSVG(gender)).trim();old?.replaceWith(tpl.content.firstElementChild);
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

  function repairAnatomyTools(){
    main.querySelectorAll('.muscle-map-wrap.g3-upgraded').forEach(wrap=>{
      const prev=wrap.previousElementSibling;
      if(prev?.classList.contains('g3-anatomy-tools'))wrap.prepend(prev);
      const tools=wrap.querySelector(':scope > .g3-anatomy-tools');
      if(!tools){
        const near=wrap.parentElement?.querySelector('.g3-anatomy-tools');
        if(near&&near!==wrap)wrap.prepend(near);
      }
    });
  }
  function polish(){refineMarks(document);upgradeAnatomy();repairAnatomyTools();}
  let queued=false;
  function schedulePolish(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;polish();});}
  window.addEventListener('garang:screen-rendered',schedulePolish);
  window.addEventListener('pageshow',schedulePolish);
  schedulePolish();
})();
