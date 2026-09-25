'use strict';
const fs=require('node:fs'),path=require('node:path');
const {BARCODE_SCAN_SCHEMA,systemPrompt}=require('../functions/src/meal-scan.cjs');
const apiKey=String(process.env.GARANG_LLM_API_KEY||'').trim();
const model=String(process.env.GARANG_MEAL_SCAN_MODEL||process.env.GARANG_LLM_MODEL||'gpt-5.6-luna').trim();
if(!apiKey)throw new Error('GARANG_LLM_API_KEY_MISSING');
const fixture=fs.readFileSync(path.join(__dirname,'fixtures/barcode-028400090896.b64'),'utf8').trim();
const imageUrl='data:image/png;base64,'+fixture;
function clean(v,n=120){return String(v??'').slice(0,n);}
async function call(label,body){
 const response=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:'Bearer '+apiKey,'Content-Type':'application/json'},body:JSON.stringify(body)});
 const payload=await response.json().catch(()=>({}));
 const out={label,http:response.status,ok:response.ok,status:clean(payload?.status,40)||null,error:{code:clean(payload?.error?.code,80)||null,type:clean(payload?.error?.type,80)||null,param:clean(payload?.error?.param,120)||null}};
 console.log(JSON.stringify(out));
 return {response,payload,out};
}
function input(){return [{role:'system',content:[{type:'input_text',text:systemPrompt('en','barcode')}]},{role:'user',content:[{type:'input_text',text:'Read the visible package barcode digits only.'},{type:'input_image',image_url:imageUrl}]}];}
(async()=>{
 const exact=await call('exact-prod-shape',{model,store:false,input:input(),reasoning:{effort:'none'},max_output_tokens:800,text:{format:{type:'json_schema',name:'garang_barcode_scan',strict:true,schema:BARCODE_SCAN_SCHEMA}}});
 if(exact.response.ok)return;
 const plain=await call('plain-text-same-image',{model,store:false,input:input(),reasoning:{effort:'none'},max_output_tokens:80});
 const simpleSchema={type:'object',additionalProperties:false,required:['barcode','confidence'],properties:{barcode:{type:'string'},confidence:{type:'number'}}};
 const simple=await call('simple-schema-same-image',{model,store:false,input:input(),reasoning:{effort:'none'},max_output_tokens:120,text:{format:{type:'json_schema',name:'garang_barcode_diag',strict:true,schema:simpleSchema}}});
 if(!plain.response.ok&&String(plain.out.error.param||'').includes('image'))process.exitCode=21;
 else if(plain.response.ok&&!simple.response.ok)process.exitCode=22;
 else if(simple.response.ok)process.exitCode=23;
 else process.exitCode=24;
})().catch(error=>{console.error('DIAG_INTERNAL:'+clean(error?.code||error?.name||'unknown',80));process.exit(25);});
