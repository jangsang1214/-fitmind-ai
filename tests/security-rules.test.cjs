'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),rules=fs.readFileSync(path.join(root,'07_config/firestore.rules'),'utf8');
for(const token of ["request.auth.uid == userId","data.meta.syncOwnerUid == userId","globalLearningConsented()","data.consent.globalLearning == true","match /workoutHistory/{recordId}","match /mealHistory/{recordId}","match /runHistory/{recordId}","match /bodyHistory/{recordId}","match /recoverySnapshots/{snapshotId}","validHistory(request.resource.data, userId, 'workouts')","allow read, write: if false"]){assert.ok(rules.includes(token),token);}
assert.ok(rules.includes("hasOnly(['eventType','context','outcome','actionSummary','quality','createdAt'])"));
assert.ok(rules.includes("hasAll(['eventType','context','outcome','actionSummary','quality','createdAt'])"));
assert.doesNotMatch(rules,/allow\s+read\s*,?\s*write\s*:\s*if\s+true/);
assert.equal(rules.includes('match /{document=**} {\n        allow read, write: if isOwner(userId);'),false,'broad owner wildcard must not bypass state/history validators');
console.log('security-rules-static: PASS');
