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
console.log('health-signal-import-v1: PASS');
