'use strict';
const assert=require('node:assert/strict');

const ENDPOINT='https://asia-northeast3-fitfind-ai.cloudfunctions.net/api/wanted/coach';
const ORIGIN='https://garang-wanted-2026-jangsang1214.vercel.app';
const day=offset=>{const d=new Date();d.setUTCHours(12,0,0,0);d.setUTCDate(d.getUTCDate()+offset);return d.toISOString().slice(0,10);};
const stamp=(offset,hour=8)=>`${day(offset)}T${String(hour).padStart(2,'0')}:00:00.000Z`;
function state(){
 const checkins=[],meals=[],workouts=[];
 for(let i=0;i<14;i++){
  const offset=i-13,fatigue=offset>=-1;
  checkins.push({id:`ci-${i}`,date:day(offset),sleep:fatigue?6.2:7.2,energy:fatigue?3:4,stress:fatigue?4:2,soreness:fatigue?4:2,soreArea:fatigue?'대퇴사두근':'',availableMinutes:40,updatedAt:stamp(offset)});
  for(let meal=0;meal<3;meal++)meals.push({id:`m-${i}-${meal}`,date:day(offset),name:['아침 합성식','점심 합성식','저녁 합성식'][meal],kcal:[450,590,660][meal],protein:[31,52,47][meal],carbs:[64,69,55][meal],fat:[9,11,27][meal],source:'wanted_synthetic',createdAt:stamp(offset,8+meal*6),updatedAt:stamp(offset,8+meal*6)});
  if(i%2===0)workouts.push({id:`w-${i}`,date:day(offset),sessionName:'합성 근력 세션',name:i>=12?'바벨 스쿼트':'벤치프레스',primaryMuscle:i>=12?'대퇴사두근':'가슴',sets:4,reps:i>=12?5:8,weight:i>=12?100:70,rpe:i>=12?9:8,duration:35,volume:i>=12?2000:2240,source:'wanted_synthetic',createdAt:stamp(offset,20),updatedAt:stamp(offset,20)});
 }
 return {wantedDemo:true,meta:{schemaVersion:5,createdAt:stamp(-35),updatedAt:new Date().toISOString(),judgeDataset:{contractVersion:'garang-wanted-judge-data-v1',synthetic:true,spanDays:14,source:'wanted_live_smoke'}},profile:{name:'GARANG Demo',age:29,gender:'male',height:176,weight:74.2,goal:'퍼포먼스 향상'},onboarding:{complete:true,skipped:false,goal:'퍼포먼스 향상',experience:'intermediate',weeklyFrequency:4,availableMinutes:45,preferences:'하체 피로 시 강도 조절'},preferences:{language:'ko',unit:'metric'},checkins,meals,workouts,runs:[{id:'r1',date:day(-4),distanceKm:5,durationMin:30,paceSecPerKm:360,rpe:5}],body:[{id:'b1',date:day(-13),weight:74.8,bodyFat:18.2,muscleMass:33.5},{id:'b2',date:day(-2),weight:74.2,bodyFat:17.8,muscleMass:33.6}],planner:[{id:'p1',date:day(-1),type:'workout',title:'하체 고강도',status:'completed'}],memory:{entries:[{id:'mem1',type:'goal',key:'performance_goal',value:'근력은 유지하면서 체지방을 천천히 낮추고 싶다.',source:'user',confidence:1,importance:5,userConfirmed:true,createdAt:stamp(-30)}]},actionLog:[{id:'a1',action:'replace_lower_with_recovery',reason:'sleep_stress_soreness_tradeoff',at:stamp(0,18)}],analytics:{events:[]},errors:[],plan:'FREE'};
}
(async()=>{
 const response=await fetch(ENDPOINT,{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({message:'오늘 회복 상태를 알려줘',language:'ko',wantedDemo:{contractVersion:'garang-wanted-judge-data-v1',synthetic:true,state:state()}})});
 const text=await response.text();let body={};try{body=JSON.parse(text);}catch{}
 assert.equal(response.status,200,`Wanted Coach smoke failed: ${response.status} ${text.slice(0,500)}`);
 assert.equal(body?.ok,true);
 assert.equal(body?.data?.source,'llm');
 assert.ok(String(body?.answer||body?.data?.answer||'').trim().length>0);
 console.log(JSON.stringify({ok:true,source:body.data.source,requestId:body.data.requestId||null,decisionMode:body.data.garangDecision?.mode||null}));
})().catch(error=>{console.error(error);process.exit(1);});
