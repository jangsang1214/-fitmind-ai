(function(root){
 'use strict';
 async function request(key,payload){
  const cfg=root.GARANG_SERVICES_CONFIG||{},endpoint=cfg[key];
  if(!endpoint)throw new Error('NOT_CONNECTED');
  const url=new URL(endpoint,location.href);if(url.origin!==location.origin)throw new Error('UNTRUSTED_ENDPOINT');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),cfg.timeoutMs||30000);
  try{const form=typeof FormData!=='undefined'&&payload instanceof FormData;const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:form?{}:{'Content-Type':'application/json'},body:form?payload:JSON.stringify(payload),signal:controller.signal});if(!response.ok)throw new Error('HTTP_'+response.status);return await response.json();}finally{clearTimeout(timer);}
 }
 function context(s){return {schemaVersion:s.schemaVersion,profile:s.profile,workouts:s.workouts.slice(-20),nutrition:s.meals.slice(-20),running:s.runs.slice(-10),inbody:s.body.slice(-10),planner:s.planner.slice(-50),performance:root.GarangPerformance.calculate(s),memory:s.memory.entries};}
 root.GarangAdapters={request,context,
  LLMService:{async send(s,messages){const r=await request('llmEndpoint',{context:context(s),messages:messages.map(x=>({role:x.role,content:x.text})),language:s.language});if(typeof r?.text!=='string'||!r.text.trim())throw new Error('INVALID_RESPONSE');return {text:r.text,plans:Array.isArray(r.plans)?r.plans.filter(p=>p&&typeof p.title==='string'):[]};}},
  InBodyOCRService:{async analyze(file){if(!file||!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type)||file.size>10*1024*1024)throw new Error('INVALID_IMAGE');const form=new FormData();form.append('image',file);const r=await request('ocrEndpoint',form);if(!r.measurements||typeof r.measurements!=='object')throw new Error('INVALID_RESPONSE');return r.measurements;}},
  PaymentService:{async checkout(){const r=await request('paymentEndpoint',{product:'GARANG_PRO'});if(!r.checkoutUrl)throw new Error('INVALID_RESPONSE');const u=new URL(r.checkoutUrl);if(u.protocol!=='https:')throw new Error('INVALID_RESPONSE');return u.href;}}
 };
})(typeof window==='undefined'?globalThis:window);
