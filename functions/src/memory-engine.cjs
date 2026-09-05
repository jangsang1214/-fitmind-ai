'use strict';

const crypto=require('node:crypto');
const POLICY_VERSION='memory-v1';
const DAY_MS=86400000;
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(object):[];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)));
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const normalized=value=>clean(value).toLocaleLowerCase('en-US');
const iso=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?new Date(time).toISOString():null;};
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,16);
const tokens=value=>new Set(normalized(value).match(/[\p{L}\p{N}]+/gu)||[]);

function valueOf(entry){return clean(entry?.value??entry?.text??entry?.content??'');}
function dedupeKey(entry){
 const type=clean(entry?.type||'note')||'note';
 const key=clean(entry?.key||'');
 const value=valueOf(entry);
 return key?`${type}:${normalized(key)}`:`${type}:value:${hash(normalized(value))}`;
}
function isExpired(entry,now=new Date()){
 if(!entry?.expiresAt)return false;
 const expires=Date.parse(entry.expiresAt);
 return Number.isFinite(expires)&&expires<=now.getTime();
}
function normalizeEntry(entry,now=new Date()){
 if(!object(entry))return null;
 const value=valueOf(entry);if(!value)return null;
 const type=clean(entry.type||'note')||'note',key=clean(entry.key||'')||null;
 const createdAt=iso(entry.createdAt)||iso(entry.updatedAt)||now.toISOString();
 const updatedAt=iso(entry.updatedAt)||createdAt;
 const lastSeenAt=iso(entry.lastSeenAt)||updatedAt;
 const expiresAt=iso(entry.expiresAt);
 const importance=Number.isFinite(Number(entry.importance))?clamp(entry.importance,1,5):2;
 const confidence=Number.isFinite(Number(entry.confidence))?clamp(entry.confidence,0,1):.7;
 const evidenceCount=Math.max(1,Number.parseInt(entry.evidenceCount,10)||1);
 const userConfirmed=entry.userConfirmed===false?false:true;
 const source=clean(entry.source||'memory')||'memory';
 const identity=dedupeKey({type,key,value});
 return {...entry,id:clean(entry.id)||`mem_${hash(identity)}`,type,key,value,source,importance,confidence,evidenceCount,userConfirmed,createdAt,updatedAt,lastSeenAt,expiresAt};
}
function mergeEntries(base,next,now=new Date()){
 const a=normalizeEntry(base,now),b=normalizeEntry(next,now);if(!a)return b;if(!b)return a;
 const aTime=Date.parse(a.updatedAt)||0,bTime=Date.parse(b.updatedAt)||0;
 const recent=bTime>=aTime?b:a;
 return {...a,...recent,
  id:a.id||b.id,
  type:recent.type||a.type,
  key:recent.key||a.key,
  value:recent.value||a.value,
  source:recent.source||a.source,
  importance:Math.max(a.importance,b.importance),
  confidence:Math.max(a.confidence,b.confidence),
  evidenceCount:(a.evidenceCount||1)+(b.evidenceCount||1),
  userConfirmed:a.userConfirmed===true||b.userConfirmed===true,
  createdAt:(Date.parse(a.createdAt)||Infinity)<=(Date.parse(b.createdAt)||Infinity)?a.createdAt:b.createdAt,
  updatedAt:(Date.parse(a.updatedAt)||0)>=(Date.parse(b.updatedAt)||0)?a.updatedAt:b.updatedAt,
  lastSeenAt:now.toISOString(),
  expiresAt:recent.expiresAt||a.expiresAt||b.expiresAt||null
 };
}
function upsertMemory(entries,candidate,{now=new Date()}={}){
 const list=rows(entries).map(item=>normalizeEntry(item,now)).filter(Boolean),incoming=normalizeEntry(candidate,now);if(!incoming)return list;
 const key=dedupeKey(incoming),index=list.findIndex(item=>dedupeKey(item)===key);
 if(index<0){list.push(incoming);return list;}
 list[index]=mergeEntries(list[index],incoming,now);return list;
}
function scoreMemory(entry,{query='',now=new Date()}={}){
 const item=normalizeEntry(entry,now);if(!item||isExpired(item,now))return -Infinity;
 let score=item.importance*18+item.confidence*12+Math.min(12,Math.log2(item.evidenceCount+1)*4)+(item.userConfirmed?12:-16);
 const seen=Date.parse(item.lastSeenAt||item.updatedAt||item.createdAt)||now.getTime(),ageDays=Math.max(0,(now.getTime()-seen)/DAY_MS);
 score+=Math.max(0,14-Math.log2(ageDays+1)*3.5);
 const q=tokens(query);if(q.size){
  const hay=tokens(`${item.type} ${item.key||''} ${item.value}`);let overlap=0;for(const token of q)if(hay.has(token))overlap++;
  score+=overlap/q.size*36;
  if(normalized(`${item.key||''} ${item.value}`).includes(normalized(query)))score+=18;
 }
 return Number(score.toFixed(4));
}
function compactMemory(entries,{now=new Date(),deletedIds=[],maxEntries=400}={}){
 const deleted=new Set((Array.isArray(deletedIds)?deletedIds:[]).map(String)),map=new Map();
 for(const raw of rows(entries)){
  const item=normalizeEntry(raw,now);if(!item||deleted.has(String(item.id))||isExpired(item,now))continue;
  const key=dedupeKey(item);map.set(key,map.has(key)?mergeEntries(map.get(key),item,now):item);
 }
 return [...map.values()].sort((a,b)=>scoreMemory(b,{now})-scoreMemory(a,{now})||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(1,Number.parseInt(maxEntries,10)||400));
}
function selectMemory(entries,{query='',now=new Date(),limit=24,includeUnconfirmed=false,deletedIds=[]}={}){
 const max=Math.max(1,Math.min(50,Number.parseInt(limit,10)||24));
 return compactMemory(entries,{now,deletedIds}).filter(item=>includeUnconfirmed||item.userConfirmed!==false).map(item=>({...item,_memoryScore:scoreMemory(item,{query,now})})).sort((a,b)=>b._memoryScore-a._memoryScore||String(a.id).localeCompare(String(b.id))).slice(0,max).map(({_memoryScore,...item})=>item);
}
function candidate(type,key,value,{importance=3,confidence=.95,source='user_model',now=new Date(),userConfirmed=true}={}){
 const text=clean(value);if(!text)return null;
 return normalizeEntry({type,key,value:text,importance,confidence,source,userConfirmed,createdAt:now.toISOString(),updatedAt:now.toISOString(),lastSeenAt:now.toISOString()},now);
}
function deriveStructuredCandidates(stateInput,{now=new Date()}={}){
 const state=object(stateInput)?stateInput:{},profile=object(state.profile)?state.profile:{},model=object(state.userModel)?state.userModel:(object(state.onboarding)?state.onboarding:{}),out=[];
 const add=(...args)=>{const item=candidate(...args);if(item)out.push(item);};
 add('goal','primary_goal',profile.goal||model.goal,{importance:5,source:'profile',now});
 add('preference','training_preferences',model.preferences,{importance:4,source:'user_model',now});
 if(Number.isFinite(Number(model.weeklyFrequency)))add('schedule','training_frequency_per_week',String(Number(model.weeklyFrequency)),{importance:4,source:'user_model',now});
 if(Number.isFinite(Number(model.availableMinutes)))add('schedule','available_training_minutes',String(Number(model.availableMinutes)),{importance:4,source:'user_model',now});
 add('identity','training_experience',model.experience,{importance:3,source:'user_model',now});
 return out;
}
function extractExplicitCandidates(text,{now=new Date(),source='coach_explicit'}={}){
 const input=clean(text);if(!input)return [];
 const found=[];const add=(type,key,value,importance)=>{const item=candidate(type,key,value,{importance,confidence:.97,source,now,userConfirmed:true});if(item)found.push(item);};
 const patterns=[
  {re:/(?:내|제)\s*목표(?:는|가)\s+(.{2,80}?)(?:입니다|이에요|예요|이야|야|[.!?]|$)/i,type:'goal',key:'explicit_goal',importance:5},
  {re:/\bmy\s+goal\s+is\s+(.{2,80}?)(?:[.!?]|$)/i,type:'goal',key:'explicit_goal',importance:5},
  {re:/(?:나는|저는|제가)?\s*(.{2,70}?)\s*(?:을|를)?\s*선호(?:해|해요|합니다|한다)(?:[.!?]|$)/i,type:'preference',key:'explicit_preference',importance:4},
  {re:/\bi\s+prefer\s+(.{2,70}?)(?:[.!?]|$)/i,type:'preference',key:'explicit_preference',importance:4},
  {re:/(?:나는|저는|제가)?\s*(.{2,70}?)\s*(?:은|는|을|를)?\s*피하고\s*싶(?:어|어요|습니다)(?:[.!?]|$)/i,type:'preference',key:'explicit_avoidance',importance:4,prefix:'avoid: '},
  {re:/\bi\s+(?:want\s+to\s+)?avoid\s+(.{2,70}?)(?:[.!?]|$)/i,type:'preference',key:'explicit_avoidance',importance:4,prefix:'avoid: '}
 ];
 for(const rule of patterns){const match=input.match(rule.re);if(match?.[1])add(rule.type,rule.key,`${rule.prefix||''}${clean(match[1])}`,rule.importance);}
 return compactMemory(found,{now,maxEntries:20});
}
function prepareMemoryContext(memoryInput,stateInput,{query='',now=new Date(),limit=24,includeUnconfirmed=false}={}){
 const memory=object(memoryInput)?memoryInput:{},deletedIds=Array.isArray(memory.deletedIds)?memory.deletedIds:[];
 let combined=rows(memory.entries);
 for(const item of deriveStructuredCandidates(stateInput,{now}))combined=upsertMemory(combined,item,{now});
 const compacted=compactMemory(combined,{now,deletedIds,maxEntries:400});
 const selected=selectMemory(compacted,{query,now,limit,includeUnconfirmed,deletedIds});
 return {
  facts:Array.isArray(memory.facts)?memory.facts:[],
  preferences:Array.isArray(memory.preferences)?memory.preferences:[],
  goals:Array.isArray(memory.goals)?memory.goals:[],
  events:Array.isArray(memory.events)?memory.events:[],
  entries:selected,
  meta:{policyVersion:POLICY_VERSION,selectedCount:selected.length,activeCount:compacted.length,queryAware:!!clean(query)}
 };
}

module.exports={POLICY_VERSION,normalizeEntry,dedupeKey,isExpired,mergeEntries,upsertMemory,scoreMemory,compactMemory,selectMemory,deriveStructuredCandidates,extractExplicitCandidates,prepareMemoryContext};
