const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..');
for(const file of ['today.js','data-schema.js'])vm.runInThisContext(fs.readFileSync(path.join(root,file),'utf8'));
const tests=[];
function test(name,fn){try{fn();tests.push({name,status:'PASS'});}catch(error){tests.push({name,status:'FAIL',error:error.message});process.exitCode=1;}}
const at=new Date('2026-09-02T10:00:00.000Z');
const checkin=(input={})=>GarangToday.normalizeCheckin({date:'2026-09-02',energy:3,stress:3,availableMinutes:60,soreness:{},...input},null,at);
const plan={id:'p1',type:'workout',title:'하체 운동',duration:50};

test('missing check-in never creates a numeric recommendation',()=>{const x=GarangToday.evaluate({plan});assert.equal(x.status,'needs_checkin');assert.deepEqual(x.reasonCodes,['CHECKIN_REQUIRED']);});
test('zero available minutes remains valid and wins over other rules',()=>{const x=GarangToday.evaluate({checkin:checkin({availableMinutes:0,energy:1,painCaution:true}),plan});assert.equal(x.status,'no_time');assert.equal(x.adjustment.type,'skip');});
test('pain caution blocks high intensity advice',()=>{const x=GarangToday.evaluate({checkin:checkin({painCaution:true}),plan});assert.equal(x.status,'caution');assert.equal(x.reasonCodes[0],'PAIN_CAUTION');});
test('documented energy, sleep and soreness boundaries are exact',()=>{
 assert.equal(GarangToday.evaluate({checkin:checkin({energy:2}),plan}).status,'light');
 assert.equal(GarangToday.evaluate({checkin:checkin({energy:3}),plan}).status,'ready');
 assert.ok(GarangToday.evaluate({checkin:checkin({sleepHours:4.9}),plan}).reasonCodes.includes('SHORT_SLEEP'));
 assert.ok(!GarangToday.evaluate({checkin:checkin({sleepHours:5}),plan}).reasonCodes.includes('SHORT_SLEEP'));
 assert.ok(GarangToday.evaluate({checkin:checkin({soreness:{legs:4}}),plan}).reasonCodes.includes('HIGH_SORENESS'));
 assert.ok(!GarangToday.evaluate({checkin:checkin({soreness:{legs:3}}),plan}).reasonCodes.includes('HIGH_SORENESS'));
});
test('same input produces the same decision',()=>{const input={checkin:checkin({sleepHours:4.5,soreness:{back:4}}),plan};assert.deepEqual(GarangToday.evaluate(input),GarangToday.evaluate(input));});
test('check-in revision updates one local-date record without turning missing values into zero',()=>{const first=checkin({sleepHours:null,availableMinutes:0}),second=GarangToday.normalizeCheckin({...first,energy:4},first,new Date('2026-09-02T11:00:00Z'));assert.equal(first.sleepHours,null);assert.equal(first.availableMinutes,0);assert.equal(second.revision,2);const state=GarangSchema.migrate({dailyCheckins:[second]});assert.equal(state.dailyCheckins.length,1);assert.equal(state.dailyCheckins[0].timezone,second.timezone);});
test('TODAY UI exposes save, reason and start controls without mutating Planner',()=>{const app=fs.readFileSync(path.join(root,'app.js'),'utf8');for(const token of ['saveTodayCheckin','todayWorkoutStart','reasonCodes','추천 열람만으로 Planner나 운동 기록은 변경되지 않습니다.'])assert.ok(app.includes(token),token);});

console.log(JSON.stringify(tests,null,2));
