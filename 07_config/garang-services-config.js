/* GARANG external service endpoints.
   Provider secrets stay on the server. Browser code receives public HTTPS endpoints only.
   Coach transport is deliberately narrow: it authenticates the configured Coach request,
   normalizes legacy Coach packets, removes client context, and lets the local fallback own failures. */
(() => {
  'use strict';
  const coachEndpoint='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/coach';
  window.GARANG_SERVICES = Object.freeze({
    coachEndpoint,
    mealScanEndpoint: null,
    analyticsEndpoint: null,
    analyticsConsent: false,
    analyticsContractVersion: 'garang-analytics-v1',
    paymentCheckoutEndpoint: null,
    paymentEntitlementEndpoint: null
  });
  if(!window.GARANG_LLM_ENDPOINT)window.GARANG_LLM_ENDPOINT=coachEndpoint;

  if(typeof window.fetch!=='function'||window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__)return;
  const nativeFetch=window.fetch.bind(window);
  const diag={stage:'installed',lastError:null,lastRequest:null};
  async function coachFetch(input,init={}){
    const url=typeof input==='string'?input:input?.url;
    const method=String(init?.method||input?.method||'GET').toUpperCase();
    if(url!==coachEndpoint||method!=='POST')return nativeFetch(input,init);
    diag.stage='auth';diag.lastError=null;
    try{
      const user=window.firebase?.auth?.().currentUser;
      if(!user||typeof user.getIdToken!=='function'){
        const error=new Error('COACH_AUTH_REQUIRED');error.code='COACH_AUTH_REQUIRED';throw error;
      }
      const token=await user.getIdToken();
      diag.stage='normalize';
      let source={};try{source=typeof init.body==='string'?JSON.parse(init.body):{};}catch{}
      const message=String(source?.message||source?.question||'').trim();
      if(!message){const error=new Error('COACH_MESSAGE_REQUIRED');error.code='COACH_MESSAGE_REQUIRED';throw error;}
      const language=source?.language==='en'||document.documentElement?.lang==='en'?'en':'ko';
      const headers=new Headers(init.headers||{});headers.set('Content-Type','application/json');headers.set('Authorization',`Bearer ${token}`);
      diag.lastRequest={url:coachEndpoint,method:'POST',language,messageLength:message.length,uid:String(user.uid||'')};
      diag.stage='native-fetch';
      const response=await nativeFetch(coachEndpoint,{...init,method:'POST',headers,body:JSON.stringify({message,language})});
      diag.stage='response';
      return response;
    }catch(error){
      diag.lastError={name:String(error?.name||'Error'),message:String(error?.message||error),code:String(error?.code||'')};
      throw error;
    }
  }
  window.fetch=coachFetch;
  window.__GARANG_COACH_GATEWAY_TRANSPORT_V1__=Object.freeze({version:'garang-coach-gateway-transport-v1.1.1',endpoint:coachEndpoint,diagnostics:diag});
})();