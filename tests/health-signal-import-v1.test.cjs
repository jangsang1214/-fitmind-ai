'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const Import=require('../02_core/health-signal-import-v1.js');
const Phys=require('../02_core/physiological-signal-intelligence-v1.js');
const State=require('../02_core/state-intelligence-v1.js');

const json=JSON.stringify({signals:[
 {source:'wearable-json',capturedAt:'2026-09-22T07:00:00Z',hrvMs:48,restingHeartRateBpm:60,sleepHours:7.1},
 {source:'wearable-json',capturedAt:'2026-09-23T07:00:00Z',hrvMs:51,restingHeartRateBpm:59,sleepHours:7.6},
 {source:'wearable-json',capturedAt:'2026-09-24T07:00:00Z',hrvMs:50,restingHeartRateBpm:58,sleepHours:7.8}
]});
const jr=Import.parse(json,{filename:'health.json'});
assert.equal(jr.status,'ready');assert.equal(jr.signals.length,3);assert.ok(jr.signals.every(x=>x.id.startsWith('health_')));

assert.deepEqual(Import.merge(jr.signals,jr).map(x=>x.id),jr.signals.map(x=>x.id),'reimport must dedupe stable signals');

const providerPayload={records:[
 {provider:'Health Connect',dataType:'HeartRateVariabilityRmssd',startTime:'2026-09-24T06:30:00Z',value:52,unit:'ms'},
 {provider:'Health Connect',dataType:'RestingHeartRate',startTime:'2026-09-24T06:30:00Z',value:{numericValue:57},unitName:'count/min'},
 {providerName:'Health Connect',recordType:'SleepDuration',startTime:'2026-09-24T06:30:00Z',quantity:450,unit:'min'}
]};
const providerResult=Import.parseJson(providerPayload,'native-health');
assert.equal(providerResult.length,1,'same provider timestamp must fuse multiple native records');
assert.equal(providerResult[0].hrvMs,52);
assert.equal(providerResult[0].restingHeartRateBpm,57);
assert.equal(providerResult[0].sleepHours,7.5);
const providerParsed=Import.parse(JSON.stringify(providerPayload),{filename:'native-health.json',source:'native-health'});
assert.equal(providerParsed.status,'ready');
assert.equal(providerParsed.signals.length,1);
const firstProviderId=providerParsed.signals[0].id;
const corrected=Import.parse(JSON.stringify({records:[
 {provider:'Health Connect',dataType:'HeartRateVariabilityRmssd',startTime:'2026-09-24T06:30:00Z',value:55,unit:'ms'}
]}),{filename:'native-health.json',source:'native-health'});
const providerMerged=Import.merge(providerParsed.signals,corrected);
assert.equal(providerMerged.length,1,'provider correction at the same source/timestamp must upsert instead of duplicate');
assert.equal(providerMerged[0].hrvMs,55);
assert.equal(providerMerged[0].restingHeartRateBpm,57,'upsert must preserve sibling metrics from the prior provider snapshot');
assert.equal(providerMerged[0].sleepHours,7.5);
assert.equal(providerMerged[0].id,firstProviderId,'provider correction must retain stable identity');
assert.equal(Import.GUARDS.incrementalProviderUpsert,true);
assert.equal(Import.GUARDS.stableProviderIdentity,true);
assert.equal(Import.GUARDS.providerPayloadReady,true);

const csv='date,source,hrvMs,restingHeartRateBpm,sleepHours,steps\n2026-09-23T07:00:00Z,Health Connect,49,59,7.2,9000\n2026-09-24T07:00:00Z,Health Connect,52,57,7.8,11000';
const cr=Import.parse(csv,{filename:'health.csv'});
assert.equal(cr.status,'ready');assert.equal(cr.signals.length,2);assert.equal(cr.signals[1].steps,11000);

const xml='<?xml version="1.0"?><HealthData>'+
 '<Record type="HKQuantityTypeIdentifierHeartRateVariabilitySDNN" sourceName="Apple Watch" unit="ms" value="50" startDate="2026-09-22T07:00:00Z" endDate="2026-09-22T07:00:01Z"/>'+
 '<Record type="HKQuantityTypeIdentifierRestingHeartRate" sourceName="Apple Watch" unit="count/min" value="58" startDate="2026-09-22T07:00:00Z" endDate="2026-09-22T07:00:01Z"/>'+
 '<Record type="HKCategoryTypeIdentifierSleepAnalysis" sourceName="Apple Watch" value="HKCategoryValueSleepAnalysisAsleepCore" startDate="2026-09-21T23:00:00Z" endDate="2026-09-22T06:30:00Z"/>'+
 '</HealthData>';
const xr=Import.parse(xml,{filename:'export.xml'});
assert.equal(xr.status,'ready');assert.equal(xr.format,'apple-health-xml');assert.ok(xr.signals.some(x=>x.hrvMs===50));assert.ok(xr.signals.some(x=>x.sleepHours===7.5));

const root=path.resolve(__dirname,'..'),ctx=vm.createContext({console,Date,Math,URL,AbortController,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(root,'02_core/data-schema.js'),'utf8'),ctx);
const transported=ctx.GarangSchema.toTransport({schemaVersion:8,physiologicalSignals:jr.signals,memory:{entries:[]}});
assert.equal(transported.schemaVersion,9);assert.equal(transported.physiologicalSignals.length,3);
assert.deepEqual(ctx.GarangSchema.toTransport(transported).physiologicalSignals,transported.physiologicalSignals);

const state={physiologicalSignals:jr.signals,workouts:[],runs:[],meals:[],body:[],dailyCheckins:[]};
const now=new Date('2026-09-24T12:00:00Z'),phys=Phys.build(state,{now}),si=State.estimateState(state,{now});
assert.equal(phys.quality,'usable');assert.ok(phys.derived.readinessScore!==null);assert.ok(si.readiness.value!==null);assert.ok(si.readiness.reasons.includes('PHYSIOLOGICAL_SIGNAL_ONLY'));assert.equal(phys.guardrails.noMedicalDiagnosis,true);assert.equal(Import.GUARDS.noNativeProviderClaim,true);
const appSource=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
assert.match(appSource,/function canonicalRecoveryReadiness\(/,'Today surface must expose one canonical recovery-readiness bridge');
assert.match(appSource,/window\.GarangStateIntelligence\?\.estimateState\?\.\(state,\{now:new Date\(\)\}\)/,'canonical recovery readiness must use fused State Intelligence when available');
assert.match(appSource,/const recovery=canonicalRecoveryReadiness\(\),readiness=recovery\.value/,'fallback Coach must consume fused recovery readiness');
assert.match(appSource,/recoveryEvidence=readiness!==null/,'GARANG Score must count physiological-only recovery as real evidence');
assert.match(appSource,/최근 HRV · 안정시 심박 · 수면 등 Health 신호를 회복 판단에 반영했습니다/,'fallback Coach must explain physiological-only evidence instead of pretending a check-in exists');
assert.match(appSource,/data-recovery-evidence/,'Today must expose progressive disclosure for physiological readiness evidence');
assert.match(appSource,/Health 신호로 회복 상태를 읽고 있습니다/,'Today must not present physiological-only recovery as an empty state');
assert.match(appSource,/체크인을 더하면 에너지 · 스트레스 · 근육통을 함께 반영합니다/,'Health evidence must invite subjective context without replacing it');
assert.match(appSource,/최근 신호와 개인 기준선 비교 · 신뢰/,'Health evidence must disclose baseline/freshness confidence context');
console.log('health-signal-import-v1: PASS');
;(async()=>{
 const existing=providerParsed.signals.map(x=>({...x}));
 const existingSnapshot=JSON.stringify(existing);
 const calls={auth:[],read:[]};
 const native={
  async requestAuthorization(scopes){calls.auth.push(scopes.slice());return {granted:true};},
  async readHealthSignals(request){calls.read.push({...request,metrics:request.metrics.slice()});return {provider:'Health Connect',records:[
   {provider:'Health Connect',dataType:'HeartRateVariabilityRmssd',startTime:'2026-09-24T06:30:00Z',value:56,unit:'ms'},
   {provider:'Health Connect',dataType:'StepCount',startTime:'2026-09-25T06:30:00Z',value:12500,unit:'count'}
  ]};}
 };
 const pulled=await Import.pullNative(native,existing,{requestAuthorization:true,maxSignals:5000});
 assert.equal(pulled.status,'ready');
 assert.equal(calls.auth.length,1,'authorization prompt must happen only when explicitly requested');
 assert.ok(calls.auth[0].includes('heartRateVariability'));
 assert.equal(calls.read.length,1);
 assert.equal(calls.read[0].since,'2026-09-24T06:30:00.000Z','native pull must use latest canonical signal as incremental cursor');
 assert.equal(pulled.summary.added,1);
 assert.equal(pulled.summary.updated,1);
 assert.equal(pulled.merged.length,2);
 assert.equal(pulled.merged.find(x=>x.date==='2026-09-24').hrvMs,56);
 assert.equal(pulled.merged.find(x=>x.date==='2026-09-24').restingHeartRateBpm,57,'partial provider correction must preserve sibling metrics');
 assert.equal(pulled.merged.find(x=>x.date==='2026-09-25').steps,12500);
 assert.equal(JSON.stringify(existing),existingSnapshot,'native pull must never mutate or persist caller state directly');

 let prompted=false;
 const passive=await Import.pullNative({async requestAuthorization(){prompted=true;return {granted:true};},async readHealthSignals(){return {provider:'Health Connect',records:[]};}},existing);
 assert.equal(passive.status,'empty');
 assert.equal(prompted,false,'background/passive pull must not trigger permission UI by default');

 let readAfterDenial=false;
 const denied=await Import.pullNative({async requestAuthorization(){return {granted:false};},async readHealthSignals(){readAfterDenial=true;return []; }},existing,{requestAuthorization:true});
 assert.equal(denied.status,'denied');assert.equal(readAfterDenial,false);assert.deepEqual(denied.merged,existing);

 const unavailable=await Import.pullNative({},existing);
 assert.equal(unavailable.status,'unavailable');assert.deepEqual(unavailable.merged,existing);
 assert.equal(Import.GUARDS.nativeBridgeContractReady,true);
 assert.equal(Import.GUARDS.nativePullNoWrite,true);
 assert.equal(Import.GUARDS.permissionPromptExplicit,true);
 assert.equal(Import.GUARDS.incrementalCursor,true);
 assert.equal(Import.GUARDS.idempotentNativePull,true);
 console.log('health-signal-import-v1 native pull: PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});

