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
      ?'M110 9C100 9 94 17 94 29c0 11 4 20 11 26 2 2 4 3 5 3s3-1 5-3c7-6 11-15 11-26 0-12-6-20-16-20Z'
      :'M110 8C99 8 92 16 92 29c0 12 4 21 11 27 2 2 5 3 7 3s5-1 7-3c7-6 11-15 11-27 0-13-7-21-18-21Z';
    const neck=female
      ?'M103 53c1 7 0 12-4 18-6 2-12 4-16 7 7 9 16 13 27 13s20-4 27-13c-4-3-10-5-16-7-4-6-5-11-4-18-4 4-8 6-12 6s-8-2-12-6Z'
      :'M102 54c2 7 1 12-3 18-7 2-13 4-18 7 7 9 17 14 29 14s22-5 29-14c-5-3-11-5-18-7-4-6-5-11-3-18-4 4-9 7-14 7s-10-3-14-7Z';
    const trunk=female
      ?'M82 77C69 79 59 84 53 93c-6 10-6 23-2 38l9 31c4 16 10 31 20 43 5 7 7 15 4 24l-5 13c9 9 19 14 31 14s22-5 31-14l-5-13c-3-9-1-17 4-24 10-12 16-27 20-43l9-31c4-15 4-28-2-38-6-9-16-14-29-16l-14-3c-2 9-7 15-14 15s-12-6-14-15Z'
      :'M78 76C64 79 53 84 47 94c-6 10-6 23-2 38l10 32c5 17 12 32 23 44 5 6 7 14 4 23l-6 14c10 9 21 14 34 14s24-5 34-14l-6-14c-3-9-1-17 4-23 11-12 18-27 23-44l10-32c4-15 4-28-2-38-6-10-17-15-31-18l-17-3c-2 10-8 17-15 17s-13-7-15-17Z';
    const leftArm=female
      ?'M57 92c-9 3-14 12-17 25-3 14-5 31-8 47l-4 23c-2 11 0 19 5 24 4 4 9 3 13-1l7-8c4-10 6-22 8-34l7-37c3-15 1-28-5-35-2-3-4-4-6-4Z'
      :'M54 91c-10 3-16 12-19 26-3 15-5 32-8 49l-4 24c-2 12 0 21 6 26 4 4 10 3 14-1l8-9c4-11 7-23 9-36l7-38c3-16 1-29-5-36-3-3-5-5-8-5Z';
    const rightArm=female
      ?'M163 92c9 3 14 12 17 25 3 14 5 31 8 47l4 23c2 11 0 19-5 24-4 4-9 3-13-1l-7-8c-4-10-6-22-8-34l-7-37c-3-15-1-28 5-35 2-3 4-4 6-4Z'
      :'M166 91c10 3 16 12 19 26 3 15 5 32 8 49l4 24c2 12 0 21-6 26-4 4-10 3-14-1l-8-9c-4-11-7-23-9-36l-7-38c-3-16-1-29 5-36 3-3 5-5 8-5Z';
    const leftLeg=female
      ?'M82 239c-8 10-11 24-11 40 0 15 3 31 6 46 1 10-2 22-4 35-2 15-2 31-1 45 1 11 5 17 12 18h10c5-4 6-11 6-20l2-31c1-15 4-29 8-43v-48c-2-20-10-34-20-41-3-2-6-2-8-1Z'
      :'M80 238c-9 11-13 25-13 42 0 16 4 32 7 48 1 10-2 23-4 36-2 15-2 31-1 44 1 11 5 17 12 18h12c5-4 7-11 7-20l2-33c1-15 4-30 8-44v-49c-2-20-10-35-21-42-3-2-6-2-9 0Z';
    const rightLeg=female
      ?'M138 239c8 10 11 24 11 40 0 15-3 31-6 46-1 10 2 22 4 35 2 15 2 31 1 45-1 11-5 17-12 18h-10c-5-4-6-11-6-20l-2-31c-1-15-4-29-8-43v-48c2-20 10-34 20-41 3-2 6-2 8-1Z'
      :'M140 238c9 11 13 25 13 42 0 16-4 32-7 48-1 10 2 23 4 36 2 15 2 31 1 44-1 11-5 17-12 18h-12c-5-4-7-11-7-20l-2-33c-1-15-4-30-8-44v-49c2-20 10-35 21-42 3-2 6-2 9 0Z';
    const leftFoot=female
      ?'M72 405c0 9-2 15-6 20 6 4 20 4 31 1l-2-9-10-8Z'
      :'M69 407c0 8-2 14-6 19 7 4 22 4 34 0l-2-9-12-8Z';
    const rightFoot=female
      ?'M148 405c0 9 2 15 6 20-6 4-20 4-31 1l2-9 10-8Z'
      :'M151 407c0 8 2 14 6 19-7 4-22 4-34 0l2-9 12-8Z';
    const face=back?'M101 36q9 4 18 0':'M99 30q11 6 22 0M104 43q6 4 12 0';
    const torsoLines=back
      ?'M110 88v135M82 101q28 16 56 0M86 129q24 13 48 0M91 184q19 9 38 0'
      :'M110 91v129M79 101q31 13 62 0M86 131q24 10 48 0M88 157q22 8 44 0M91 184q19 7 38 0';
    return `<path class="g3-base g3-head" d="${head}"/>
      <path class="g3-base g3-neck" d="${neck}"/>
      <path class="g3-base g3-torso g3-human-trunk" d="${trunk}"/>
      <path class="g3-limb g3-arm" d="${leftArm}"/><path class="g3-limb g3-arm" d="${rightArm}"/>
      <path class="g3-limb g3-leg" d="${leftLeg}"/><path class="g3-limb g3-leg" d="${rightLeg}"/>
      <path class="g3-base g3-foot" d="${leftFoot}"/><path class="g3-base g3-foot" d="${rightFoot}"/>
      <path class="g3-anatomy-line g3-face-line" d="${face}"/>
      <path class="g3-anatomy-line" d="${torsoLines}"/>
      <path class="g3-fine" d="M49 121q9 7 15 17m107-17q-9 7-15 17M78 286q14 7 29 4m35-4q-14 7-29 4M76 350q12 7 23 3m45-3q-12 7-23 3"/>`;
  }
  function frontSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human" data-garang-classical-model="3" data-garang-body-v2="front" data-garang-anatomy-v3="front" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 전면 실제 인체 기반 근육 지도">
    ${defs('front')}${bodyFrame(gender,'front')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M61 88c9-9 20-12 34-9l-5 23c-12 5-23 1-31-8Zm98 0c-9-9-20-12-34-9l5 23c12 5 23 1 31-8Z':'M53 88c12-10 27-14 43-9l-6 26c-15 5-28 1-39-9Zm114 0c-12-10-27-14-43-9l6 26c15 5 28 1 39-9Z'}"/>
    <path class="g3-muscle muscle-chest" d="M76 101c11-9 23-12 34-9v39c-18 2-31-6-37-19Zm68 0c-11-9-23-12-34-9v39c18 2 31-6 37-19Z"/>
    <path class="g3-muscle muscle-biceps" d="M47 112c8-1 14 7 14 19l-5 28c-3 10-9 15-14 10l1-29Zm126 0c-8-1-14 7-14 19l5 28c3 10 9 15 14 10l-1-29Z"/>
    <path class="g3-muscle muscle-triceps" d="M36 124c6 4 9 12 8 22l-5 33-8 10 3-43Zm148 0c-6 4-9 12-8 22l5 33 8 10-3-43Z"/>
    <path class="g3-muscle muscle-core" d="M86 126c8 5 16 8 24 8s16-3 24-8l5 29-5 48c-7 11-15 17-24 17s-17-6-24-17l-5-48Z"/>
    <path class="g3-anatomy-line" d="M92 139q18 6 36 0M91 161q19 7 38 0M93 184q17 6 34 0M82 198q8 11 15 17m41-17q-8 11-15 17"/>
    <path class="g3-muscle muscle-legs" d="M78 252c11-7 23-2 31 16l-3 54-18 11-15-45Zm64 0c-11-7-23-2-31 16l3 54 18 11 15-45ZM75 334c11-5 20 3 22 18l-5 51-18 4-5-39Zm70 0c-11-5-20 3-22 18l5 51 18 4 5-39Z"/>
    <path class="g3-highlight" d="M81 105q15-8 29-7m29 7q-15-8-29-7M90 143q20 6 40 0M79 267q14 8 29 5m33-5q-14 8-29 5M77 349q11 7 21 4m44-4q-11 7-21 4"/>
  </svg>`;}
  function backSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human" data-garang-classical-model="3" data-garang-body-v2="back" data-garang-anatomy-v3="back" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 후면 실제 인체 기반 근육 지도">
    ${defs('back')}${bodyFrame(gender,'back')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M61 88c9-9 20-12 34-9l-5 23c-12 5-23 1-31-8Zm98 0c-9-9-20-12-34-9l5 23c12 5 23 1 31-8Z':'M53 88c12-10 27-14 43-9l-6 26c-15 5-28 1-39-9Zm114 0c-12-10-27-14-43-9l6 26c15 5 28 1 39-9Z'}"/>
    <path class="g3-muscle muscle-back" d="M89 79c6-7 13-10 21-10s15 3 21 10l12 25-11 35-22-18-22 18-11-35Zm-13 28c13-8 24-3 34 14-9 17-15 37-18 59l-25-27 4-28Zm68 0c-13-8-24-3-34 14 9 17 15 37 18 59l25-27-4-28Z"/>
    <path class="g3-muscle muscle-triceps" d="M46 112c9 0 15 9 14 22l-6 30c-4 11-10 15-15 8l2-30Zm128 0c-9 0-15 9-14 22l6 30c4 11 10 15 15 8l-2-30Z"/>
    <path class="g3-muscle muscle-core" d="M88 153h44l7 35-29 29-29-29Z"/>
    <path class="g3-anatomy-line" d="M110 86v128M86 111q24 15 48 0M90 145q20 12 40 0M88 197q22 10 44 0"/>
    <path class="g3-muscle muscle-legs" d="M78 246c13-6 25 0 32 17-6 17-16 28-30 34l-14-22Zm64 0c-13-6-25 0-32 17 6 17 16 28 30 34l14-22ZM76 286c12-5 23 3 30 19l-5 34-19 9-13-39Zm68 0c-12-5-23 3-30 19l5 34 19 9 13-39ZM75 340c12-5 21 4 22 19l-5 47-18 4-5-39Zm70 0c-12-5-21 4-22 19l5 47 18 4 5-39Z"/>
    <path class="g3-highlight" d="M88 91q22 8 44 0M78 119q18 8 32 22m32-22q-18 8-32 22M79 299q14 7 28 4m34-4q-14 7-28 4M77 354q11 7 21 4m44-4q-11 7-21 4"/>
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
