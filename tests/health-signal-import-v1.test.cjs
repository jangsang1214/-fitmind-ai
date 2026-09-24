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
console.log('health-signal-import-v1: PASS');
