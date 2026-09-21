const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const root=path.resolve(__dirname,'..');
const app=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

assert.ok(app.includes("currentCert={workout:null,workoutRecordId:null,running:null,meal:null,mealRecordId:null}"),'Certification media must keep explicit record bindings');
assert.ok(app.includes("currentCert.workoutRecordId=latestWorkoutRecord.id||null"),'Workout photo proof must pin the selected media to the saved workout record');
assert.ok(app.includes("function workoutSessionSummary(record)"),'Workout certification must summarize the anchored record instead of silently switching to the newest session');
assert.ok(app.includes("currentCert.mealRecordId=meal.id"),'Meal photo proof must bind to the meal that was actually saved');
assert.ok(app.includes("function mountMealCert()"),'Meal Scan must expose a certification surface after photo selection');
assert.ok(app.includes("kind==='meal'")&&app.includes("NUTRITION VERIFIED"),'Certification rendering must support nutrition proof');
assert.ok(app.includes("else if(kind!=='meal')drawAnatomyBadgeCanvas"),'Meal certification must not paint workout anatomy over the food photo');
assert.ok(app.includes("사진 촬영 / 선택"),'Workout certification must use a camera-or-library CTA');
assert.ok(app.includes("disabled=!latestWorkoutRecord"),'Workout certification must stay unavailable until a workout record exists');

const picker=html.match(/<input id="mealScanPicker"[^>]*>/)?.[0]||'';
assert.ok(picker.includes('accept="image/*"'),'Meal photo input must remain image-only');
assert.equal(/capture=/.test(picker),false,'Meal photo input must allow the mobile chooser instead of forcing the camera');
assert.ok(html.includes('<input id="mediaPicker" type="file" accept="image/*,video/*" hidden>'),'Workout proof must retain photo/video selection capability');

console.log('certification-photo-flow-v1: PASS');
