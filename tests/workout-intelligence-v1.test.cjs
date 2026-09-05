'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Core=require('../02_core/workout-intelligence-v1.js');
const root=path.resolve(__dirname,'..');
const now=new Date('2026-09-06T12:00:00Z');
const db=[
 {exercise_name:'바벨 벤치프레스',primary_muscle:'가슴'},{exercise_name:'덤벨 플라이',primary_muscle:'가슴'},{exercise_name:'푸시업',primary_muscle:'가슴'},
 {exercise_name:'바벨 로우',primary_muscle:'등'},{exercise_name:'랫풀다운',primary_muscle:'등'},{exercise_name:'풀업',primary_muscle:'등'},
 {exercise_name:'백 스쿼트',primary_muscle:'하체'},{exercise_name:'루마니안 데드리프트',primary_muscle:'하체'},{exercise_name:'런지',primary_muscle:'하체'},
 {exercise_name:'덤벨 숄더프레스',primary_muscle:'어깨'},{exercise_name:'사이드 레터럴 레이즈',primary_muscle:'어깨'},
 {exercise_name:'플랭크',primary_muscle:'코어'},{exercise_name:'크런치',primary_muscle:'코어'},
 {exercise_name:'덤벨 컬',primary_muscle:'이두'},{exercise_name:'케이블 푸시다운',primary_muscle:'삼두'}
];
function fixture(){return {profile:{weight:70},onboarding:{availableMinutes:50},checkins:[{id:'c1',date:'2026-09-06',sleep:7.5,energy:4,stress:2,soreness:2,availableMinutes:50}],workouts:[
 {id:'w1',sessionId:'s1',date:'2026-09-05',name:'바벨 벤치프레스',primaryMuscle:'가슴',sets:4,reps:8,weight:70,rpe:8,volume:2240},
 {id:'w2',sessionId:'s1',date:'2026-09-05',name:'덤벨 플라이',primaryMuscle:'가슴',sets:3,reps:12,weight:15,rpe:8.5,volume:540},
 {id:'w3',sessionId:'s2',date:'2026-09-03',name:'바벨 로우',primaryMuscle:'등',sets:3,reps:10,weight:55,rpe:7,volume:1650},
 {id:'w4',sessionId:'s3',date:'2026-09-02',name:'백 스쿼트',primaryMuscle:'하체',sets:3,reps:8,weight:80,rpe:7.5,volume:1920}
 ]};}
let passed=0;function test(name,fn){fn();passed++;console.log(`PASS ${name}`);}
test('Coach intents are distinct for plan, recovery, intensity and recent workout analysis',()=>{
 assert.equal(Core.classifyCoachIntent('오늘 계획을 만들어줘'),'plan');
 assert.equal(Core.classifyCoachIntent('오늘 회복 상태를 알려줘'),'recovery');
 assert.equal(Core.classifyCoachIntent('오늘 운동 강도를 내 기록 기준으로 정해줘'),'training_intensity');
 assert.equal(Core.classifyCoachIntent('내 최근 운동 기록을 분석해줘'),'recent_workout');
});
test('legacy Today check-in fields are normalized for recovery intelligence',()=>{const c=Core.normalizedCheckin(fixture(),now);assert.equal(c.sleepHours,7.5);assert.equal(c.sorenessMax,2);const r=Core.readiness(fixture(),{now});assert.ok(r.score>60);});
test('recent workout analysis aggregates body part, sets and RPE instead of only latest exercise',()=>{const loads=Core.analyzeMuscleLoad(fixture(),db,{now,days:7});const chest=loads.find(x=>x.key==='chest');assert.equal(chest.sessionCount,1);assert.equal(chest.sets,7);assert.equal(chest.volume,2780);assert.ok(chest.avgRPE>8);assert.equal(loads[0].key,'chest');});
test('local answers for recovery and plan are meaningfully different',()=>{const recovery=Core.answerCoach(fixture(),db,'오늘 회복 상태를 알려줘',{now,language:'ko'}),plan=Core.answerCoach(fixture(),db,'오늘 계획을 만들어줘',{now,language:'ko'});assert.notEqual(recovery,plan);assert.match(recovery,/회복 상태/);assert.match(plan,/루틴/);assert.match(plan,/RPE/);});
test('daily workout plan respects explicit target and time',()=>{const plan=Core.generateWorkoutPlan(fixture(),db,{target:'back',minutes:45,intensity:'moderate'},{now});assert.equal(plan.target,'back');assert.equal(plan.minutes,45);assert.ok(plan.exercises.length>=2);assert.ok(plan.exercises.every(x=>x.muscle==='back'));assert.ok(plan.exercises.every(x=>x.targetRPE<=7.5));});
test('low recovery caps a requested hard workout instead of silently pushing intensity',()=>{const s=fixture();s.checkins=[{date:'2026-09-06',sleep:4.5,energy:1,stress:5,soreness:5,soreArea:'가슴',availableMinutes:40}];const plan=Core.generateWorkoutPlan(s,db,{target:'chest',minutes:40,intensity:'hard'},{now});assert.equal(plan.adjusted,true);assert.ok(plan.targetRPE<=6);assert.ok(plan.volumeScale<=.65);});
test('suggested weight never exceeds the latest logged weight',()=>{const plan=Core.generateWorkoutPlan(fixture(),db,{target:'chest',minutes:30,intensity:'hard'},{now});const bench=plan.exercises.find(x=>x.name==='바벨 벤치프레스');if(bench&&bench.suggestedWeight!=null)assert.ok(bench.suggestedWeight<=70);});
test('runtime exposes Today recommender, set-by-set input and canonical import queue',()=>{const source=fs.readFileSync(path.join(root,'06_features/ui/runtime/garang-workout-intelligence-ui-v1.js'),'utf8');for(const token of ['garang-daily-workout','garang-set-builder','data-garang-set-row','garang_workout_import_queue_v1','#addWorkout','garang_coach_threads_v2::'])assert.ok(source.includes(token),token);});
test('runtime wiring loads core before app and UI enhancement after existing experience layers',()=>{const html=fs.readFileSync(path.join(root,'index.html'),'utf8');assert.ok(html.indexOf('./02_core/workout-intelligence-v1.js')<html.indexOf('./01_app/app.js'));assert.ok(html.indexOf('./06_features/ui/runtime/garang-experience-v4.js')<html.indexOf('./06_features/ui/runtime/garang-workout-intelligence-ui-v1.js'));});
console.log(`${passed} workout intelligence tests passed`);
