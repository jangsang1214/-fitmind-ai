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
        <stop offset="0" stop-color="#d3c8b7"/><stop offset=".32" stop-color="#a99e8e"/>
        <stop offset=".68" stop-color="#756e65"/><stop offset="1" stop-color="#4b4944"/>
      </linearGradient>
      <linearGradient id="g3Limb-${p}" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#706b63"/><stop offset=".45" stop-color="#b5aa99"/><stop offset="1" stop-color="#5b5852"/>
      </linearGradient>
      <linearGradient id="g3Muscle-${p}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8d9188"/><stop offset=".62" stop-color="#62675f"/><stop offset="1" stop-color="#434842"/>
      </linearGradient>
    </defs>`;
  }
  function bodyFrame(gender='male',side='front'){
    const female=gender==='female',back=side==='back';
    const torso=female
      ?'M91 68C78 69 68 75 62 86c-7 13-8 31-6 50l5 43c2 16 8 27 17 38 8 9 17 15 32 15s24-6 32-15c9-11 15-22 17-38l5-43c2-19 1-37-6-50-6-11-16-17-29-18l-10-2c-3 5-6 8-9 8s-6-3-9-8Z'
      :'M82 68C63 70 49 80 43 96c-5 14-4 31 1 49l9 34c4 16 12 29 23 38 9 7 20 10 34 10s25-3 34-10c11-9 19-22 23-38l9-34c5-18 6-35 1-49-6-16-20-26-39-28l-18-3c-2 7-6 11-10 11s-8-4-10-11Z';
    const pelvis=female
      ?'M77 211c9 8 20 12 33 12s24-4 33-12l11 22c-10 18-25 27-44 27s-34-9-44-27Z'
      :'M76 210c9 8 20 12 34 12s25-4 34-12l11 24c-10 17-25 26-45 26s-35-9-45-26Z';
    const leftArm=female?'M61 87c-10 5-15 18-18 37l-8 53c-2 13 1 21 9 24l8-4 9-45 11-40Z':'M51 91c-12 7-18 22-21 43l-8 48c-2 13 2 21 11 24l10-5 10-47 14-43Z';
    const rightArm=female?'M159 87c10 5 15 18 18 37l8 53c2 13-1 21-9 24l-8-4-9-45-11-40Z':'M169 91c12 7 18 22 21 43l8 48c2 13-2 21-11 24l-10-5-10-47-14-43Z';
    const leftLeg=female?'M78 244c13-4 23 2 31 18l-7 69-7 82H69l-4-58 2-65Z':'M75 247c14-5 26 2 34 19l-6 70-9 77H66l-3-58 4-67Z';
    const rightLeg=female?'M142 244c-13-4-23 2-31 18l7 69 7 82h26l4-58-2-65Z':'M145 247c-14-5-26 2-34 19l6 70 9 77h28l3-58-4-67Z';
    return `<ellipse class="g3-base g3-head" cx="110" cy="31" rx="${female?16:18}" ry="${female?21:23}"/>
      <path class="g3-hair" d="${female?'M94 27c2-17 28-24 34-5 0 8-2 12-5 16-1-13-7-20-16-20-6 0-10 3-13 9Z':'M91 28c1-16 11-25 21-25 12 0 22 8 24 22-5-5-9-6-13-5 0-6-6-9-11-7-3-5-11-4-13 2-5 0-8 5-8 13Z'}"/>
      <path class="g3-base g3-neck" d="M100 50c1 8 0 13-7 21 4 7 10 11 17 11s13-4 17-11c-7-8-8-13-7-21Z"/>
      <path class="g3-base g3-torso" d="${torso}"/>
      <path class="g3-limb g3-arm" d="${leftArm}"/><path class="g3-limb g3-arm" d="${rightArm}"/>
      <path class="g3-base g3-pelvis" d="${pelvis}"/>
      <path class="g3-limb g3-leg" d="${leftLeg}"/><path class="g3-limb g3-leg" d="${rightLeg}"/>
      <path class="g3-sculpt-line" d="M110 76v135${back?'M77 101q33 18 66 0M73 132q37 20 74 0':'M79 109q31 10 62 0M87 151q23 7 46 0M91 184q19 6 38 0'}"/>
      <path class="g3-fine" d="M72 102q14 11 27 14m49-14q-14 11-27 14M73 284q17 9 32 4m42-4q-17 9-32 4M71 357q13 9 24 5m54-5q-13 9-24 5"/>`;
  }
  function frontSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model" data-garang-classical-model="1" data-garang-body-v2="front" data-garang-anatomy-v3="front" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 전면 퍼포먼스 신체 지도">
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
  function backSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model" data-garang-classical-model="1" data-garang-body-v2="back" data-garang-anatomy-v3="back" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 후면 퍼포먼스 신체 지도">
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
