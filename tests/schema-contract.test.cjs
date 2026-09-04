const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const ctx=vm.createContext({console,Date,Math,URL,AbortController,setTimeout,clearTimeout});
for(const file of ['02_core/data-schema.js','services/performance.js','services/adapters.js'])vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),ctx);
const G=ctx.GarangSchema,A=ctx.GarangAdapters,tests=[];
function test(name,fn){try{fn();tests.push({name,status:'PASS'});}catch(error){tests.push({name,status:'FAIL',error:error.message});process.exitCode=1;}}

test('production contract identity is frozen',()=>{
 assert.equal(G.CONTRACT_VERSION,'garang-state-v1');
 assert.equal(G.VERSION,8);
 assert.equal(G.CONTRACT.schemaVersion,8);
 assert.equal(G.CONTRACT.units.weight,'kg');
 assert.equal(G.CONTRACT.units.distance,'km');
 assert.ok(G.CONTRACT.domains.includes('userModel'));
 assert.ok(G.CONTRACT.domains.includes('dailyCheckins'));
});

test('active app aliases migrate to canonical server fields without data loss',()=>{
 const source={
  meta:{schemaVersion:5,updatedAt:'2026-09-04T10:00:00.000Z'},
  profile:{name:'A',age:23,height:174,weight:67,goal:'퍼포먼스 향상'},
  onboarding:{goal:'근육 증가',experience:'intermediate',weeklyFrequency:4,availableMinutes:60,preferences:'저녁'},
  preferences:{language:'en',unit:'imperial'},
  checkins:[{id:'c1',date:'2026-09-04',sleepHours:7,energy:4,stress:2}],
  aiChat:[{id:'a1',role:'user',text:'hello'}],
  body:[{id:'b1',date:'2026-09-04',weight:67,muscle:31,fatPercent:14.5,leanMass:57.3}],
  planner:[{id:'p1',date:'2026-09-04',time:'18:30',title:'상체',type:'workout',completed:true,source:'ai'}],
  memory:{entries:[{id:'m1',type:'preference',key:'time',value:'저녁',confidence:.8,importance:4,userConfirmed:true}]}
 };
 const x=G.toTransport(source);
 assert.equal(x.contractVersion,'garang-state-v1');
 assert.equal(x.userModel.goal,'근육 증가');
 assert.equal(x.settings.unit,'imperial');
 assert.equal(x.language,'en');
 assert.equal(x.dailyCheckins.length,1);
 assert.equal(x.aiChats.length,1);
 assert.equal(x.body[0].bodyFat,14.5);
 assert.equal('fatPercent' in x.body[0],false);
 assert.equal(x.planner[0].done,true);
 assert.equal(x.planner[0].origin,'ai');
 assert.equal('completed' in x.planner[0],false);
 assert.equal('source' in x.planner[0],false);
 assert.equal(x.memory.entries[0].importance,4);
 assert.equal(G.validateContract(x).length,0);
});

test('legacy normalized memory importance is upgraded to the 1-5 contract scale',()=>{
 const x=G.migrate({schemaVersion:7,memory:{entries:[{id:'m',importance:.5,confidence:.5,value:'x'}],legacyMigrated:true}});
 assert.equal(x.memory.entries[0].importance,3);
 assert.equal(x.memory.entries[0].confidence,.5);
});

test('transport output contains canonical top-level keys and excludes local UI containers',()=>{
 const x=G.toTransport({meta:{schemaVersion:5},preferences:{language:'ko'},checkins:[],aiChat:[],onboarding:{goal:'건강'},workouts:[],meals:[],runs:[],body:[],planner:[],memory:{entries:[]}});
 for(const key of G.CONTRACT.topLevel)assert.ok(key in x,key);
 for(const localOnly of ['meta','preferences','checkins','aiChat','onboarding','actionLog','analytics','errors'])assert.equal(localOnly in x,false,localOnly);
});

test('contract validation rejects malformed canonical state',()=>{
 const x=G.empty();x.planner=[{id:'p',date:'2026-09-04',time:'99:99',done:'yes',origin:'user'}];
 const errors=G.validateContract(x);
 assert.ok(errors.includes('planner.time'));
 assert.ok(errors.includes('planner.done'));
 assert.throws(()=>G.assertContract(x),/INVALID_CONTRACT/);
});

test('migration and transport are idempotent at the frozen boundary',()=>{
 const a=G.toTransport({profile:{name:'A',weight:70},workouts:[{id:'w1',date:'2026-09-04',name:'Bench',sets:3,reps:10,weight:80}],memory:{entries:[]}});
 const b=G.toTransport(a);
 assert.equal(JSON.stringify(b),JSON.stringify(a));
});

test('AI context is generated from the canonical contract, including user model and check-ins',()=>{
 const c=A.context({preferences:{language:'ko'},onboarding:{goal:'러닝',weeklyFrequency:3},checkins:[{id:'c1',date:'2026-09-04'}],workouts:[],meals:[],runs:[],body:[],planner:[],memory:{entries:[]}});
 assert.equal(c.contractVersion,'garang-state-v1');
 assert.equal(c.schemaVersion,8);
 assert.equal(c.userModel.goal,'러닝');
 assert.equal(c.dailyCheckins.length,1);
});

console.log(JSON.stringify(tests,null,2));
