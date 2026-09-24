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
      <linearGradient id="g3Body-${p}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ddd5c8"/><stop offset=".34" stop-color="#b9b0a2"/>
        <stop offset=".72" stop-color="#817b72"/><stop offset="1" stop-color="#5b5852"/>
      </linearGradient>
      <linearGradient id="g3Limb-${p}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#817b72"/><stop offset=".5" stop-color="#bdb4a6"/><stop offset="1" stop-color="#69655e"/>
      </linearGradient>
      <linearGradient id="g3Muscle-${p}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8d9188"/><stop offset=".62" stop-color="#62675f"/><stop offset="1" stop-color="#434842"/>
      </linearGradient>
    </defs>`;
  }
  function bodyFrame(gender='male',side='front'){
    const female=gender==='female',back=side==='back';
    const head=female
      ?'M96 24C96 12 102 5 110 5c9 0 16 8 17 19 1 11-4 21-11 27-4 3-8 3-12 0-7-5-9-14-8-24 0-1 0-2 0-3Z'
      :'M95 24C95 11 101 4 110 4c10 0 17 8 18 20 1 12-4 22-12 28-4 3-9 3-13 0-7-5-10-15-9-25 0-1 1-2 1-3Z';
    const torso=female
      ?'M88 69C75 70 64 76 57 87c-6 10-7 24-3 39l9 28c4 14 9 27 16 39 8 12 18 19 31 19s23-7 31-19c7-12 12-25 16-39l9-28c4-15 3-29-3-39-7-11-18-17-31-18l-10-3c-2 7-6 12-12 12s-10-5-12-12Z'
      :'M84 68C69 70 57 76 48 87c-7 10-7 23-2 37l12 27c5 12 10 25 17 37 9 13 20 20 35 20s26-7 35-20c7-12 12-25 17-37l12-27c5-14 5-27-2-37-9-11-21-17-36-19l-14-3c-2 7-6 12-12 12s-10-5-12-12Z';
    const pelvis=female
      ?'M78 198c9 10 20 15 32 15s23-5 32-15l16 27c-10 17-26 25-48 25s-38-8-48-25Z'
      :'M76 198c10 10 21 15 34 15s24-5 34-15l11 24c-9 15-24 23-45 23s-36-8-45-23Z';
    const leftArm=female
      ?'M59 91c-9 5-14 17-17 33l-7 43c-3 15-2 27 4 34 3 4 7 5 12 2l7-6 8-36 8-32 4-29Z'
      :'M55 91c-10 5-15 17-18 33l-8 45c-3 16-2 28 4 36 3 4 8 6 13 3l8-6 8-38 9-34 5-31Z';
    const rightArm=female
      ?'M161 91c9 5 14 17 17 33l7 43c3 15 2 27-4 34-3 4-7 5-12 2l-7-6-8-36-8-32-4-29Z'
      :'M165 91c10 5 15 17 18 33l8 45c3 16 2 28-4 36-3 4-8 6-13 3l-8-6-8-38-9-34-5-31Z';
    const leftLeg=female
      ?'M78 239c11-4 22 2 29 17l-5 54c-2 18-5 35-6 51l-4 52H69l-5-51 2-54 2-36c1-15 4-27 10-33Z'
      :'M77 239c12-5 24 2 31 17l-6 54c-2 18-5 35-6 51l-4 52H66l-4-51 2-54 3-38c1-15 4-26 10-31Z';
    const rightLeg=female
      ?'M142 239c-11-4-22 2-29 17l5 54c2 18 5 35 6 51l4 52h23l5-51-2-54-2-36c-1-15-4-27-10-33Z'
      :'M143 239c-12-5-24 2-31 17l6 54c2 18 5 35 6 51l4 52h26l4-51-2-54-3-38c-1-15-4-26-10-31Z';
    return `<path class="g3-base g3-head" d="${head}"/>
      <path class="g3-hair" d="${female?'M96 24c1-14 8-21 16-21 10 0 17 8 18 21-5-5-10-7-15-5-4-4-10-5-14-1-2 2-4 4-5 6Z':'M94 23c2-13 8-21 17-21 10 0 18 8 20 21-5-4-9-5-13-4-3-4-9-6-14-2-4 2-7 4-10 6Z'}"/>
      <path class="g3-base g3-neck" d="M100 49c2 8 1 14-6 22 4 7 9 11 16 11s12-4 16-11c-7-8-8-14-6-22Z"/>
      <path class="g3-base g3-torso" d="${torso}"/>
      <path class="g3-limb g3-arm" d="${leftArm}"/><path class="g3-limb g3-arm" d="${rightArm}"/>
      <path class="g3-base g3-pelvis" d="${pelvis}"/>
      <path class="g3-limb g3-leg" d="${leftLeg}"/><path class="g3-limb g3-leg" d="${rightLeg}"/>
      <path class="g3-sculpt-line" d="${back?'M110 79v126M70 96q40 22 80 0M76 120q34 20 68 0M83 178q27 10 54 0':'M110 79v126M70 96q40 20 80 0M79 114q31 14 62 0M86 153q24 8 48 0M88 184q22 8 44 0'}"/>
      <path class="g3-fine" d="M66 107q17 10 30 13m58-13q-17 10-30 13M74 278q17 9 31 5m41-5q-17 9-31 5M70 354q14 8 25 4m55-4q-14 8-25 4"/>`;
  }
  function frontSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model" data-garang-classical-model="2" data-garang-body-v2="front" data-garang-anatomy-v3="front" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 전면 퍼포먼스 신체 지도">
    ${defs('front')}${bodyFrame(gender,'front')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M70 84c8-8 18-11 28-8l-6 24c-9 3-18-1-25-10Zm80 0c-8-8-18-11-28-8l6 24c9 3 18-1 25-10Z':'M58 84c12-10 27-13 39-8l-8 29c-13 4-25-2-35-13Zm104 0c-12-10-27-13-39-8l8 29c13 4 25-2 35-13Z'}"/>
    <path class="g3-muscle muscle-chest" d="M78 94c10-9 21-12 32-9v42c-18 2-31-7-36-22Zm64 0c-10-9-21-12-32-9v42c18 2 31-7 36-22Z"/>
    <path class="g3-muscle muscle-biceps" d="M53 116c9 1 14 11 12 25l-8 31c-7 1-12-6-11-16l3-29Zm114 0c-9 1-14 11-12 25l8 31c7 1 12-6 11-16l-3-29Z"/>
    <path class="g3-muscle muscle-triceps" d="M41 126c6 5 8 13 6 24l-7 31-7-3 5-36Zm138 0c-6 5-8 13-6 24l7 31 7-3-5-36Z"/>
    <path class="g3-muscle muscle-core" d="M84 123c8 5 16 8 26 8s18-3 26-8l4 31-5 43c-8 8-16 12-25 12s-17-4-25-12l-5-43Z"/>
    <path class="g3-sculpt-line" d="M110 133v67M91 153q19 6 38 0M90 177q20 7 40 0"/>
    <path class="g3-muscle muscle-legs" d="M76 252c13-5 24 2 32 19l-7 59-18 5-12-45Zm68 0c-13-5-24 2-32 19l7 59 18 5 12-45ZM72 340c11-5 19 3 20 17l-7 52H69l-3-38Zm76 0c-11-5-19 3-20 17l7 52h16l3-38Z"/>
    <path class="g3-highlight" d="M79 99q16-8 31-6m31 6q-16-8-31-6M88 138q22 6 44 0M80 265q14 7 27 4m33-4q-14 7-27 4"/>
  </svg>`;}
  function backSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model" data-garang-classical-model="2" data-garang-body-v2="back" data-garang-anatomy-v3="back" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 후면 퍼포먼스 신체 지도">
    ${defs('back')}${bodyFrame(gender,'back')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M70 84c8-8 18-11 28-8l-6 24c-9 3-18-1-25-10Zm80 0c-8-8-18-11-28-8l6 24c9 3 18-1 25-10Z':'M58 84c12-10 27-13 39-8l-8 29c-13 4-25-2-35-13Zm104 0c-12-10-27-13-39-8l8 29c13 4 25-2 35-13Z'}"/>
    <path class="g3-muscle muscle-back" d="M87 79c7-8 15-12 23-12s16 4 23 12l11 28-14 34-20-22-20 22-14-34ZM75 104c13-6 24 0 35 15-10 17-17 37-20 59l-23-28 3-31Zm70 0c-13-6-24 0-35 15 10 17 17 37 20 59l23-28-3-31Z"/>
    <path class="g3-muscle muscle-triceps" d="M50 115c9 4 13 13 10 27l-9 33c-7-1-11-8-9-18l5-31Zm120 0c-9 4-13 13-10 27l9 33c7-1 11-8 9-18l-5-31Z"/>
    <path class="g3-muscle muscle-core" d="M89 151h42l8 36-29 24-29-24Z"/>
    <path class="g3-muscle muscle-legs" d="M76 226c13-4 25 2 34 21-8 17-18 26-30 30l-17-19Zm68 0c-13-4-25 2-34 21 8 17 18 26 30 30l17-19ZM72 271c12-5 23 2 31 19l-7 43-18 4-11-40Zm76 0c-12-5-23 2-31 19l7 43 18 4 11-40ZM71 340c12-5 20 3 21 18l-7 51H68l-3-38Zm78 0c-12-5-20 3-21 18l7 51h17l3-38Z"/>
    <path class="g3-highlight" d="M87 88q23 9 46 0M77 116q20 9 33 23m33-23q-20 9-33 23M77 284q15 8 28 5m38-5q-15 8-28 5"/>
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
