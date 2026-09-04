(function(root){
 'use strict';
 async function request(key,payload){
  const cfg=root.GARANG_SERVICES_CONFIG||{},endpoint=cfg[key];
  if(!endpoint)throw new Error('NOT_CONNECTED');
  const url=new URL(endpoint,location.href);if(url.origin!==location.origin)throw new Error('UNTRUSTED_ENDPOINT');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),cfg.timeoutMs||30000);
  try{const form=typeof FormData!=='undefined'&&payload instanceof FormData;const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:form?{}:{'Content-Type':'application/json'},body:form?payload:JSON.stringify(payload),signal:controller.signal});if(!response.ok)throw new Error('HTTP_'+response.status);return await response.json();}finally{clearTimeout(timer);}
 }
 function canonical(s){return root.GarangSchema?.toTransport?root.GarangSchema.toTransport(s):s;}
 function context(s){const x=canonical(s);return {contractVersion:x.contractVersion,schemaVersion:x.schemaVersion,language:x.language,profile:x.profile,userModel:x.userModel,workouts:x.workouts.slice(-20),nutrition:x.meals.slice(-20),running:x.runs.slice(-10),inbody:x.body.slice(-10),planner:x.planner.slice(-50),dailyCheckins:x.dailyCheckins.slice(-30),performance:root.GarangPerformance.calculate(x),memory:x.memory.entries};}
 root.GarangAdapters={request,context,
  LLMService:{async send(s,messages){const c=context(s),r=await request('llmEndpoint',{context:c,messages:messages.map(x=>({role:x.role,content:x.text})),language:c.language,contractVersion:c.contractVersion,schemaVersion:c.schemaVersion});if(typeof r?.text!=='string'||!r.text.trim())throw new Error('INVALID_RESPONSE');return {text:r.text,plans:Array.isArray(r.plans)?r.plans.filter(p=>p&&typeof p.title==='string'):[]};}},
  InBodyOCRService:{async analyze(file){if(!file||!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)||file.size>10*1024*1024)throw new Error('INVALID_IMAGE');const form=new FormData();form.append('image',file);const r=await request('ocrEndpoint',form);if(!r.measurements||typeof r.measurements!=='object')throw new Error('INVALID_RESPONSE');return r.measurements;}},
  PaymentService:{async checkout(){const r=await request('paymentEndpoint',{product:'GARANG_PRO'});if(!r.checkoutUrl)throw new Error('INVALID_RESPONSE');const u=new URL(r.checkoutUrl);if(u.protocol!=='https:')throw new Error('INVALID_RESPONSE');return u.href;}}
 };
})(typeof window==='undefined'?globalThis:window);
