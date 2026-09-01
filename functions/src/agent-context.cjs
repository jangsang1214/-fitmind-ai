'use strict';

const SCORE_FORMULA_VERSION='recording-v2';
const isObject=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(isObject):[];
const number=value=>Number.isFinite(Number(value))?Number(value):0;
const cap=value=>Math.round(Math.max(0,Math.min(100,value)));
const validLimit=value=>Math.max(1,Math.min(200,Number.parseInt(value,10)||50));

function parseBearer(value){
 const match=typeof value==='string'&&value.match(/^Bearer\s+([^\s]+)$/i);
 return match?match[1]:null;
}

function timestamp(row){
 const date=Date.parse(`${row?.date||''}T12:00:00Z`);
 return Number.isFinite(date)?date:Number(row?.updatedAtMs||row?.createdAt||0)||0;
}

function latest(value,limit){
 return rows(value).map((row,index)=>({row,index})).sort((a,b)=>timestamp(b.row)-timestamp(a.row)||b.index-a.index).slice(0,limit).map(item=>item.row);
}

function runsWithoutCoordinates(value,limit){
 return latest(value,limit).map(item=>{const {coords,...run}=item;return run;});
}

function calculatePerformance(state,asOf){
 const end=new Date(`${asOf}T23:59:59`).getTime(),start=end-30*86400000;
 const recent=value=>rows(value).filter(item=>{const time=new Date(`${item.date}T12:00:00`).getTime();return time>start&&time<=end;});
 const workouts=recent(state.workouts),meals=recent(state.meals),runs=recent(state.runs),body=recent(state.body),planner=recent(state.planner);
 const sessions=new Set(workouts.map(item=>item.sessionId||item.id)).size;
 const mealDays=new Set(meals.map(item=>item.date)).size;
 const recovery=planner.filter(item=>item.type==='recovery');
 const values={
  exercise:workouts.length?cap(sessions/12*100):null,
  nutrition:meals.length?cap(mealDays/30*100):null,
  recovery:recovery.length?cap(recovery.filter(item=>item.done).length/recovery.length*100):null,
  activity:runs.length||workouts.length?cap(new Set([...runs,...workouts].map(item=>item.date)).size/20*100):null,
  body:body.length?cap(body.filter(item=>number(item.weight)>0).length/3*100):null
 };
 const available=Object.values(values).filter(value=>value!==null);
 return {...values,total:available.length?cap(available.reduce((sum,value)=>sum+value,0)/available.length):null,coverage:available.length,date:asOf,formulaVersion:SCORE_FORMULA_VERSION};
}

function activeMemory(value,now){
 const memory=isObject(value)?value:{};
 const deleted=new Set(Array.isArray(memory.deletedIds)?memory.deletedIds.map(String):[]);
 const entries=rows(memory.entries).filter(entry=>entry.userConfirmed!==false&&!deleted.has(String(entry.id))&&(!entry.expiresAt||Date.parse(entry.expiresAt)>now.getTime()));
 return {
  facts:Array.isArray(memory.facts)?memory.facts:[],
  preferences:Array.isArray(memory.preferences)?memory.preferences:[],
  goals:Array.isArray(memory.goals)?memory.goals:[],
  events:Array.isArray(memory.events)?memory.events:[],
  entries
 };
}

function buildAgentContext(stateInput,options={}){
 const state=isObject(stateInput)?stateInput:{},now=options.now instanceof Date?options.now:new Date(),limit=validLimit(options.limit);
 const asOf=now.toISOString().slice(0,10),profile=isObject(state.profile)?state.profile:null;
 return {
  schemaVersion:Number.isFinite(Number(state.schemaVersion))?Number(state.schemaVersion):null,
  profile,
  goal:profile&&Object.prototype.hasOwnProperty.call(profile,'goal')?profile.goal:null,
  workouts:latest(state.workouts,limit),
  meals:latest(state.meals,limit),
  runs:runsWithoutCoordinates(state.runs,limit),
  body:latest(state.body,limit),
  performanceScore:calculatePerformance(state,asOf),
  planner:latest(state.planner,limit),
  memory:activeMemory(state.memory,now)
 };
}

module.exports={parseBearer,buildAgentContext,calculatePerformance,validLimit};
