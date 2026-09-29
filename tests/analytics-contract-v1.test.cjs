'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const contract=JSON.parse(read('07_config/analytics-contract-v1.json'));
const app=read('01_app/app.js');
const nutritionRuntime=read('06_features/ui/runtime/garang-nutrition-recommendation-v1.js');
const services=read('07_config/garang-services-config.js');

assert.equal(contract.version,'garang-analytics-v1');
assert.equal(contract.delivery.nonBlocking,true);
assert.equal(contract.delivery.remoteRequiresConsent,true);
assert.equal(contract.delivery.failureMayBlockUserAction,false);

for(const key of ['rawHealthPayloads','rawChatPayloads','email','displayName','providerTokens','preciseLocation','freeText']){
  assert.equal(contract.privacy[key],false,`${key} must remain excluded from analytics`);
}

for(const name of ['signup_completed','onboarding_completed','record_created','first_record_created','today_viewed','coach_opened','coach_recommendation_shown','daily_plan_applied','planned_action_started','planned_action_completed','accumulation_viewed','meal_reminder_configured','meal_reminder_shown','meal_reminder_opened','meal_scan_started_from_reminder','meal_scan_confirmed','meal_review_viewed','next_meal_recommendation_shown','next_meal_recommendation_accepted','next_meal_recommendation_modified','next_meal_recommendation_dismissed','next_meal_recorded']){
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
assert.match(app,/privacy:\{consent:\{analytics:false\}\}/,'analytics consent must default to false in canonical user state');
assert.match(app,/analyticsConsentSetting/,'Settings must expose an explicit analytics consent control');
assert.match(app,/saveMealSchedule/,'Settings must expose beginner meal schedule configuration');
assert.match(app,/meal_reminder_configured/,'meal schedule configuration must emit the canonical analytics event');
assert.match(app,/GarangMealReminderBridge/,'app must keep Meal Scan reminder action ownership explicit');
assert.match(app,/GarangNutritionEvidenceBridge/,'nutrition learning evidence must reuse the app-owned analytics boundary');
assert.match(app,/next_meal_recorded/,'saved meals must close recommendation lineage with a recorded outcome');
assert.match(app,/next_meal_recommendation_modified/,'editing a recommended draft must preserve modification evidence');
assert.match(nutritionRuntime,/next_meal_recommendation_shown/,'recommendation visibility must become evidence');
assert.match(nutritionRuntime,/next_meal_recommendation_accepted/,'recommendation acceptance must become evidence');
assert.match(nutritionRuntime,/next_meal_recommendation_dismissed/,'recommendation dismissal must become evidence');
assert.doesNotMatch(nutritionRuntime,/recommendationId\s*=\s*\[[^\]]*(?:proteinTarget|proteinActualBefore|proteinRemainingBefore)/s,'analytics recommendation identity must not encode nutrition measurements');
assert.doesNotMatch(app,/Notification\.requestPermission/,'meal schedule/reminder v1 must not request browser notification permission implicitly');
assert.match(app,/SERVICES\.analyticsEndpoint&&state\.privacy\?\.consent\?\.analytics===true/,'remote analytics must require explicit in-app consent');
assert.match(app,/delete out\.analytics;delete out\.errors/,'analytics and local error logs must not piggyback on general Cloud Sync');
assert.match(app,/FIRST_RECORD_EVENT_TYPES/);
assert.match(app,/trackEvent\('first_record_created',\{recordType,source\},true\)/,'first record must be emitted exactly through the guarded first-record path');
assert.match(services,/analyticsConsent:\s*false/,'remote analytics consent must default to false');
assert.match(services,/analyticsContractVersion:\s*'garang-analytics-v1'/);

const forbiddenProperty=/email|displayName|message|prompt|answer|latitude|longitude|token|raw/i;
for(const [eventName,event] of Object.entries(contract.canonicalEvents)){
  for(const property of event.allowedProperties||[])assert.equal(forbiddenProperty.test(property),false,`${eventName} exposes sensitive property ${property}`);
}

console.log('analytics-contract-v1: PASS',JSON.stringify({canonical:Object.keys(contract.canonicalEvents).length,legacy:Object.keys(contract.legacyEventMapping).length}));
