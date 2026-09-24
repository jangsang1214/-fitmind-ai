'use strict';
const assert=require('node:assert/strict');
const Personal=require('../02_core/personal-performance-intelligence-v1.js');

const dims={
 trainingConsistency:{value:72,confidence:.8,sampleSize:12},
 recoveryStability:{value:60,confidence:.7,sampleSize:8},
 nutritionConsistency:{value:42,confidence:.7,sampleSize:14},
 planAdherence:{value:75,confidence:.8,sampleSize:10},
 attributedOutcomeScore:{value:68,confidence:.6,sampleSize:6}
};
const nutritionFocus=Personal.build({
 userState:{asOf:'2026-09-24',confidence:.75,readiness:{band:'ready',reasons:['CHECKIN_STABLE']},fatigue:{band:'low'},load:{band:'stable'}},
 runningPerformance:{asOf:'2026-09-24',confidence:.7,trend:{status:'measured',direction:'stable'},load:{band:'stable'},recommendation:{action:'maintain_consistency'},evidence:{validRuns:8}},
 userPerformance:{dimensions:dims},weeklyReview:{nextAdjustment:{kind:'hold'}}
});
assert.equal(nutritionFocus.focus.domain,'nutrition');
assert.equal(nutritionFocus.focus.action,'simplify_next_nutrition_action');
assert.equal(nutritionFocus.guardrails.noSilentMutation,true);

const recoveryFocus=Personal.build({
 userState:{confidence:.7,readiness:{band:'low',reasons:['PAIN_CAUTION']},fatigue:{band:'high',reasons:['PAIN_CAUTION']},load:{band:'spike'}},
 runningPerformance:{confidence:.8,trend:{status:'measured',direction:'improving'},load:{band:'stable'},evidence:{validRuns:12}},
 userPerformance:{dimensions:dims}
});
assert.equal(recoveryFocus.focus.domain,'recovery','safety must outrank optimization');
assert.equal(recoveryFocus.status,'protect');
assert.equal(recoveryFocus.guardrails.noAutomaticProgression,true);
console.log('personal-performance-intelligence-v1: PASS');
