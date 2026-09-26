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
    const p=side==='front'?'f':side==='side'?'s':'b';
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
      <path class="g3-base g3-hand" d="M35 202c-5 5-8 12-9 20l1 18 4 7 3-2 1-14 2 16 4 2 1-18 2 15 4-2-1-22-4-14-5-6Z"/>
      <path class="g3-base g3-hand" d="M185 202c5 5 8 12 9 20l-1 18-4 7-3-2-1-14-2 16-4 2-1-18-2 15-4-2 1-22 4-14 5-6Z"/>
      <path class="g3-base g3-foot" d="${leftFoot}"/><path class="g3-base g3-foot" d="${rightFoot}"/>
      <path class="g3-anatomy-line g3-face-line" d="${face}"/>
      <path class="g3-anatomy-line" d="${torsoLines}"/>
      <path class="g3-fine" d="M49 121q9 7 15 17m107-17q-9 7-15 17M78 286q14 7 29 4m35-4q-14 7-29 4M76 350q12 7 23 3m45-3q-12 7-23 3"/>`;
  }
  function frontSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human" data-garang-classical-model="4" data-garang-body-v2="front" data-garang-anatomy-v3="front" data-garang-anatomy-v4="front" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 전면 실제 인체 기반 근육 지도">
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
  function backSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human" data-garang-classical-model="4" data-garang-body-v2="back" data-garang-anatomy-v3="back" data-garang-anatomy-v4="back" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 후면 실제 인체 기반 근육 지도">
    ${defs('back')}${bodyFrame(gender,'back')}
    <path class="g3-muscle muscle-shoulders" d="${female?'M61 88c9-9 20-12 34-9l-5 23c-12 5-23 1-31-8Zm98 0c-9-9-20-12-34-9l5 23c12 5 23 1 31-8Z':'M53 88c12-10 27-14 43-9l-6 26c-15 5-28 1-39-9Zm114 0c-12-10-27-14-43-9l6 26c15 5 28 1 39-9Z'}"/>
    <path class="g3-muscle muscle-back" d="M89 79c6-7 13-10 21-10s15 3 21 10l12 25-11 35-22-18-22 18-11-35Zm-13 28c13-8 24-3 34 14-9 17-15 37-18 59l-25-27 4-28Zm68 0c-13-8-24-3-34 14 9 17 15 37 18 59l25-27-4-28Z"/>
    <path class="g3-muscle muscle-triceps" d="M46 112c9 0 15 9 14 22l-6 30c-4 11-10 15-15 8l2-30Zm128 0c-9 0-15 9-14 22l6 30c4 11 10 15 15 8l-2-30Z"/>
    <path class="g3-muscle muscle-core" d="M88 153h44l7 35-29 29-29-29Z"/>
    <path class="g3-anatomy-line" d="M110 86v128M86 111q24 15 48 0M90 145q20 12 40 0M88 197q22 10 44 0"/>
    <path class="g3-muscle muscle-legs" d="M78 246c13-6 25 0 32 17-6 17-16 28-30 34l-14-22Zm64 0c-13-6-25 0-32 17 6 17 16 28 30 34l14-22ZM76 286c12-5 23 3 30 19l-5 34-19 9-13-39Zm68 0c-12-5-23 3-30 19l5 34 19 9 13-39ZM75 340c12-5 21 4 22 19l-5 47-18 4-5-39Zm70 0c-12-5-21 4-22 19l5 47 18 4 5-39Z"/>
    <path class="g3-highlight" d="M88 91q22 8 44 0M78 119q18 8 32 22m32-22q-18 8-32 22M79 299q14 7 28 4m34-4q-14 7-28 4M77 354q11 7 21 4m44-4q-11 7-21 4"/>
  </svg>`;}

  function sideSVG(gender='male'){const female=gender==='female';return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human g3-human-side" data-garang-classical-model="4" data-garang-body-v2="side" data-garang-anatomy-v3="side" data-garang-anatomy-v4="side" data-garang-gender="${gender}" viewBox="0 0 220 430" role="img" aria-label="${female?'여성':'남성'} 측면 실제 인체 기반 근육 지도">
    ${defs('side')}
    <path class="g3-base g3-head" d="${female?'M101 10c-9 2-15 10-15 22 0 10 4 18 10 24l3 12 16 1 4-14c7-4 12-11 13-18l11-4-10-6c-2-12-11-19-22-18Z':'M101 9c-10 2-16 10-16 23 0 10 4 19 11 25l3 13 17 1 4-15c8-4 13-11 14-19l12-4-11-7c-3-12-12-19-23-18Z'}"/>
    <path class="g3-base g3-neck" d="M100 60c2 10 0 17-7 24l7 17 21-4 7-19c-9-4-12-10-10-21-5 5-11 7-18 3Z"/>
    <path class="g3-base g3-human-trunk" d="${female?'M95 79c-12 5-18 15-20 29l5 48 8 43-8 30 13 23 22 9 24-12 10-20-7-18 2-33 8-37 1-27c0-16-5-28-15-35-13-10-29-12-43 0Z':'M94 78c-14 5-21 16-23 31l6 50 8 42-9 30 14 24 25 10 26-13 11-21-8-19 3-35 9-39 1-29c0-17-6-29-17-37-14-10-31-12-46 0Z'}"/>
    <path class="g3-shadow" d="M89 95c-5 26-3 53 5 80l2 36-8 24 15 14 7-45-2-63 7-44Z"/>
    <path class="g3-limb g3-arm" d="${female?'M128 87c13 3 20 14 21 30l3 43 9 36-3 19-8 13-7-4-1-18-8-32-11-38-3-31c0-10 3-16 8-18Z':'M130 86c14 3 22 15 23 32l3 44 10 38-4 20-9 13-8-5-1-18-9-33-12-40-3-32c0-10 4-17 10-19Z'}"/>
    <path class="g3-base g3-hand" d="M151 218c7 3 11 9 12 17l-2 17-4 8-4-1-1-14-2 14-4-2 1-18-3 14-4-3 3-22 4-8Z"/>
    <path class="g3-limb g3-leg g3-side-leg-far" d="${female?'M98 247c-7 17-8 36-3 56l6 35-5 42 1 34 17 1 5-35 3-44-1-38 3-35-10-17Z':'M97 247c-8 18-9 38-4 58l6 36-5 43 1 32 18 1 6-36 3-45-1-39 4-36-11-18Z'}"/>
    <path class="g3-limb g3-leg" d="${female?'M122 247c12 12 17 31 15 53l-5 39 7 40-4 36-18 1-4-35 2-44-4-38 2-36 9-16Z':'M124 247c13 12 18 32 16 55l-5 40 8 41-5 34-19 1-5-36 3-45-5-39 2-37 10-14Z'}"/>
    <path class="g3-base g3-foot" d="M95 407c-2 8-7 13-14 17 11 4 25 4 36 0l-3-11-10-7Z"/>
    <path class="g3-base g3-foot" d="M119 408c1 8 6 13 14 17 11 3 21 2 30-2-7-4-13-9-18-15l-13-3Z"/>
    <path class="g3-muscle muscle-shoulders" d="M119 82c15 1 26 9 29 22-7 11-17 15-29 10l-8-18Z"/>
    <path class="g3-muscle muscle-chest" d="M120 103c15 5 23 16 25 31l-3 21-23-6-9-27Z"/>
    <path class="g3-muscle muscle-back" d="M91 91c10 3 17 12 21 27l-6 49-18 32-11-41 1-42Z"/>
    <path class="g3-muscle muscle-biceps" d="M136 116c9 3 13 11 12 24l-3 27-10-1-8-29Z"/>
    <path class="g3-muscle muscle-triceps" d="M128 112c8 0 13 7 14 19l-7 39-11-15-6-25Z"/>
    <path class="g3-muscle muscle-core" d="M110 145c14 2 24 10 29 23l-5 40-14 31-25-7 5-34-7-32Z"/>
    <path class="g3-muscle muscle-legs" d="M117 257c14 9 20 24 18 44l-7 36-15-4-7-34 3-30Zm-14 74c10 0 17 8 18 22l-5 55-17 2-4-36 5-35Zm27 12c10 4 14 13 13 26l-7 39-16-1 1-35 4-25Z"/>
    <path class="g3-anatomy-line g3-face-line" d="M117 23l12 3 8 7-10 4-5 9-10 7"/>
    <path class="g3-anatomy-line" d="M102 82q17 9 31 23M106 128q20 9 34 5M100 163q19 8 35 4M98 196q17 8 33 3M95 231q19 7 37 2M111 274q13 10 22 26M112 340q12 8 21 5"/>
    <path class="g3-highlight" d="M123 94q13 5 20 14M120 119q15 7 22 19M105 153q14 7 28 6M117 268q11 10 15 24M103 348q9 7 16 5"/>
  </svg>`;}


  function v5Defs(side){
    const p=side==='front'?'5f':side==='side'?'5s':'5b';
    return `<defs>
      <linearGradient id="g5Body-${p}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#f0ede6"/><stop offset=".28" stop-color="#d4d0c7"/>
        <stop offset=".62" stop-color="#a8a49b"/><stop offset=".84" stop-color="#7e7b74"/><stop offset="1" stop-color="#625f5a"/>
      </linearGradient>
      <linearGradient id="g5Muscle-${p}" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#c0b9ad"/><stop offset=".52" stop-color="#9a948a"/><stop offset="1" stop-color="#736f68"/>
      </linearGradient>
      <radialGradient id="g5Volume-${p}" cx=".42" cy=".24" r=".86">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".24"/><stop offset=".58" stop-color="#ffffff" stop-opacity=".04"/><stop offset="1" stop-color="#11130f" stop-opacity=".18"/>
      </radialGradient>
    </defs>`;
  }

  const v5FrontOutlineMale='M130 12C111 12 101 26 101 47c0 15 7 28 15 35l-1 9c-11 3-20 7-29 12-11 5-21 12-27 24-5 11-7 24-8 41l-5 49c-1 19-3 35-6 50-2 13 0 24 6 31l1 18c0 8 3 15 8 18 5-3 7-11 7-19l1-19c5-10 9-24 12-38l7-43c3-16 5-31 7-45 2 20 5 39 9 57 3 16 6 29 3 42-3 11-8 22-12 31-5 12-7 28-7 47 0 22 6 44 10 63 2 13-1 29-4 46-2 14-2 27 0 39 1 8 5 14 11 16 6-1 9-7 10-16l4-44c3-21 6-41 9-60l4-61c1-14 2-23 4-25 2 2 3 11 4 25l4 61c3 19 6 39 9 60l4 44c1 9 4 15 10 16 6-2 10-8 11-16 2-12 2-25 0-39-3-17-6-33-4-46 4-19 10-41 10-63 0-19-2-35-7-47-4-9-9-20-12-31-3-13 0-26 3-42 4-18 7-37 9-57 2 14 4 29 7 45l7 43c3 14 7 28 12 38l1 19c0 8 2 16 7 19 5-3 8-10 8-18l1-18c6-7 8-18 6-31-3-15-5-31-6-50l-5-49c-1-17-3-30-8-41-6-12-16-19-27-24-9-5-18-9-29-12l-1-9c8-7 15-20 15-35 0-21-10-35-29-35Z';
  const v5FrontOutlineFemale='M130 12C112 12 102 26 102 47c0 15 6 28 14 35l-1 10c-10 3-19 7-28 12-10 6-18 13-23 24-4 11-6 24-7 40l-4 49c-1 18-3 34-6 49-2 12 0 23 5 30l1 18c0 8 3 14 7 17 5-3 7-10 7-18l1-18c4-10 8-23 11-37l7-42c3-16 5-31 6-44 3 20 6 39 10 56 3 15 6 28 3 40-3 10-8 21-13 30-6 12-9 28-9 47 0 22 7 44 11 63 3 13 0 29-3 46-2 14-2 27 0 39 1 8 5 14 11 16 6-1 9-7 10-16l4-44c3-21 6-41 9-60l4-61c1-14 2-23 4-25 2 2 3 11 4 25l4 61c3 19 6 39 9 60l4 44c1 9 4 15 10 16 6-2 10-8 11-16 2-12 2-25 0-39-3-17-6-33-3-46 4-19 11-41 11-63 0-19-3-35-9-47-5-9-10-20-13-30-3-12 0-25 3-40 4-17 7-36 10-56 1 13 3 28 6 44l7 42c3 14 7 27 11 37l1 18c0 8 2 15 7 18 4-3 7-9 7-17l1-18c5-7 7-18 5-30-3-15-5-31-6-49l-4-49c-1-16-3-29-7-40-5-11-13-18-23-24-9-5-18-9-28-12l-1-10c8-7 14-20 14-35 0-21-10-35-28-35Z';

  function v5FrontSVG(gender='male'){
    const female=gender==='female',outline=female?v5FrontOutlineFemale:v5FrontOutlineMale;
    return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human g5-anatomy" data-garang-classical-model="5" data-garang-body-v2="front" data-garang-anatomy-v5="front" data-garang-gender="${gender}" viewBox="0 0 260 520" role="img" aria-label="${female?'여성':'남성'} 전면 해부학 기반 근육 지도">
      ${v5Defs('front')}
      <path class="g5-silhouette g3-base g3-human-trunk" d="${outline}"/>
      <path class="g5-volume" d="${outline}"/>
      <path class="g5-landmark" d="M116 84q14 9 28 0M89 113q20-12 41-6m41 6q-20-12-41-6M95 155q35 17 70 0M101 206q29 13 58 0M104 249q26 10 52 0M102 285q28 12 56 0"/>
      <path class="g5-face" d="M113 39q17-8 34 0M118 52q12 5 24 0M122 66q8 5 16 0"/>
      <path class="g3-muscle muscle-shoulders" d="${female?'M78 111c13-11 27-12 42-5l-9 32c-15 7-29 1-38-11Zm104 0c-13-11-27-12-42-5l9 32c15 7 29 1 38-11Z':'M70 109c16-12 33-13 50-4l-10 35c-18 7-34 0-44-14Zm120 0c-16-12-33-13-50-4l10 35c18 7 34 0 44-14Z'}"/>
      <path class="g3-muscle muscle-chest" d="${female?'M92 126c12-9 25-12 38-8v40c-17 5-32 1-44-13Zm76 0c-12-9-25-12-38-8v40c17 5 32 1 44-13Z':'M86 125c14-10 29-13 44-8v42c-20 6-37 1-50-14Zm88 0c-14-10-29-13-44-8v42c20 6 37 1 50-14Z'}"/>
      <path class="g3-muscle muscle-biceps" d="M67 145c11 0 17 11 16 28l-7 39c-4 13-11 19-18 10l3-40Zm126 0c-11 0-17 11-16 28l7 39c4 13 11 19 18 10l-3-40Z"/>
      <path class="g3-muscle muscle-triceps" d="M56 154c8 5 11 17 9 32l-7 42-10 15 5-56Zm148 0c-8 5-11 17-9 32l7 42 10 15-5-56Z"/>
      <path class="g3-muscle muscle-core" d="M108 166c7 4 14 6 22 6s15-2 22-6l8 40-6 60-24 25-24-25-6-60Zm-10 22c7 11 9 28 7 50l-5 28-14-22 4-40Zm64 0c-7 11-9 28-7 50l5 28 14-22-4-40Z"/>
      <path class="g5-segment" d="M113 184q17 6 34 0M111 205q19 7 38 0M112 227q18 7 36 0M114 250q16 6 32 0M130 174v109"/>
      <path class="g3-muscle muscle-legs" d="M95 295c11-10 24-8 31 7l-5 67-24 20-16-61Zm70 0c-11-10-24-8-31 7l5 67 24 20 16-61ZM90 386c13-8 24 1 27 19l-6 70-21 7-8-51Zm80 0c-13-8-24 1-27 19l6 70 21 7 8-51Z"/>
      <path class="g5-segment" d="M98 314q15 10 27 7M162 314q-15 10-27 7M94 351q15 11 29 7M166 351q-15 11-29 7M93 407q12 9 23 6M167 407q-12 9-23 6M92 447q11 8 20 4M168 447q-11 8-20 4"/>
      <path class="g5-hand-detail" d="M47 297l3 20m3-22 2 22m4-24 1 21M213 297l-3 20m-3-22-2 22m-4-24-1 21"/>
      <path class="g5-foot-detail" d="M89 498q10 8 22 5m60-5q-10 8-22 5"/>
    </svg>`;
  }

  function v5BackSVG(gender='male'){
    const female=gender==='female',outline=female?v5FrontOutlineFemale:v5FrontOutlineMale;
    return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human g5-anatomy" data-garang-classical-model="5" data-garang-body-v2="back" data-garang-anatomy-v5="back" data-garang-gender="${gender}" viewBox="0 0 260 520" role="img" aria-label="${female?'여성':'남성'} 후면 해부학 기반 근육 지도">
      ${v5Defs('back')}
      <path class="g5-silhouette g3-base g3-human-trunk" d="${outline}"/>
      <path class="g5-volume" d="${outline}"/>
      <path class="g5-face" d="M114 47q16 8 32 0M130 77v18"/>
      <path class="g3-muscle muscle-shoulders" d="${female?'M78 111c13-11 27-12 42-5l-8 33c-16 6-30 0-39-12Zm104 0c-13-11-27-12-42-5l8 33c16 6 30 0 39-12Z':'M70 109c16-12 33-13 50-4l-9 36c-19 6-35-1-45-15Zm120 0c-16-12-33-13-50-4l9 36c19 6 35-1 45-15Z'}"/>
      <path class="g3-muscle muscle-back" d="M109 96c7-7 14-11 21-11s14 4 21 11l14 34-16 28-19-14-19 14-16-28Zm-18 34c14-9 26-5 39 14-10 19-18 43-22 72l-30-36 6-34Zm78 0c-14-9-26-5-39 14 10 19 18 43 22 72l30-36-6-34Z"/>
      <path class="g3-muscle muscle-triceps" d="M67 144c11 0 17 11 16 29l-8 42c-5 14-12 19-18 10l4-41Zm126 0c-11 0-17 11-16 29l8 42c5 14 12 19 18 10l-4-41Z"/>
      <path class="g3-muscle muscle-core" d="M107 210h46l8 46-31 33-31-33Z"/>
      <path class="g5-segment" d="M130 93v190M103 120q27 18 54 0M102 157q28 18 56 0M104 204q26 15 52 0"/>
      <path class="g3-muscle muscle-legs" d="M95 291c15-9 27-2 35 18-8 19-21 32-39 38l-17-28Zm70 0c-15-9-27-2-35 18 8 19 21 32 39 38l17-28ZM94 343c14-7 27 3 34 24l-7 42-24 12-17-48Zm72 0c-14-7-27 3-34 24l7 42 24 12 17-48ZM90 410c13-8 24 2 27 20l-6 50-21 6-8-40Zm80 0c-13-8-24 2-27 20l6 50 21 6 8-40Z"/>
      <path class="g5-segment" d="M98 306q15 10 30 8M162 306q-15 10-30 8M96 363q16 10 31 7M164 363q-16 10-31 7M92 428q13 8 24 5M168 428q-13 8-24 5"/>
      <path class="g5-hand-detail" d="M47 297l3 20m3-22 2 22m4-24 1 21M213 297l-3 20m-3-22-2 22m-4-24-1 21"/>
      <path class="g5-foot-detail" d="M89 498q10 8 22 5m60-5q-10 8-22 5"/>
    </svg>`;
  }

  function v5SideSVG(gender='male'){
    const female=gender==='female';
    return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human g5-anatomy g5-side" data-garang-classical-model="5" data-garang-body-v2="side" data-garang-anatomy-v5="side" data-garang-gender="${gender}" viewBox="0 0 260 520" role="img" aria-label="${female?'여성':'남성'} 측면 해부학 기반 근육 지도">
      ${v5Defs('side')}
      <path class="g5-silhouette g3-base g3-human-trunk" d="${female?'M117 12c-15 2-25 16-25 37 0 14 6 27 15 35l2 12c-12 5-21 15-26 29-6 17-5 38-1 61l7 43-9 31c-4 14-3 28 4 39 5 8 12 14 21 17-6 18-8 38-5 60l6 38-5 45c-2 18 1 36 9 50 6 10 13 13 21 11l-3-60 5-48-3-42 5-48 6 43 12 50-4 51 6 51c2 14 8 20 16 19 7-2 11-9 11-21l-3-48 5-48 8-45c3-24 1-45-6-64-7-20-16-34-27-43l8-32 3-42c1-18-2-33-8-45-6-13-15-22-27-27l3-12c9-7 16-19 18-31l10-3-8-8c-1-17-10-28-23-29Z':'M116 12c-16 2-26 16-26 38 0 15 6 28 16 36l2 12c-13 5-23 15-29 30-6 18-5 40-1 64l8 44-10 32c-4 15-3 30 4 42 6 9 13 15 22 18-7 19-9 40-6 63l6 39-5 46c-2 19 1 37 10 52 6 10 14 13 22 11l-3-61 5-50-3-44 5-50 7 45 13 52-4 53 6 52c2 15 8 21 17 20 8-2 12-10 12-22l-3-50 5-50 9-47c3-25 1-47-6-67-7-21-17-36-29-45l9-34 3-44c1-19-2-35-9-48-7-14-17-23-30-28l3-13c10-8 17-20 19-33l11-4-9-8c-1-18-11-30-25-31Z'}"/>
      <path class="g5-volume" d="M105 101c22-11 47-3 60 22 9 18 8 43 1 66l-8 27 8 34-6 46-24 17-31-13-10-40 8-39-8-35-4-42c-2-20 3-34 14-43Z"/>
      <path class="g3-muscle muscle-shoulders" d="M128 104c17 1 29 11 33 27-8 13-20 18-34 11l-11-22Z"/>
      <path class="g3-muscle muscle-chest" d="M130 132c17 5 26 19 28 39l-4 28-27-7-10-35Z"/>
      <path class="g3-muscle muscle-back" d="M104 118c12 3 21 15 25 34l-8 61-22 42-15-52 3-50Z"/>
      <path class="g3-muscle muscle-biceps" d="M149 151c10 3 15 14 14 30l-4 35-12-2-10-37Z"/>
      <path class="g3-muscle muscle-triceps" d="M139 145c10 1 16 10 16 25l-8 49-14-20-7-34Z"/>
      <path class="g3-muscle muscle-core" d="M119 191c17 2 29 12 35 29l-6 50-17 40-31-10 7-42-9-40Z"/>
      <path class="g3-muscle muscle-legs" d="M126 316c16 10 23 30 21 56l-9 46-18-5-9-42 4-38Zm-17 91c12 1 20 11 21 29l-6 68-20 2-5-46 6-43Zm34 15c12 5 17 17 15 33l-8 49-19-2 1-44 5-32Z"/>
      <path class="g5-face" d="M122 28l13 3 10 8-11 5-6 11-11 8"/>
      <path class="g5-segment" d="M111 108q20 11 36 27M114 161q24 10 41 6M107 206q22 9 42 5M104 250q20 9 39 4M107 294q18 8 37 3M119 336q16 12 25 30M120 424q14 9 25 6"/>
    </svg>`;
  }


  // Body Model v6 mesh layer — visual geometry is separated from interaction/highlight zones.
  // Current mesh coverage is male FRONT/SIDE; unsupported views intentionally fall back to v5.
  function v6ZoneMarkup(side='front',gender='male'){
    const female=gender==='female';
    if(side==='side'){
      const dx=female?18:0;
      return `<path class="g3-muscle muscle-shoulders" d="M${300+dx} 238 C${342+dx} 215 ${392+dx} 232 ${418+dx} 282 C${402+dx} 315 ${365+dx} 332 ${325+dx} 318 C${302+dx} 300 ${294+dx} 270 ${300+dx} 238 Z"/>
        <path class="g3-muscle muscle-chest" d="M${332+dx} 298 C${375+dx} 286 ${413+dx} 307 ${423+dx} 354 C${426+dx} 384 ${418+dx} 414 ${402+dx} 435 C${368+dx} 436 ${343+dx} 414 ${331+dx} 379 Z"/>
        <path class="g3-muscle muscle-back" d="M${272+dx} 300 C${303+dx} 276 ${332+dx} 291 ${342+dx} 332 L${334+dx} 494 C${316+dx} 536 ${286+dx} 548 ${258+dx} 515 L${252+dx} 357 Z"/>
        <path class="g3-muscle muscle-biceps" d="M${401+dx} 362 C${433+dx} 351 ${455+dx} 382 ${454+dx} 431 C${452+dx} 464 ${443+dx} 493 ${428+dx} 513 C${407+dx} 507 ${397+dx} 480 ${397+dx} 445 Z"/>
        <path class="g3-muscle muscle-triceps" d="M${379+dx} 349 C${408+dx} 345 ${430+dx} 372 ${433+dx} 414 C${435+dx} 451 ${427+dx} 486 ${412+dx} 507 C${392+dx} 495 ${380+dx} 464 ${376+dx} 421 Z"/>
        <path class="g3-muscle muscle-core" d="M${296+dx} 426 C${337+dx} 411 ${382+dx} 423 ${397+dx} 471 L${392+dx} 603 C${365+dx} 637 ${326+dx} 641 ${296+dx} 612 C${282+dx} 572 ${281+dx} 496 ${296+dx} 426 Z"/>
        <path class="g3-muscle muscle-legs" d="M${268+dx} 626 C${310+dx} 603 ${351+dx} 625 ${362+dx} 699 L${350+dx} 824 L${329+dx} 1009 C${307+dx} 1029 ${280+dx} 1019 ${269+dx} 985 L${268+dx} 834 L${246+dx} 724 C${245+dx} 681 ${252+dx} 648 ${268+dx} 626 Z"/>`;
    }
    if(side==='back')return `<path class="g3-muscle muscle-shoulders" d="${female?'M205 255 C242 226 292 222 336 248 L326 326 C286 344 239 336 201 304 Z M515 255 C478 226 428 222 384 248 L394 326 C434 344 481 336 519 304 Z':'M195 248 C238 218 292 214 338 244 L326 332 C281 351 230 340 188 300 Z M525 248 C482 218 428 214 382 244 L394 332 C439 351 490 340 532 300 Z'}"/>
      <path class="g3-muscle muscle-back" d="M292 281 C320 254 340 244 360 247 C380 244 400 254 428 281 L462 364 C448 415 420 467 390 513 L360 477 L330 513 C300 467 272 415 258 364 Z M241 346 C279 322 315 340 337 384 C312 433 297 487 292 548 L226 505 L222 405 Z M479 346 C441 322 405 340 383 384 C408 433 423 487 428 548 L494 505 L498 405 Z"/>
      <path class="g3-muscle muscle-triceps" d="M130 356 C165 347 187 380 184 431 L171 497 C157 527 135 525 122 498 L118 410 Z M590 356 C555 347 533 380 536 431 L549 497 C563 527 585 525 598 498 L602 410 Z"/>
      <path class="g3-muscle muscle-core" d="M300 520 C323 538 338 545 360 545 C382 545 397 538 420 520 L435 627 L360 702 L285 627 Z"/>
      <path class="g3-muscle muscle-legs" d="M254 636 C291 610 329 622 352 678 C336 734 304 771 258 793 L219 727 Z M466 636 C429 610 391 622 368 678 C384 734 416 771 462 793 L501 727 Z M247 795 C285 777 320 806 332 870 L317 1009 L263 1026 L229 905 Z M473 795 C435 777 400 806 388 870 L403 1009 L457 1026 L491 905 Z"/>`;
    return `<path class="g3-muscle muscle-shoulders" d="${female?'M205 255 C242 226 292 222 336 248 L326 326 C286 344 239 336 201 304 Z M515 255 C478 226 428 222 384 248 L394 326 C434 344 481 336 519 304 Z':'M210 246 C244 220 291 218 335 244 L326 314 C294 333 250 329 216 307 C202 290 200 266 210 246 Z M510 246 C476 220 429 218 385 244 L394 314 C426 333 470 329 504 307 C518 290 520 266 510 246 Z'}"/>
      <path class="g3-muscle muscle-chest" d="${female?'M266 294 C292 275 326 270 357 284 L357 392 C328 407 298 404 272 389 C251 377 242 353 248 326 C251 313 257 302 266 294 Z M454 294 C428 275 394 270 363 284 L363 392 C392 407 422 404 448 389 C469 377 478 353 472 326 C469 313 463 302 454 294 Z':'M268 289 C293 272 326 270 354 284 L354 382 C330 397 301 396 276 382 C257 371 249 350 251 327 C253 311 259 298 268 289 Z M452 289 C427 272 394 270 366 284 L366 382 C390 397 419 396 444 382 C463 371 471 350 469 327 C467 311 461 298 452 289 Z'}"/>
      <path class="g3-muscle muscle-biceps" data-g71-zone-side="left" d="M190 314 C211 313 226 333 228 363 C227 394 217 421 201 441 C185 438 177 419 178 394 L184 340 C185 329 187 320 190 314 Z"/>
      <path class="g3-muscle muscle-biceps" data-g71-zone-side="right" d="M530 314 C509 313 494 333 492 363 C493 394 503 421 519 441 C535 438 543 419 542 394 L536 340 C535 329 533 320 530 314 Z"/>
      <path class="g3-muscle muscle-triceps" data-g71-zone-side="left" d="M166 325 C185 321 199 339 201 368 L194 423 C190 442 178 451 165 440 C156 426 154 404 158 383 L161 346 Z"/>
      <path class="g3-muscle muscle-triceps" data-g71-zone-side="right" d="M554 325 C535 321 521 339 519 368 L526 423 C530 442 542 451 555 440 C564 426 566 404 562 383 L559 346 Z"/>
      <path class="g3-muscle muscle-core" d="M299 405 C319 419 339 426 360 426 C381 426 401 419 421 405 L435 486 L424 608 C410 651 387 677 360 687 C333 677 310 651 296 608 L285 486 Z"/>
      <path class="g3-muscle muscle-legs" data-g71-zone-part="left-thigh" d="M269 625 C294 610 326 616 344 649 C350 690 347 737 337 780 C327 810 306 828 281 824 C260 801 251 763 250 718 C251 678 257 644 269 625 Z"/>
      <path class="g3-muscle muscle-legs" data-g71-zone-part="right-thigh" d="M451 625 C426 610 394 616 376 649 C370 690 373 737 383 780 C393 810 414 828 439 824 C460 801 469 763 470 718 C469 678 463 644 451 625 Z"/>
      <path class="g3-muscle muscle-legs" data-g71-zone-part="left-calf" d="M272 813 C292 807 308 824 314 855 C317 897 312 953 301 1008 C289 1025 274 1024 264 1008 C255 973 251 928 253 884 C254 850 260 825 272 813 Z"/>
      <path class="g3-muscle muscle-legs" data-g71-zone-part="right-calf" d="M448 813 C428 807 412 824 406 855 C403 897 408 953 419 1008 C431 1025 446 1024 456 1008 C465 973 469 928 467 884 C466 850 460 825 448 813 Z"/>`;
  }

  function v7DefinitionMarkup(side='front',gender='male'){
    if(gender!=='male')return '';
    if(side==='back')return `<g class="g7-definition-layer" data-garang-definition-layer="v7">
      <path class="g7-definition strong" d="M360 246 C343 266 328 292 319 326 M360 246 C377 266 392 292 401 326"/>
      <path class="g7-definition" d="M220 302 C264 330 303 342 338 342 M500 302 C456 330 417 342 382 342"/>
      <path class="g7-definition strong" d="M360 268 L360 615"/>
      <path class="g7-definition" d="M274 350 C292 413 302 480 298 542 M446 350 C428 413 418 480 422 542"/>
      <path class="g7-definition soft" d="M245 411 C277 438 304 454 330 467 M475 411 C443 438 416 454 390 467"/>
      <path class="g7-definition strong" d="M264 665 C302 699 325 735 337 785 M456 665 C418 699 395 735 383 785"/>
      <path class="g7-definition" d="M252 803 C283 845 297 903 290 977 M468 803 C437 845 423 903 430 977"/>
      </g>`;
    if(side==='side')return `<g class="g7-definition-layer" data-garang-definition-layer="v7">
      <path class="g7-definition strong" d="M305 248 C342 230 382 245 405 285"/>
      <path class="g7-definition" d="M336 311 C379 300 407 328 414 374"/>
      <path class="g7-definition" d="M383 358 C409 390 418 432 407 474"/>
      <path class="g7-definition soft" d="M301 440 C327 478 334 532 320 584"/>
      <path class="g7-definition strong" d="M278 652 C321 693 337 751 327 822"/>
      <path class="g7-definition" d="M271 832 C296 879 300 934 287 991"/>
      </g>`;
    return `<g class="g7-definition-layer" data-garang-definition-layer="v7">
      <path class="g7-definition strong" d="M360 282 L360 410"/>
      <path class="g7-definition strong" d="M271 307 C295 286 326 282 351 294 M449 307 C425 286 394 282 369 294"/>
      <path class="g7-definition" d="M270 363 C294 384 322 392 351 386 M450 363 C426 384 398 392 369 386"/>
      <path class="g7-definition strong" d="M360 430 L360 626"/>
      <path class="g7-definition" d="M317 476 C334 482 347 484 360 482 M403 476 C386 482 373 484 360 482"/>
      <path class="g7-definition" d="M314 521 C333 527 347 529 360 526 M406 521 C387 527 373 529 360 526"/>
      <path class="g7-definition soft" d="M301 448 C287 487 289 536 307 584 M419 448 C433 487 431 536 413 584"/>
      <path class="g7-definition strong" d="M278 666 C304 700 316 748 312 801 M442 666 C416 700 404 748 408 801"/>
      </g>`;
  }

  function v72MuscleTextureMarkup(side='front',gender='male'){
    if(gender!=='male')return '';
    if(side==='back')return `<g class="g72-volume-layer" data-garang-volume-layer="v7.2">
      <path class="g72-volume g72-shadow" d="M326 262 C340 250 350 247 360 248 C370 247 380 250 394 262 L418 315 C400 330 381 338 360 339 C339 338 320 330 302 315 Z M250 360 C276 338 304 348 324 381 C311 417 299 458 294 507 C269 494 246 470 232 435 Z M470 360 C444 338 416 348 396 381 C409 417 421 458 426 507 C451 494 474 470 488 435 Z"/>
      <path class="g72-volume g72-highlight" d="M313 282 C328 264 343 258 358 258 C350 287 344 314 342 337 C325 329 315 311 313 282 Z M407 282 C392 264 377 258 362 258 C370 287 376 314 378 337 C395 329 405 311 407 282 Z M264 380 C284 362 304 366 316 393 C307 424 300 450 298 474 C280 463 268 432 264 380 Z M456 380 C436 362 416 366 404 393 C413 424 420 450 422 474 C440 463 452 432 456 380 Z"/>
      <path class="g72-volume g72-shadow g72-deep" d="M286 660 C308 640 330 650 344 688 C337 727 325 757 306 780 C288 765 275 724 274 681 Z M434 660 C412 640 390 650 376 688 C383 727 395 757 414 780 C432 765 445 724 446 681 Z M268 824 C286 811 302 827 307 858 C304 900 296 943 284 978 C271 957 265 905 268 824 Z M452 824 C434 811 418 827 413 858 C416 900 424 943 436 978 C449 957 455 905 452 824 Z"/>
      <g class="g72-fiber-layer">
        <path class="g72-fiber strong" d="M360 265 L360 330 M327 283 C338 298 346 314 350 332 M393 283 C382 298 374 314 370 332"/>
        <path class="g72-fiber" d="M250 385 C276 396 296 412 310 434 M244 414 C270 424 289 440 303 461 M470 385 C444 396 424 412 410 434 M476 414 C450 424 431 440 417 461"/>
        <path class="g72-fiber strong" d="M286 667 C307 695 318 731 316 770 M434 667 C413 695 402 731 404 770"/>
        <path class="g72-fiber" d="M272 837 C290 875 291 921 281 963 M448 837 C430 875 429 921 439 963"/>
      </g>
    </g>`;
    if(side==='side')return `<g class="g72-volume-layer" data-garang-volume-layer="v7.2">
      <path class="g72-volume g72-shadow" d="M308 246 C342 226 381 238 404 280 C391 302 367 314 337 309 C316 296 306 274 308 246 Z M338 317 C372 304 402 323 414 358 C411 385 402 405 388 422 C361 409 344 377 338 317 Z M385 362 C410 373 421 405 414 449 C407 475 397 493 384 504 C372 474 371 416 385 362 Z"/>
      <path class="g72-volume g72-highlight" d="M325 251 C349 239 374 246 391 272 C378 287 360 294 341 289 C328 281 322 268 325 251 Z M354 326 C378 320 397 335 402 360 C397 380 390 394 381 405 C362 391 353 365 354 326 Z"/>
      <path class="g72-volume g72-shadow g72-deep" d="M286 652 C319 630 348 647 358 697 C350 747 338 790 322 821 C297 797 284 735 286 652 Z M277 833 C298 817 315 840 317 875 C313 920 306 962 294 995 C279 973 272 918 277 833 Z"/>
      <g class="g72-fiber-layer">
        <path class="g72-fiber strong" d="M323 260 C346 264 365 275 381 292 M354 335 C377 342 390 358 396 380"/>
        <path class="g72-fiber" d="M391 374 C402 402 401 439 390 472 M304 455 C324 487 327 531 316 572"/>
        <path class="g72-fiber strong" d="M298 669 C324 706 331 754 320 803"/>
        <path class="g72-fiber" d="M286 846 C301 885 301 931 292 975"/>
      </g>
    </g>`;
    return `<g class="g72-volume-layer" data-garang-volume-layer="v7.2">
      <rect class="g72-mesh-wash" x="0" y="0" width="720" height="1100"/>
      <path class="g72-volume g72-shadow" d="M215 260 C240 231 284 224 323 245 C312 274 287 302 250 317 C226 310 211 289 215 260 Z M505 260 C480 231 436 224 397 245 C408 274 433 302 470 317 C494 310 509 289 505 260 Z M271 331 C286 303 316 290 352 295 L352 374 C326 389 298 386 278 369 C266 358 263 345 271 331 Z M449 331 C434 303 404 290 368 295 L368 374 C394 389 422 386 442 369 C454 358 457 345 449 331 Z"/>
      <path class="g72-volume g72-highlight" d="M228 255 C252 237 282 236 310 250 C298 270 280 287 257 298 C239 294 228 278 228 255 Z M492 255 C468 237 438 236 410 250 C422 270 440 287 463 298 C481 294 492 278 492 255 Z M285 309 C305 295 329 292 350 301 L350 344 C331 354 309 353 292 343 C283 334 281 321 285 309 Z M435 309 C415 295 391 292 370 301 L370 344 C389 354 411 353 428 343 C437 334 439 321 435 309 Z"/>
      <path class="g72-volume g72-shadow" d="M193 329 C208 320 220 335 222 359 C220 392 211 419 200 434 C187 426 183 404 185 379 C186 354 188 338 193 329 Z M527 329 C512 320 500 335 498 359 C500 392 509 419 520 434 C533 426 537 404 535 379 C534 354 532 338 527 329 Z"/>
      <path class="g72-volume g72-highlight" d="M198 337 C207 333 214 343 215 360 C213 382 208 401 201 413 C193 406 191 391 192 375 C193 356 194 345 198 337 Z M522 337 C513 333 506 343 505 360 C507 382 512 401 519 413 C527 406 529 391 528 375 C527 356 526 345 522 337 Z"/>
      <path class="g72-volume g72-shadow g72-deep" d="M303 437 C318 428 342 428 357 435 L357 615 C340 625 320 617 307 594 C296 555 295 486 303 437 Z M417 437 C402 428 378 428 363 435 L363 615 C380 625 400 617 413 594 C424 555 425 486 417 437 Z"/>
      <path class="g72-volume g72-highlight" d="M315 451 C327 445 341 445 352 449 L352 590 C341 598 328 594 319 578 C312 542 311 492 315 451 Z M405 451 C393 445 379 445 368 449 L368 590 C379 598 392 594 401 578 C408 542 409 492 405 451 Z"/>
      <path class="g72-volume g72-shadow" d="M273 644 C298 625 326 633 340 669 C344 713 338 760 326 795 C310 817 288 813 273 789 C259 756 256 690 273 644 Z M447 644 C422 625 394 633 380 669 C376 713 382 760 394 795 C410 817 432 813 447 789 C461 756 464 690 447 644 Z M272 829 C291 815 307 832 311 858 C311 902 303 956 293 1002 C281 1018 269 1011 263 991 C257 947 258 872 272 829 Z M448 829 C429 815 413 832 409 858 C409 902 417 956 427 1002 C439 1018 451 1011 457 991 C463 947 462 872 448 829 Z"/>
      <path class="g72-volume g72-highlight" d="M286 654 C304 642 323 651 332 678 C333 713 328 750 319 779 C308 795 294 790 285 773 C276 741 274 688 286 654 Z M434 654 C416 642 397 651 388 678 C387 713 392 750 401 779 C412 795 426 790 435 773 C444 741 446 688 434 654 Z M279 842 C291 834 301 847 303 866 C302 902 297 944 290 977 C282 989 274 984 270 970 C267 933 268 875 279 842 Z M441 842 C429 834 419 847 417 866 C418 902 423 944 430 977 C438 989 446 984 450 970 C453 933 452 875 441 842 Z"/>
      <g class="g72-fiber-layer">
        <path class="g72-fiber strong" d="M222 273 C249 270 276 278 300 294 M498 273 C471 270 444 278 420 294"/>
        <path class="g72-fiber strong" d="M279 315 C301 323 323 329 348 331 M441 315 C419 323 397 329 372 331 M277 344 C302 351 326 355 349 355 M443 344 C418 351 394 355 371 355"/>
        <path class="g72-fiber" d="M196 343 C204 365 203 389 197 412 M524 343 C516 365 517 389 523 412"/>
        <path class="g72-fiber strong" d="M360 445 L360 606"/>
        <path class="g72-fiber" d="M319 468 C333 474 347 476 360 474 M401 468 C387 474 373 476 360 474 M317 512 C333 518 347 520 360 518 M403 512 C387 518 373 520 360 518 M315 556 C332 562 347 564 360 562 M405 556 C388 562 373 564 360 562"/>
        <path class="g72-fiber strong" d="M287 661 C308 693 319 731 317 776 M433 661 C412 693 401 731 403 776"/>
        <path class="g72-fiber" d="M310 665 C297 705 292 747 297 786 M410 665 C423 705 428 747 423 786 M278 846 C291 882 291 927 283 970 M442 846 C429 882 429 927 437 970"/>
      </g>
    </g>`;
  }

  function v6MeshSVG(gender='male',side='front'){
    const person=gender==='female'?'female':'male',view=['front','side','back'].includes(side)?side:'front';
    const asset=`./05_assets/body-model-v6/${person}-${view}.svg?v=7.1.0-overlay-fit`,zones=v6ZoneMarkup(view,person),definition=v7DefinitionMarkup(view,person),texture=v72MuscleTextureMarkup(view,person);
    const viewLabel=view==='front'?'전면':view==='side'?'측면':'후면',maskId=`g71-body-mask-${person}-${view}`;
    return `<svg class="g3-body-model g3-performance-silhouette g3-classical-model g3-real-human g6-mesh-model g7-muscular-model" data-garang-classical-model="6" data-garang-visual-revision="7.2" data-garang-body-v2="${view}" data-garang-anatomy-v6="${view}" data-garang-gender="${person}" viewBox="0 0 720 1100" role="img" aria-label="${person==='female'?'여성':'남성'} ${viewLabel} mesh 기반 근육 지도">
      <defs><mask id="${maskId}" maskUnits="userSpaceOnUse" x="0" y="0" width="720" height="1100" style="mask-type:alpha"><image href="${asset}" x="0" y="0" width="720" height="1100" preserveAspectRatio="xMidYMid meet"/></mask></defs>
      <image class="g6-visual-layer" data-garang-visual-layer="mesh" href="${asset}" x="0" y="0" width="720" height="1100" preserveAspectRatio="xMidYMid meet" pointer-events="none"/>
      <g class="g71-overlay-mask" data-garang-overlay-mask="body-alpha" mask="url(#${maskId})">
        ${texture}
        ${definition}
        <g class="g6-interaction-layer" data-garang-interaction-layer="zones">${zones}</g>
      </g>
    </svg>`;
  }

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
      let views=[...map.querySelectorAll('.body-view')];if(!views.length)return;
      const gender=map.dataset.gender==='female'?'female':'male';
      if(views.length===2&&!map.querySelector('[data-g3-generated-side="1"]')){
        const sideView=document.createElement('div');sideView.className='body-view';sideView.dataset.g3GeneratedSide='1';sideView.innerHTML='<span>SIDE · '+(gender==='female'?'WOMEN':'MEN')+'</span>';
        views[0].insertAdjacentElement('afterend',sideView);
      }
      views=[...map.querySelectorAll('.body-view')];
      const order=['front','side','back'];
      views.slice(0,3).forEach((view,i)=>{
        const side=order[i]||'front',old=view.querySelector('svg'),useMesh=(gender==='male'||gender==='female')&&order.includes(side);
        if(useMesh?old?.dataset?.garangAnatomyV6===side&&old?.dataset?.garangGender===gender&&old?.dataset?.garangVisualRevision==='7.2':old?.dataset?.garangAnatomyV5===side&&old?.dataset?.garangGender===gender)return;
        const markup=useMesh?v6MeshSVG(gender,side):(side==='front'?v5FrontSVG(gender):side==='side'?v5SideSVG(gender):v5BackSVG(gender));
        const tpl=document.createElement('template');tpl.innerHTML=markup.trim();
        const next=tpl.content.firstElementChild;view.querySelectorAll('svg').forEach(node=>node.remove());view.appendChild(next);
      });
      let tools=wrap.previousElementSibling?.classList.contains('g3-anatomy-tools')?wrap.previousElementSibling:wrap.querySelector(':scope > .g3-anatomy-tools');
      if(!tools){
        tools=document.createElement('div');tools.className='g3-anatomy-tools';
        wrap.insertAdjacentElement('beforebegin',tools);
      }
      tools.innerHTML='<div class="g3-view-switch" role="group" aria-label="인체 보기"><button type="button" data-g3-view="front">FRONT</button><button type="button" data-g3-view="side">SIDE</button><button type="button" data-g3-view="back">BACK</button></div><div class="g3-anatomy-legend"><span><i></i>Primary</span><span><i></i>Secondary</span><span><i></i>Tertiary</span></div>';
      wrap.classList.add('g3-upgraded');wrap.dataset.g3View=wrap.dataset.g3View||'front';
      tools.querySelectorAll('[data-g3-view]').forEach(btn=>{btn.classList.toggle('active',btn.dataset.g3View===wrap.dataset.g3View);btn.onclick=()=>{wrap.dataset.g3View=btn.dataset.g3View;tools.querySelectorAll('button').forEach(b=>b.classList.toggle('active',b===btn));};});
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
