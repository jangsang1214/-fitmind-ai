/* GARANG Screen Registry v1.2
   Single source of truth for screen identity, bilingual eyebrow labels and compact-title policy.
   All DOM writes are idempotent so lifecycle-driven callers cannot create mutation feedback loops. */
(function(root){
  'use strict';

  const SCREENS = Object.freeze({
    today: Object.freeze({key:'today',labelKo:'TODAY / 오늘',labelEn:'TODAY',compactTitle:true,selectors:['.today-body-panel'],patterns:[/\btoday\b|오늘/i]}),
    coach: Object.freeze({key:'coach',labelKo:'COACH / 코치',labelEn:'COACH',compactTitle:false,selectors:['#coachInput'],patterns:[/\bcoach\b|코치/i]}),
    workout: Object.freeze({key:'workout',labelKo:'WORKOUT / 운동',labelEn:'WORKOUT',compactTitle:true,selectors:['#saveWorkoutSession','#wName'],patterns:[/\bworkout\b|log\s*\/\s*workout|운동/i]}),
    body: Object.freeze({key:'body',labelKo:'BODY / 체성분',labelEn:'BODY',compactTitle:true,selectors:['#saveBody'],patterns:[/body intelligence|log\s*\/\s*body|체성분/i]}),
    progress: Object.freeze({key:'progress',labelKo:'PROGRESS / 흐름',labelEn:'PROGRESS',compactTitle:true,selectors:['.progress-tabs'],patterns:[/\bprogress\b|진행 상황|흐름/i]}),
    running: Object.freeze({key:'running',labelKo:'RUNNING / 러닝',labelEn:'RUNNING',compactTitle:true,selectors:['#runStart','#runStop'],patterns:[/\brunning\b|log\s*\/\s*running|러닝/i]}),
    nutrition: Object.freeze({key:'nutrition',labelKo:'NUTRITION / 식단',labelEn:'NUTRITION',compactTitle:true,selectors:['#saveMeal','#foodSearch','#pickMealScan'],patterns:[/\bnutrition\b|식단/i]}),
    planner: Object.freeze({key:'planner',labelKo:'PLANNER / 실행',labelEn:'PLANNER',compactTitle:false,selectors:['#addPlan'],patterns:[/\bplanner\b|plan\s*\/\s*계획|계획 추가/i]}),
    profile: Object.freeze({key:'profile',labelKo:'PROFILE / 프로필',labelEn:'PROFILE',compactTitle:true,selectors:['#saveProfile'],patterns:[/\bprofile\b|프로필/i]}),
    settings: Object.freeze({key:'settings',labelKo:'SETTING / 설정',labelEn:'SETTING',compactTitle:true,selectors:['#savePreferences'],patterns:[/\bsettings?\b|설정/i]}),
    modeling: Object.freeze({key:'modeling',labelKo:'MODELING / 모델링',labelEn:'MODELING',compactTitle:true,selectors:['#saveOnboarding'],patterns:[/\bmodeling\b|사용자 모델|garang이 먼저 알아야 할 것|\bstart\b/i]})
  });

  const DETECTION_ORDER=Object.freeze(['planner','settings','profile','modeling','running','nutrition','body','workout','progress','coach','today']);
  const definition=key=>key&&SCREENS[key]?SCREENS[key]:null;
  const label=(key,lang='ko')=>{const def=definition(key);return def?(lang==='en'?def.labelEn:def.labelKo):'';};

  function headerText(main){
    if(!main?.querySelector)return '';
    const head=main.querySelector('.page-head');if(!head)return '';
    const eyebrow=head.querySelector?.('.eyebrow')?.textContent||'';
    const title=head.querySelector?.('h1')?.textContent||'';
    return `${eyebrow} ${title}`.trim();
  }
  function matchesSelectors(main,def){
    if(!main?.querySelector||!def?.selectors?.length)return false;
    return def.selectors.some(selector=>{try{return !!main.querySelector(selector);}catch{return false;}});
  }
  function matchesHeader(text,def){return !!text&&!!def?.patterns?.some(pattern=>pattern.test(text));}
  function activeNavPage(doc){try{const page=doc?.querySelector?.('#bottomNav button.active')?.dataset?.page||'';return definition(page)?page:'';}catch{return '';}}
  function detect(main,doc=root.document){
    if(!main)return null;
    for(const key of DETECTION_ORDER)if(matchesSelectors(main,SCREENS[key]))return key;
    const text=headerText(main);
    for(const key of DETECTION_ORDER)if(matchesHeader(text,SCREENS[key]))return key;
    return activeNavPage(doc)||null;
  }

  function applyHeader(main,doc=root.document,lang){
    if(!main)return null;
    const key=detect(main,doc),def=definition(key);if(!def)return null;
    const resolvedLang=lang||(doc?.documentElement?.lang==='en'?'en':'ko');
    if(main.dataset&&main.dataset.garangScreen!==key)main.dataset.garangScreen=key;
    const head=main.querySelector?.('.page-head'),eyebrow=head?.querySelector?.('.eyebrow'),title=head?.querySelector?.('h1');
    const nextLabel=label(key,resolvedLang);
    if(eyebrow&&eyebrow.textContent!==nextLabel)eyebrow.textContent=nextLabel;
    const shouldHide=!!def.compactTitle;
    if(title&&title.hidden!==shouldHide)title.hidden=shouldHide;
    if(main.classList?.contains?.('garang-primary-title-hidden')!==shouldHide)main.classList?.toggle?.('garang-primary-title-hidden',shouldHide);
    return key;
  }

  function reconcile(doc=root.document){
    const main=doc?.getElementById?.('main')||doc?.querySelector?.('main.main')||null;
    return applyHeader(main,doc);
  }

  root.GarangScreens=Object.freeze({SCREENS,DETECTION_ORDER,definition,label,detect,applyHeader,reconcile,activeNavPage,isCompact:key=>!!definition(key)?.compactTitle,version:'1.2.0'});

  /* app.js owns rendering and emits this after each screen tree is complete. Screen Registry owns identity. */
  if(typeof root.addEventListener==='function'&&root.document){
    root.addEventListener('garang:screen-rendered',()=>reconcile(root.document));
    root.addEventListener('garang:route-completed',()=>reconcile(root.document));
  }
})(typeof window==='undefined'?globalThis:window);
