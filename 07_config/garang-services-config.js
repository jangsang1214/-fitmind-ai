/* GARANG external service endpoints.
   Provider secrets stay on the server. Browser code receives public HTTPS endpoints only.
   Server Readiness Stage 0 keeps new privileged endpoints activation-gated until the
   matching Cloud Functions revision is deployed and smoke-verified. */
(() => {
  'use strict';
  const apiBase='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api';
  const coachEndpoint=`${apiBase}/coach`;
  window.GARANG_SERVICES = Object.freeze({
    apiBase,
    serverReadinessVersion:'server-readiness-stage0-v1',
    coachEndpoint,
    accountDeleteEndpoint:null,
    accountExportEndpoint:null,
    mealScanEndpoint:null,
    analyticsEndpoint:null,
    telemetryErrorEndpoint:null,
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
  function currentUser(){try{return window.firebase?.auth?.().currentUser||null;}catch{return null;}}
  function analyticsConsent(){
    const user=currentUser();if(!user)return false;
    try{const state=JSON.parse(globalThis.localStorage?.getItem?.(`garang_user_${user.uid}_v3`)||'null');return state?.privacy?.consent?.analytics===true;}catch{return false;}
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
        const user=currentUser();if(!user){const error=new Error('COACH_AUTH_REQUIRED');error.code='COACH_AUTH_REQUIRED';throw error;}
        let source={};try{source=typeof init.body==='string'?JSON.parse(init.body):{};}catch{}
        const message=String(source?.message||source?.question||'').trim();if(!message){const error=new Error('COACH_MESSAGE_REQUIRED');error.code='COACH_MESSAGE_REQUIRED';throw error;}
        const language=source?.language==='en'||globalThis.document?.documentElement?.lang==='en'?'en':'ko',headers=new Headers(init.headers||{});headers.set('Content-Type','application/json');headers.set('Authorization',`Bearer ${await token()}`);
        diag.lastRequest={url:coachEndpoint,method:'POST',language,messageLength:message.length,uid:String(user.uid||'')};diag.stage='coach-fetch';
        const response=await nativeFetch(coachEndpoint,{...init,method:'POST',headers,body:JSON.stringify({message,language})});diag.stage='coach-response';return response;
      }catch(error){diag.lastError={name:String(error?.name||'Error'),message:String(error?.message||error),code:String(error?.code||'')};throw error;}
    }
    if((services.analyticsEndpoint&&url===services.analyticsEndpoint)||(services.telemetryErrorEndpoint&&url===services.telemetryErrorEndpoint)){
      if(!analyticsConsent()){
        if(url===services.analyticsEndpoint)diag.analyticsSuppressed++;else diag.errorSuppressed++;
        if(typeof Response==='function')return new Response(JSON.stringify({ok:true,accepted:false,reason:'CONSENT_REQUIRED'}),{status:202,headers:{'Content-Type':'application/json'}});
        return {ok:true,status:202,json:async()=>({ok:true,accepted:false,reason:'CONSENT_REQUIRED'})};
      }
      return authenticatedFetch(input,init);
    }
    return nativeFetch(input,init);
  }
  window.fetch=routedFetch;
  if(typeof window.addEventListener==='function')window.addEventListener('garang:error',event=>{
    const endpoint=window.GARANG_SERVICES?.telemetryErrorEndpoint;if(!endpoint||!analyticsConsent())return;
    const detail=event?.detail||{};routedFetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(detail)}).catch(()=>{});
  });
  const transport=Object.freeze({version:'garang-service-transport-v2',apiBase,coachEndpoint,authenticatedFetch,analyticsConsent,diagnostics:diag});
  window.__GARANG_SERVICE_TRANSPORT_V2__=transport;
  window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__=transport;
})();
