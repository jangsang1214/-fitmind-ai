'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Core=require('../02_core/running-integrity-v1.js');
const app=fs.readFileSync(path.join(__dirname,'..','01_app/app.js'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'..','runtime-manifest.json'),'utf8'));

const first=Core.assessPosition(null,{latitude:37,longitude:127,timestamp:1000,elapsedMs:1000,accuracy:8});
assert.equal(first.accepted,true,'good first GPS fix must be accepted');
assert.equal(Core.assessPosition(null,{latitude:37,longitude:127,timestamp:1000,elapsedMs:1000,accuracy:80}).reason,'LOW_ACCURACY','low-accuracy fixes must be rejected');
const jump=Core.assessPosition(first.point,{latitude:37.02,longitude:127,timestamp:2000,elapsedMs:2000,accuracy:8});
assert.equal(jump.reason,'IMPLAUSIBLE_SPEED','GPS jumps must not inflate distance');
const jitter=Core.assessPosition(first.point,{latitude:37.000005,longitude:127,timestamp:3000,elapsedMs:3000,accuracy:8});
assert.equal(jitter.ignored,true,'sub-2m GPS jitter must be ignored');

const splits=Core.buildSplits([
  [37,127,0,0,5],
  [37.0045,127,300000,300000,5],
  [37.009,127,600000,600000,5],
  [37.0135,127,900000,900000,5],
  [37.018,127,1200000,1200000,5]
]);
assert.ok(splits.length>=1,'filtered GPS track must produce kilometer splits');
assert.ok(splits[0].durationMin>8&&splits[0].durationMin<12,'split time must use active elapsed time');

for(const token of ['runPause','pauseRun(\'manual\')','GarangRunningIntegrity?.assessPosition','gpsQuality','buildSplits','runEvidenceDraft','attachRunningEvidence','run_photo_evidence_saved','data-run-delete','run-split-pills','RUN EVIDENCE'])assert.ok(app.includes(token),token);
assert.ok(html.includes('id="runPhotoPicker"'),'running must have a camera-capable photo picker');
assert.ok(html.indexOf('02_core/running-integrity-v1.js')<html.indexOf('01_app/app.js'),'running integrity core must load before app');
assert.ok(manifest.scripts.includes('02_core/running-integrity-v1.js'),'runtime manifest must include running integrity core');
console.log('running-integrity-v1: PASS');