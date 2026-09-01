const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['data-schema.js','performance.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const tests=[];
function test(name,fn){try{fn();tests.push({name,status:'PASS'});}catch(error){tests.push({name,status:'FAIL',error:error.message});process.exitCode=1;}}

test('null and blank numeric inputs remain missing',()=>{
 assert.equal(GarangSchema.numeric(null),null);assert.equal(GarangSchema.numeric('  '),null);assert.equal(GarangSchema.numeric('70'),70);
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
 const exact={'data-schema.js':'02_core/data-schema.js','performance.js':'services/performance.js','features.js':'06_features/final/features.js'};
 for(const [flat,source] of Object.entries(exact))assert.equal(fs.readFileSync(path.join(root,flat),'utf8'),fs.readFileSync(path.join(root,source),'utf8'),flat);
 let flat=fs.readFileSync(path.join(root,'app.js'),'utf8').replace(/\r\n/g,'\n'),source=fs.readFileSync(path.join(root,'01_app/app.js'),'utf8').replace(/\r\n/g,'\n');
 for(const name of ['exercise-db.json','food-db.json','exercise_knowledge.jsonl','food_knowledge.jsonl','fitmind_rules.jsonl','fitmind_sft.jsonl','synthetic_korean_dialogue_v6.jsonl'])source=source.replaceAll('04_data/knowledge/'+name,name);
 assert.equal(flat,source,'app.js');
});

console.log(JSON.stringify(tests,null,2));
