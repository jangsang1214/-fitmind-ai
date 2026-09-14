'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const raw=fs.readFileSync(path.join(__dirname,'..','07_config/garang-services-config.js'),'utf8');
const source=raw.replace('analyticsEndpoint:null',"analyticsEndpoint:'https://api.test/analytics/events'").replace('telemetryErrorEndpoint:null',"telemetryErrorEndpoint:'https://api.test/telemetry/errors'");
function boot(consent){
 const calls=[],listeners={},nativeFetch=async(input,init={})=>{calls.push({input,init});return {ok:true,status:202,json:async()=>({ok:true})};};
 const localStorage={getItem:key=>key==='garang_user_u1_v3'?JSON.stringify({privacy:{consent:{analytics:consent}}}):null};
 const window={fetch:nativeFetch,firebase:{auth:()=>({currentUser:{uid:'u1',getIdToken:async()=> 'token-1'}})},addEventListener:(name,fn)=>{listeners[name]=fn;}};
 const sandbox={window,localStorage,document:{documentElement:{lang:'ko'}},Headers,Response,console};vm.runInNewContext(source,sandbox,{filename:'garang-services-config.js'});return {window,calls,listeners};
}
(async()=>{
 const enabled=boot(true),analytics=enabled.window.GARANG_SERVICES.analyticsEndpoint;
 await enabled.window.fetch(analytics,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'workout_saved',props:{source:'record',email:'secret@example.com',freeText:'drop'},userId:'client-user'})});
 assert.equal(enabled.calls.length,1);const sent=enabled.calls[0];assert.equal(sent.init.headers.get('Authorization'),'Bearer token-1');
 const body=JSON.parse(sent.init.body);assert.deepEqual(body,{events:[{name:'record_created',properties:{recordType:'workout',source:'record'}}]});assert.equal(JSON.stringify(body).includes('secret@example.com'),false);assert.equal(JSON.stringify(body).includes('client-user'),false);
 const errorEndpoint=enabled.window.GARANG_SERVICES.telemetryErrorEndpoint;
 await enabled.window.fetch(errorEndpoint,{method:'POST',body:JSON.stringify({category:'runtime',code:'GARANG_RUNTIME',internalMessage:'private details',context:{feature:'coach',token:'secret',email:'hidden@example.com'}})});
 const errorBody=JSON.parse(enabled.calls.at(-1).init.body);assert.deepEqual(errorBody,{category:'runtime',code:'GARANG_RUNTIME',sourceCode:null,retryable:false,fingerprint:null,context:{feature:'coach'}});assert.equal(JSON.stringify(errorBody).includes('private details'),false);
 const disabled=boot(false),before=disabled.calls.length;const suppressed=await disabled.window.fetch(disabled.window.GARANG_SERVICES.analyticsEndpoint,{method:'POST',body:JSON.stringify({name:'today_viewed',props:{source:'nav'}})});assert.equal(suppressed.status,202);assert.equal(disabled.calls.length,before,'analytics without consent must not cross the network');
 console.log('service-telemetry-transport-v1: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
