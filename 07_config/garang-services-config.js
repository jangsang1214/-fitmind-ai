/* GARANG external service endpoints.
   Provider secrets stay on the server. Browser code receives public HTTPS endpoints only.
   Privileged browser endpoints are fail-closed and activate only when the loaded Firebase
   browser config targets the verified staging project `garang-staging`. Production stays off. */
(() => {
  'use strict';
  const productionProjectId='fitfind-ai';
  const stagingProjectId='garang-staging';
  const firebaseProjectId=String(window.GARANG_FIREBASE_CONFIG?.projectId||'').trim();
  const selectedProjectId=firebaseProjectId||productionProjectId;
  const apiBase=`https://asia-northeast3-${selectedProjectId}.cloudfunctions.net/api`;
  const coachEndpoint=`${apiBase}/coach`;
  const wantedCoachEndpoint=`${apiBase}/wanted/coach`;
  const privilegedStagingEnabled=selectedProjectId===stagingProjectId;
  const analyticsSpec=Object.freeze({
    signup_completed:[],onboarding_completed:[],record_created:['recordType','source'],first_record_created:['recordType','source'],today_viewed:['source'],coach_opened:['source'],coach_recommendation_shown:['provider','source'],daily_plan_applied:['source'],planned_action_started:['actionType','source'],planned_action_completed:['actionType','source'],accumulation_viewed:['source']
  });
  const legacyAnalytics=Object.freeze({
    workout_saved:{canonical:'record_created',recordType:'workout'},meal_saved:{canonical:'record_created',recordType:'nutrition'},run_saved:{canonical:'record_created',recordType:'running'},inbody_saved:{canonical:'record_created',recordType:'body'},ai_chat_answered:{canonical:'coach_recommendation_shown'},ai_plan_applied:{canonical:'daily_plan_applied'},planner_completed:{canonical:'planned_action_completed'},'screen_viewed:today':{canonical:'today_viewed'},'screen_viewed:coach':{canonical:'coach_opened'},'screen_viewed:progress':{canonical:'accumulation_viewed'}
  });
  window.GARANG_SERVICES = Object.freeze({
    apiBase,
    serverReadinessVersion:'server-readiness-stage0-v1',
    environmentProjectId:selectedProjectId,
    privilegedStagingEnabled,
    coachEndpoint,
    wantedCoachEndpoint,
    accountDeleteEndpoint:privilegedStagingEnabled?`${apiBase}/account/delete`:null,
    accountExportEndpoint:privilegedStagingEnabled?`${apiBase}/account/export`:null,
    mealScanEndpoint:null,
    analyticsEndpoint:privilegedStagingEnabled?`${apiBase}/analytics/events`:null,
    telemetryErrorEndpoint:privilegedStagingEnabled?`${apiBase}/telemetry/errors`:null,
    analyticsConsent:false,
    analyticsContractVersion:'garang-analytics-v1',
    paymentCheckoutEndpoint:null,
    paymentEntitlementEndpoint:null
  });
  if(!window.GARANG_LLM_ENDPOINT)window.GARANG_LLM_ENDPOINT=coachEndpoint;

  if(typeof window.fetch!=='function'||window.__GARANG_SERVICE_TRANSPORT_V2__)return;
  const nativeFetch=window.fetch.bind(window);
  const diag={stage:'installed',lastError:null,lastRequest:null,analyticsSuppressed:0,errorSuppressed:0};
  const urlOf=input=>typeof input==='string'?input:input?.url;
  const methodOf=(input,init)=>String(init?.method||input?.method||'GET').toUpperCase();
  const text=(value,limit=120)=>String(value??'').trim().slice(0,limit);
  function coachImageFrom(value){if(!value||typeof value!=='object'||Array.isArray(value))return null;const mediaType=text(value.mediaType,40).toLowerCase(),dataUrl=String(value.dataUrl||'');if(!['image/jpeg','image/png','image/webp'].includes(mediaType))return null;if(!dataUrl.startsWith(`data:${mediaType};base64,`)||dataUrl.length>2600000)return null;return {kind:'body_photo',mediaType,dataUrl};}
  function currentUser(){try{return window.firebase?.auth?.().currentUser||null;}catch{return null;}}
  function wantedDemoEnvelope(){
    try{
      if(globalThis.localStorage?.getItem?.('garang_wanted_demo_active_v1')!=='1')return null;
      const state=JSON.parse(globalThis.localStorage?.getItem?.('garang_signed_out_v1')||'null');
      const judge=state?.meta?.judgeDataset;
      if(state?.wantedDemo!==true||judge?.contractVersion!=='garang-wanted-judge-data-v1'||judge?.synthetic!==true||Number(judge?.spanDays)!==14)return null;
      return {contractVersion:'garang-wanted-judge-data-v1',synthetic:true,state};
    }catch{return null;}
  }
  function analyticsConsent(){
    const user=currentUser();if(!user)return false;
    try{const state=JSON.parse(globalThis.localStorage?.getItem?.(`garang_user_${user.uid}_v3`)||'null');return state?.privacy?.consent?.analytics===true;}catch{return false;}
  }
  function canonicalAnalytics(name,properties={}){
    let key=text(name,80),props=properties&&typeof properties==='object'&&!Array.isArray(properties)?{...properties}:{};
    if(key==='screen_viewed'){const page=text(props.page??props.screen,30);if(page)key=`screen_viewed:${page}`;}
    const legacy=legacyAnalytics[key];if(legacy){key=legacy.canonical;props={...props,...Object.fromEntries(Object.entries(legacy).filter(([k])=>k!=='canonical'))};}
    const allowed=analyticsSpec[key];if(!allowed)return null;
    const safe={};for(const property of allowed){const value=props[property];if(['string','number','boolean'].includes(typeof value)||value===null)safe[property]=typeof value==='string'?text(value):value;}
    return {name:key,properties:safe};
  }
  function sanitizeAnalyticsBody(body){
    let source={};try{source=typeof body==='string'?JSON.parse(body):body||{};}catch{return JSON.stringify({events:[]});}
    const rows=Array.isArray(source.events)?source.events.slice(0,50):[source],events=rows.map(row=>canonicalAnalytics(row?.name,row?.properties||row?.props)).filter(Boolean);
    return JSON.stringify({events});
  }
  function safeError(detail={}){
    const context=detail?.context&&typeof detail.context==='object'&&!Array.isArray(detail.context)?detail.context:{},safeContext={};
    for(const key of ['category','code','sourceCode','retryable','fingerprint','feature','source','layer']){const value=context[key];if(['string','number','boolean'].includes(typeof value)||value===null)safeContext[key]=typeof value==='string'?text(value,160):value;}
    return {category:text(detail?.category,40)||'unknown',code:text(detail?.code,80)||'GARANG_UNKNOWN',sourceCode:text(detail?.sourceCode,80)||null,retryable:detail?.retryable===true,fingerprint:text(detail?.fingerprint,80)||null,context:safeContext};
  }
  async function token(){const user=currentUser();if(!user||typeof user.getIdToken!=='function'){const error=new Error('GARANG_AUTH_REQUIRED');error.code='GARANG_AUTH_REQUIRED';throw error;}return user.getIdToken();}
  async function authenticatedFetch(input,init={}){
    const headers=new Headers(init.headers||{});headers.set('Authorization',`Bearer ${await token()}`);return nativeFetch(input,{...init,headers});
  }
  async function routedFetch(input,init={}){
    const url=urlOf(input),method=methodOf(input,init),services=window.GARANG_SERVICES||{};
    if(url===coachEndpoint&&method==='POST'){
      diag.stage='coach-auth';diag.lastError=null;
      try{
        const user=currentUser(),wantedDemo=user?null:wantedDemoEnvelope();
        if(!user&&!wantedDemo){const error=new Error('COACH_AUTH_REQUIRED');error.code='COACH_AUTH_REQUIRED';throw error;}
        let source={};try{source=typeof init.body==='string'?JSON.parse(init.body):{};}catch{}
        const language=source?.language==='en'||globalThis.document?.documentElement?.lang==='en'?'en':'ko',draft=source?.image||globalThis.GarangCoachPhotoDraft?.consumeForRequest?.()||null,image=coachImageFrom(draft),messageRaw=String(source?.message||source?.question||'').trim(),message=messageRaw||(image?(language==='en'?'Review this photo with my GARANG records and explain what is visibly relevant to my training.':'이 사진을 내 GARANG 기록과 함께 보고 훈련 관점에서 보이는 점을 알려줘.'):'');if(!message){const error=new Error('COACH_MESSAGE_REQUIRED');error.code='COACH_MESSAGE_REQUIRED';throw error;}
        if(wantedDemo&&image){const error=new Error('WANTED_DEMO_IMAGE_REQUIRES_ACCOUNT');error.code='WANTED_DEMO_IMAGE_REQUIRES_ACCOUNT';throw error;}
        const headers=new Headers(init.headers||{});headers.set('Content-Type','application/json');
        const target=wantedDemo?wantedCoachEndpoint:coachEndpoint;
        if(user)headers.set('Authorization',`Bearer ${await token()}`);else headers.delete('Authorization');
        diag.lastRequest={url:target,method:'POST',language,messageLength:message.length,hasImage:!!image,uid:user?String(user.uid||''):'wanted-public',mode:wantedDemo?'wanted_synthetic':'authenticated'};diag.stage='coach-fetch';
        const body=wantedDemo?{message,language,wantedDemo}:{message,language,...(image?{image}: {})};
        const response=await nativeFetch(target,{...init,method:'POST',headers,body:JSON.stringify(body)});diag.stage='coach-response';return response;
      }catch(error){diag.lastError={name:String(error?.name||'Error'),message:String(error?.message||error),code:String(error?.code||'')};throw error;}
    }
    if((services.analyticsEndpoint&&url===services.analyticsEndpoint)||(services.telemetryErrorEndpoint&&url===services.telemetryErrorEndpoint)){
      if(!analyticsConsent()){
        if(url===services.analyticsEndpoint)diag.analyticsSuppressed++;else diag.errorSuppressed++;
        if(typeof Response==='function')return new Response(JSON.stringify({ok:true,accepted:false,reason:'CONSENT_REQUIRED'}),{status:202,headers:{'Content-Type':'application/json'}});
        return {ok:true,status:202,json:async()=>({ok:true,accepted:false,reason:'CONSENT_REQUIRED'})};
      }
      const headers=new Headers(init.headers||{});headers.set('Content-Type','application/json');
      const body=url===services.analyticsEndpoint?sanitizeAnalyticsBody(init.body):JSON.stringify(safeError(typeof init.body==='string'?(()=>{try{return JSON.parse(init.body);}catch{return {};}})():init.body||{}));
      return authenticatedFetch(input,{...init,headers,body});
    }
    return nativeFetch(input,init);
  }
  window.fetch=routedFetch;
  if(typeof window.addEventListener==='function')window.addEventListener('garang:error',event=>{
    const endpoint=window.GARANG_SERVICES?.telemetryErrorEndpoint;if(!endpoint||!analyticsConsent())return;
    routedFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(safeError(event?.detail||{}))}).catch(()=>{});
  });
  const transport=Object.freeze({version:'garang-service-transport-v2.1-wanted',apiBase,coachEndpoint,wantedCoachEndpoint,authenticatedFetch,analyticsConsent,canonicalAnalytics,safeError,wantedDemoEnvelope,diagnostics:diag});
  const legacyCoachTransport=Object.freeze({version:'garang-coach-gateway-transport-v1.1.1',endpoint:coachEndpoint,diagnostics:diag});
  window.__GARANG_SERVICE_TRANSPORT_V2__=transport;
  window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__=legacyCoachTransport;
})();
