'use strict';
const assert=require('node:assert/strict');
const {canonicalEvent,safeError,createTelemetryHandler}=require('../src/telemetry.cjs');

assert.deepEqual(canonicalEvent('workout_saved',{source:'record',email:'x@example.com'}),{name:'record_created',stage:'activation',properties:{source:'record',recordType:'workout'},contractVersion:'garang-analytics-v1'});
assert.deepEqual(canonicalEvent('screen_viewed',{page:'coach',source:'nav'}),{name:'coach_opened',stage:'engagement',properties:{source:'nav'},contractVersion:'garang-analytics-v1'});
assert.equal(canonicalEvent('unknown_event',{}),null);
const sanitized=safeError({category:'runtime',code:'GARANG_RUNTIME',message:'private text',context:{feature:'coach',token:'secret',email:'x@example.com'}});
assert.equal(sanitized.context.feature,'coach');assert.equal('token' in sanitized.context,false);assert.equal('message' in sanitized,false);

function response(){return {statusCode:0,body:null,status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};}
(async()=>{
 const writes=[];const handler=createTelemetryHandler({verifyIdToken:async()=>({uid:'u1'}),readConsent:async()=>true,writeEvent:async(uid,payload)=>writes.push({uid,payload}),clock:()=>new Date('2026-09-14T00:00:00.000Z')});
 const res=response();await handler({path:'/analytics/events',headers:{authorization:'Bearer token'},body:{events:[{name:'planner_completed',props:{source:'planner',actionType:'training',message:'drop-me'}}]}},res);
 assert.equal(res.statusCode,202);assert.equal(res.body.accepted,true);assert.equal(writes[0].payload.events[0].name,'planned_action_completed');assert.equal('message' in writes[0].payload.events[0].properties,false);
 const deniedWrites=[];const denied=createTelemetryHandler({verifyIdToken:async()=>({uid:'u2'}),readConsent:async()=>false,writeEvent:async(...args)=>deniedWrites.push(args)});const deniedRes=response();await denied({path:'/analytics/events',headers:{authorization:'Bearer token'},body:{name:'today_viewed'}},deniedRes);assert.equal(deniedRes.statusCode,202);assert.equal(deniedRes.body.accepted,false);assert.equal(deniedWrites.length,0);
 console.log('telemetry: PASS');
})().catch(error=>{console.error(error);process.exit(1);});
