const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['data-schema.js','performance.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const tests=[];
function test(name,fn){try{fn();tests.push({name,status:'PASS'});}catch(error){tests.push({name,status:'FAIL',error:error.message});process.exitCode=1;}}

test('null and blank numeric inputs remain missing',()=>{
 assert.equal(GarangSchema.numeric(null),null);assert.equal(GarangSchema.numeric('  '),null);assert.equal(GarangSchema.numeric('70'),70);
});
test('three InBody inputs derive fat mass, BMI and resting metabolism',()=>{
 const x=GarangSchema.deriveBodyMetrics({weight:80,bodyFat:25,muscle:32},{height:180});
 assert.equal(x.fatMass,20);assert.equal(x.bmi,24.7);assert.equal(x.bmr,1666);assert.deepEqual(x.estimatedMetrics,['fatMass','bmr','bmi']);
 assert.equal(x.calculationVersion,GarangSchema.BODY_ESTIMATE_VERSION);assert.equal(x.heightAtMeasurement,180);
});
test('missing profile height leaves only BMI uncalculated',()=>{
 const x=GarangSchema.deriveBodyMetrics({weight:'70',bodyFat:'20',muscle:'30'},{});
 assert.equal(x.fatMass,14);assert.equal(x.bmr,1580);assert.equal(x.bmi,null);assert.doesNotMatch(JSON.stringify(x),/NaN/);
});
test('missing body measurements never become estimated zeroes',()=>{
 const x=GarangSchema.deriveBodyMetrics({weight:70,bodyFat:null,muscle:''},{height:175});
 assert.equal(x.fatMass,null);assert.equal(x.bmr,null);assert.equal(x.bmi,22.9);assert.equal(x.muscle,null);
});
test('history labels only versioned calculations as automatic estimates',()=>{
 const features=fs.readFileSync(path.join(root,'features.js'),'utf8');
 assert.match(features,/calculationVersion===G\.BODY_ESTIMATE_VERSION\?'estimateTag':'recordedValues'/);
});
test('workout insights group body parts and expose weight, e1RM and volume PRs',()=>{
 const state=GarangSchema.migrate({workouts:[
  {id:'b1',name:'벤치',date:'2026-08-30',sets:3,reps:10,weight:80,volume:2400,sessionId:'s1'},
  {id:'b2',name:'벤치',date:'2026-09-01',sets:5,reps:5,weight:100,volume:2500,sessionId:'s2'},
  {id:'s1',name:'스쿼트',date:'2026-08-31',sets:5,reps:5,weight:120,volume:3000,sessionId:'s3'}
 ]});
 const x=GarangPerformance.workoutInsights(state,[{exercise_name:'벤치',primary_muscle:'가슴'},{exercise_name:'스쿼트',primary_muscle:'하체'}]);
 assert.equal(x.byMuscle.length,2);assert.equal(x.byMuscle.find(g=>g.name==='가슴').records[0].id,'b2');
 assert.equal(x.topWeight.name,'스쿼트');assert.equal(x.topVolume.volume,3000);assert.equal(x.exercises.find(e=>e.name==='벤치').maxEstimated1RM.weight,100);
});
test('running insights separate distance-weighted average, fastest and longest records',()=>{
 const state=GarangSchema.migrate({runs:[{id:'r1',date:'2026-08-30',distance:5,duration:30,pace:6},{id:'r2',date:'2026-09-01',distance:10,duration:55,pace:5.5}]});
 const x=GarangPerformance.runningInsights(state);assert.equal(x.count,2);assert.equal(x.totalDistance,15);assert.equal(x.averagePace,85/15);assert.equal(x.fastest.id,'r2');assert.equal(x.longest.id,'r2');assert.equal(GarangPerformance.formatPace(x.averagePace),'5:40');
});
test('workout and running pages render the new record dashboards',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const token of ['renderWorkoutInsights()','renderRunningInsights()','primaryMuscle','종목별 PR 현황','거리 가중 평균'])assert.ok(app.includes(token),token);
});
test('planner, AI action and memory controls use readable application UI',()=>{
 const features=fs.readFileSync(path.join(root,'features.js'),'utf8'),css=fs.readFileSync(path.join(root,'final.css'),'utf8');
 for(const token of ['planner-filter-card','select-shell','memory-form-card','memory-category-chip','data-ai-plan'])assert.ok(features.includes(token),token);
 for(const token of ['.planner-filter-card','.memory-form-card','.memory-category-chip','button[data-ai-plan]'])assert.ok(css.includes(token),token);
});
test('certification supports gallery media and standalone transparent PNG overlays',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8'),html=fs.readFileSync(path.join(root,'index.html'),'utf8');
 for(const token of ['workoutOverlayOnly','runOverlayOnly','saveTransparentOverlay','image/png','투명 오버레이 PNG','사진첩에서 불러오기'])assert.ok(app.includes(token),token);
 assert.match(html,/id="mediaPicker"[^>]+accept="image\/\*,video\/\*"/);assert.doesNotMatch(html,/id="mediaPicker"[^>]+capture=/);
});
test('all form controls are constrained to their card width on narrow devices',()=>{
 const css=fs.readFileSync(path.join(root,'final.css'),'utf8');
 for(const token of ['min-inline-size:0','max-inline-size:100%','input[type=date],input[type=time]','::-webkit-date-and-time-value','@media(max-width:360px)'])assert.ok(css.includes(token),token);
 assert.match(css,/\.planner-filter-actions\{grid-template-columns:1fr\}/);
});
test('first account cache safely receives demo records',()=>{
 const guest=GarangSchema.migrate({profile:{name:'Guest',weight:70},workouts:[{id:'w1',date:'2026-09-01'}]});
 const account=GarangSchema.accountBootstrap(false,guest,true);assert.equal(account.workouts.length,1);assert.equal(account.profile.weight,70);
 assert.equal(GarangSchema.accountBootstrap(true,guest,true),null);
});
test('an empty non-demo account does not inherit guest records',()=>{
 const guest=GarangSchema.migrate({workouts:[{id:'w1',date:'2026-09-01'}]});assert.equal(GarangSchema.accountBootstrap(false,guest,false).workouts.length,0);
});
test('cloud merge preserves unique local and remote records',()=>{
 const local=GarangSchema.migrate({profile:null,workouts:[],meals:[{id:'local',date:'2026-09-01'}],updatedAtMs:999});
 const remote=GarangSchema.migrate({profile:{name:'Cloud'},workouts:[],meals:[{id:'remote',date:'2026-08-01'}],updatedAtMs:1});
 const merged=GarangSchema.mergeStates(local,remote);assert.deepEqual(new Set(merged.meals.map(x=>x.id)),new Set(['local','remote']));
});
test('cloud merge resolves the same record by its newest timestamp',()=>{
 const local=GarangSchema.migrate({workouts:[{id:'shared',date:'2026-09-01',name:'local-new',updatedAt:'2026-09-01T10:00:00Z'}],updatedAtMs:1});
 const remote=GarangSchema.migrate({workouts:[{id:'shared',date:'2026-09-01',name:'remote-old',updatedAt:'2026-09-01T09:00:00Z'}],updatedAtMs:2});
 const merged=GarangSchema.mergeStates(local,remote);assert.equal(merged.workouts.length,1);assert.equal(merged.workouts[0].name,'local-new');
});
test('score history records formula versions and ignores legacy comparison',()=>{
 const migrated=GarangSchema.migrate({scoreHistory:[{date:'2026-08-31',total:88}]});assert.equal(migrated.scoreHistory[0].formulaVersion,'legacy');
 const score=GarangPerformance.calculate(GarangSchema.migrate({body:[{id:'b1',date:'2026-09-01',weight:70}]}));assert.equal(score.formulaVersion,GarangSchema.SCORE_FORMULA_VERSION);
 assert.notEqual(score.formulaVersion,migrated.scoreHistory[0].formulaVersion);
});
test('empty score coach response never exposes null',()=>{
 const score=GarangPerformance.calculate(GarangSchema.empty()),ko=GarangPerformance.coachSummary(score,'ko'),en=GarangPerformance.coachSummary(score,'en');
 assert.equal(score.total,null);assert.doesNotMatch(ko,/null\/100|null/);assert.doesNotMatch(en,/null\/100|null/);assert.match(ko,/기록이 부족/);
});
test('active application consumes the safety helpers',()=>{
 const app=fs.readFileSync(path.join(root,'app.js'),'utf8');
 for(const token of ['GarangSchema.numeric(v)','GarangSchema.accountBootstrap','GarangSchema.mergeStates','GarangPerformance.coachSummary'])assert.match(app,new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
 assert.doesNotMatch(app,/\(!state\.profile&&!state\.workouts\.length\)/);
});
test('flat runtime and categorized source stay synchronized',()=>{
 const exact={'data-schema.js':'02_core/data-schema.js','performance.js':'services/performance.js','features.js':'06_features/final/features.js','final.css':'03_styles/features/final.css'};
 for(const [flat,source] of Object.entries(exact))assert.equal(fs.readFileSync(path.join(root,flat),'utf8'),fs.readFileSync(path.join(root,source),'utf8'),flat);
 let flat=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n'),source=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8').replace(/\r\n/g,'\n');
 for(const name of ['exercise-db.json','food-db.json','exercise_knowledge.jsonl','food_knowledge.jsonl','fitmind_rules.jsonl','fitmind_sft.jsonl','synthetic_korean_dialogue_v6.jsonl'])source=source.replaceAll('04_data/knowledge/'+name,name);
 assert.equal(flat,source,'app.js');
});

console.log(JSON.stringify(tests,null,2));
