'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=JSON.parse(read('07_config/analytics-contract-v1.json'));
const app=read('01_app/app.js');
const services=read('07_config/garang-services-config.js');

assert.equal(contract.version,'garang-analytics-v1');
assert.equal(contract.delivery.nonBlocking,true);
assert.equal(contract.delivery.remoteRequiresConsent,true);
assert.equal(contract.delivery.failureMayBlockUserAction,false);

for(const key of ['rawHealthPayloads','rawChatPayloads','email','displayName','providerTokens','preciseLocation','freeText']){
  assert.equal(contract.privacy[key],false,`${key} must remain excluded from analytics`);
}

for(const name of ['signup_completed','onboarding_completed','record_created','first_record_created','today_viewed','coach_opened','coach_recommendation_shown','daily_plan_applied','planned_action_started','planned_action_completed','accumulation_viewed']){
  assert.ok(contract.canonicalEvents[name],`missing canonical analytics event: ${name}`);
}

const expectedLegacy=['workout_saved','meal_saved','run_saved','inbody_saved','ai_chat_answered','ai_plan_applied','planner_completed'];
for(const legacy of expectedLegacy){
  assert.ok(contract.legacyEventMapping[legacy],`missing legacy mapping: ${legacy}`);
  assert.ok(app.includes(`event:'${legacy}'`)||app.includes(`trackEvent('${legacy}'`),`runtime no longer emits expected legacy event: ${legacy}`);
}

assert.match(app,/trackEvent\('signup_completed'\)/);
assert.match(app,/event:'onboarding_completed'/);
assert.match(app,/trackEvent\('screen_viewed'/);
assert.match(services,/analyticsConsent:\s*false/,'remote analytics consent must default to false');
assert.match(services,/analyticsContractVersion:\s*'garang-analytics-v1'/);

const forbiddenProperty=/email|displayName|message|prompt|answer|latitude|longitude|token|raw/i;
for(const [eventName,event] of Object.entries(contract.canonicalEvents)){
  for(const property of event.allowedProperties||[])assert.equal(forbiddenProperty.test(property),false,`${eventName} exposes sensitive property ${property}`);
}

console.log('analytics-contract-v1: PASS',JSON.stringify({canonical:Object.keys(contract.canonicalEvents).length,legacy:Object.keys(contract.legacyEventMapping).length}));
