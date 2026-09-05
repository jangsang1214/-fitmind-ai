'use strict';

const crypto=require('node:crypto');
const POLICY_VERSION='memory-intelligence-v1';
const MEMORY_CLASSES=Object.freeze(['episodic','semantic','procedural','preference','state']);
const DAY_MS=86400000;
const SOURCE_TRUST=Object.freeze({user:1,agent:.92,profile:.98,user_model:.95,coach_explicit:.98,structured:.94,memory:.7,unknown:.6});
const object=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const rows=value=>Array.isArray(value)?value.filter(object):[];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)));
const clean=value=>String(value??'').replace(/\s+/g,' ').trim();
const normalized=value=>clean(value).toLocaleLowerCase('en-US');
const iso=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?new Date(time).toISOString():null;};
const hash=value=>crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,16);
const tokens=value=>new Set(normalized(value).match(/[\p{L}\p{N}]+/gu)||[]);

function valueOf(entry){return clean(entry?.value??entry?.text??entry?.content??'');}
function inferClass(type,explicit){if(MEMORY_CLASSES.includes(explicit))return explicit;const t=clean(type);if(['preference','avoidance'].includes(t))return 'preference';if(['state','recovery','readiness'].includes(t))return 'state';if(['event','episode','workout_event','meal_event','run_event'].includes(t))return 'episodic';if(['procedure','instruction','response_style'].includes(t))return 'procedural';return 'semantic';}
function semanticKey(entry){const memoryClass=inferClass(entry?.type,entry?.memoryClass),type=clean(entry?.type||'note')||'note',key=clean(entry?.key||'');return `${memoryClass}:${type}:${normalized(key||'__value__')}`;}
function exactKey(entry){return `${semanticKey(entry)}:${hash(normalized(valueOf(entry)))}`;}
const dedupeKey=exactKey;
function isExpired(entry,now=new Date()){if(!entry?.expiresAt)return false;const expires=Date.parse(entry.expiresAt);return Number.isFinite(expires)&&expires<=now.getTime();}
function normalizeEntry(entry,now=new Date()){
 if(!object(entry))return null;const value=valueOf(entry);if(!value)return null;
 const type=clean(entry.type||'note')||'note',memoryClass=inferClass(type,entry.memoryClass),key=clean(entry.key||'')||null;
 const createdAt=iso(entry.createdAt)||iso(entry.updatedAt)||now.toISOString(),updatedAt=iso(entry.updatedAt)||createdAt,observedAt=iso(entry.observedAt)||updatedAt,lastSeenAt=iso(entry.lastSeenAt)||updatedAt;
 const validFrom=iso(entry.validFrom)||observedAt,validTo=iso(entry.validTo),expiresAt=iso(entry.expiresAt);
 const source=clean(entry.source||'memory')||'memory',sourceTrust=Number.isFinite(Number(entry.sourceTrust))?clamp(entry.sourceTrust,0,1):(SOURCE_TRUST[source]??SOURCE_TRUST.unknown);
 const importance=Number.isFinite(Number(entry.importance))?clamp(entry.importance,1,5):2,confidence=Number.isFinite(Number(entry.confidence))?clamp(entry.confidence,0,1):.7,utility=Number.isFinite(Number(entry.utility))?clamp(entry.utility,0,1):.5;
 const evidenceCount=Math.max(1,Number.parseInt(entry.evidenceCount,10)||1),userConfirmed=entry.userConfirmed===false?false:true;
 let status=clean(entry.status||'active')||'active';if(isExpired({expiresAt},now))status='expired';
 const identity=exactKey({memoryClass,type,key,value});
 return {...entry,id:clean(entry.id)||`mem_${hash(identity)}`,memoryClass,type,key,value,source,sourceTrust,importance,confidence,utility,evidenceCount,userConfirmed,createdAt,updatedAt,observedAt,lastSeenAt,validFrom,validTo,expiresAt,status,supersededBy:clean(entry.supersededBy)||null,conflictKey:semanticKey({memoryClass,type,key,value})};
}
function mergeExact(base,next,now=new Date()){
 const a=normalizeEntry(base,now),b=normalizeEntry(next,now);if(!a)return b;if(!b)return a;
 const newer=(Date.parse(b.updatedAt)||0)>=(Date.parse(a.updatedAt)||0)?b:a;
 return {...a,...newer,id:a.id||b.id,importance:Math.max(a.importance,b.importance),confidence:Math.max(a.confidence,b.confidence),utility:Math.max(a.utility,b.utility),sourceTrust:Math.max(a.sourceTrust,b.sourceTrust),evidenceCount:(a.evidenceCount||1)+(b.evidenceCount||1),userConfirmed:a.userConfirmed===true||b.userConfirmed===true,createdAt:(Date.parse(a.createdAt)||Infinity)<=(Date.parse(b.createdAt)||Infinity)?a.createdAt:b.createdAt,lastSeenAt:now.toISOString(),status:'active',supersededBy:null};
}
const mergeEntries=mergeExact;
function conflictRank(item){return [item.userConfirmed?1:0,Date.parse(item.observedAt||item.updatedAt)||0,item.sourceTrust,item.confidence,item.evidenceCount,item.importance];}
function compareRank(a,b){const A=conflictRank(a),B=conflictRank(b);for(let i=0;i<A.length;i++)if(A[i]!==B[i])return B[i]-A[i];return String(a.id).localeCompare(String(b.id));}
function resolveConflicts(entries,{now=new Date()}={}){
 const list=rows(entries).map(item=>normalizeEntry(item,now)).filter(Boolean),groups=new Map();
 for(const item of list){const key=item.conflictKey||semanticKey(item);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(item);}
 const out=[];
 for(const group of groups.values()){
  const exact=new Map();for(const item of group){const key=exactKey(item);exact.set(key,exact.has(key)?mergeExact(exact.get(key),item,now):item);}
  const variants=[...exact.values()],viable=variants.filter(item=>!isExpired(item,now)),winner=(viable.length?viable:variants).slice().sort(compareRank)[0];
  for(const item of variants){if(item.id===winner.id)out.push({...item,status:isExpired(item,now)?'expired':'active',validTo:null,supersededBy:null});else{const cutoff=winner.observedAt||winner.updatedAt;out.push({...item,status:isExpired(item,now)?'expired':'superseded',validTo:item.validTo||cutoff,supersededBy:winner.id});}}
 }
 return out;
}
function upsertMemory(entries,candidate,{now=new Date()}={}){const incoming=normalizeEntry(candidate,now);return incoming?resolveConflicts([...rows(entries),incoming],{now}):resolveConflicts(entries,{now});}
function scoreMemory(entry,{query='',now=new Date()}={}){
 const item=normalizeEntry(entry,now);if(!item||item.status!=='active'||isExpired(item,now))return -Infinity;
 const seen=Date.parse(item.lastSeenAt||item.updatedAt||item.createdAt)||now.getTime(),ageDays=Math.max(0,(now.getTime()-seen)/DAY_MS);
 let score=item.importance*15+item.confidence*14+item.utility*10+item.sourceTrust*10+Math.min(10,Math.log2(item.evidenceCount+1)*3)+(item.userConfirmed?10:-14)+Math.max(0,16-Math.log2(ageDays+1)*4);
 const q=tokens(query);if(q.size){const hay=tokens(`${item.memoryClass} ${item.type} ${item.key||''} ${item.value}`);let overlap=0;for(const token of q)if(hay.has(token))overlap++;score+=overlap/q.size*42;if(normalized(`${item.key||''} ${item.value}`).includes(normalized(query)))score+=20;else if(overlap===0)score-=8;}
 return Number(score.toFixed(4));
}
function compactMemory(entries,{now=new Date(),deletedIds=[],maxEntries=500,includeHistory=true}={}){
 const deleted=new Set((Array.isArray(deletedIds)?deletedIds:[]).map(String));let list=resolveConflicts(entries,{now}).filter(item=>!deleted.has(String(item.id)));if(!includeHistory)list=list.filter(item=>item.status==='active'&&!isExpired(item,now));
 return list.sort((a,b)=>scoreMemory(b,{now})-scoreMemory(a,{now})||(Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||String(a.id).localeCompare(String(b.id))).slice(0,Math.max(1,Number.parseInt(maxEntries,10)||500));
}
function selectMemory(entries,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false,deletedIds=[]}={}){
 const max=Math.max(1,Math.min(50,Number.parseInt(limit,10)||24)),budget=Math.max(500,Math.min(20000,Number.parseInt(budgetChars,10)||6000));
 const ranked=compactMemory(entries,{now,deletedIds,maxEntries:500,includeHistory:false}).filter(item=>includeUnconfirmed||item.userConfirmed!==false).map(item=>({...item,_memoryScore:scoreMemory(item,{query,now})})).sort((a,b)=>b._memoryScore-a._memoryScore||String(a.id).localeCompare(String(b.id)));
 const out=[];let used=0;for(const item of ranked){const cost=clean(`${item.type} ${item.key||''} ${item.value}`).length;if(out.length&&used+cost>budget)continue;out.push(item);used+=cost;if(out.length>=max)break;}return out.map(({_memoryScore,...item})=>item);
}
function candidate(type,key,value,{memoryClass=null,importance=3,confidence=.95,utility=.6,source='structured',now=new Date(),userConfirmed=true,expiresAt=null}={}){const text=clean(value);if(!text)return null;return normalizeEntry({type,key,value:text,memoryClass,importance,confidence,utility,source,userConfirmed,createdAt:now.toISOString(),updatedAt:now.toISOString(),observedAt:now.toISOString(),lastSeenAt:now.toISOString(),expiresAt},now);}
function deriveStructuredCandidates(stateInput,{now=new Date()}={}){
 const state=object(stateInput)?stateInput:{},profile=object(state.profile)?state.profile:{},model=object(state.userModel)?state.userModel:(object(state.onboarding)?state.onboarding:{}),prefs=object(state.preferences)?state.preferences:{},out=[];
 const add=(...args)=>{const item=candidate(...args);if(item)out.push(item);};
 add('goal','primary_goal',profile.goal||model.goal,{memoryClass:'semantic',importance:5,confidence:.99,utility:1,source:'profile',now});
 add('preference','training_preferences',model.preferences,{memoryClass:'preference',importance:4,utility:.9,source:'user_model',now});
 if(Number.isFinite(Number(model.weeklyFrequency)))add('schedule','training_frequency_per_week',String(Number(model.weeklyFrequency)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now});
 if(Number.isFinite(Number(model.availableMinutes)))add('schedule','available_training_minutes',String(Number(model.availableMinutes)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now});
 add('identity','training_experience',model.experience,{memoryClass:'semantic',importance:3,utility:.7,source:'user_model',now});
 add('preference','language',prefs.language,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now});
 add('preference','unit_system',prefs.unit,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now});
 return out;
}
function extractExplicitCandidates(text,{now=new Date(),source='coach_explicit'}={}){
 const input=clean(text);if(!input)return [];const found=[];const add=(type,key,value,importance,memoryClass='semantic')=>{const item=candidate(type,key,value,{memoryClass,importance,confidence:.98,utility:.9,source,now,userConfirmed:true});if(item)found.push(item);};
 const patterns=[
  {re:/(?:내|제)\s*목표(?:는|가)\s+(.{2,100}?)(?:입니다|이에요|예요|이야|야|[.!?]|$)/gi,type:'goal',key:'explicit_goal',importance:5,memoryClass:'semantic'},
  {re:/\bmy\s+goal\s+is\s+(.{2,100}?)(?:[.!?]|$)/gi,type:'goal',key:'explicit_goal',importance:5,memoryClass:'semantic'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:을|를)?\s*선호(?:해|해요|합니다|한다)(?:[.!?]|$)/gi,type:'preference',key:'explicit_preference',importance:4,memoryClass:'preference'},
  {re:/\bi\s+prefer\s+(.{2,90}?)(?:[.!?]|$)/gi,type:'preference',key:'explicit_preference',importance:4,memoryClass:'preference'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:은|는|을|를)?\s*피하고\s*싶(?:어|어요|습니다)(?:[.!?]|$)/gi,type:'avoidance',key:'explicit_avoidance',importance:4,memoryClass:'preference',prefix:'avoid: '},
  {re:/\bi\s+(?:want\s+to\s+)?avoid\s+(.{2,90}?)(?:[.!?]|$)/gi,type:'avoidance',key:'explicit_avoidance',importance:4,memoryClass:'preference',prefix:'avoid: '}
 ];for(const rule of patterns){for(const match of input.matchAll(rule.re)){if(match?.[1])add(rule.type,rule.key,`${rule.prefix||''}${clean(match[1])}`,rule.importance,rule.memoryClass);}}
 return compactMemory(found,{now,maxEntries:20,includeHistory:false});
}
function prepareMemoryContext(memoryInput,stateInput,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false}={}){
 const memory=object(memoryInput)?memoryInput:{},deletedIds=Array.isArray(memory.deletedIds)?memory.deletedIds:[];let combined=rows(memory.entries);for(const item of deriveStructuredCandidates(stateInput,{now}))combined=upsertMemory(combined,item,{now});
 const all=compactMemory(combined,{now,deletedIds,maxEntries:500,includeHistory:true}),selected=selectMemory(all,{query,now,limit,budgetChars,includeUnconfirmed,deletedIds});
 return {facts:Array.isArray(memory.facts)?memory.facts:[],preferences:Array.isArray(memory.preferences)?memory.preferences:[],goals:Array.isArray(memory.goals)?memory.goals:[],events:Array.isArray(memory.events)?memory.events:[],entries:selected,meta:{policyVersion:POLICY_VERSION,selectedCount:selected.length,activeCount:all.filter(item=>item.status==='active').length,historyCount:all.filter(item=>item.status!=='active').length,queryAware:!!clean(query),budgetChars}};
}
function diagnostics(entries,{now=new Date()}={}){const all=compactMemory(entries,{now,maxEntries:500,includeHistory:true});return {policyVersion:POLICY_VERSION,total:all.length,active:all.filter(x=>x.status==='active').length,superseded:all.filter(x=>x.status==='superseded').length,expired:all.filter(x=>x.status==='expired').length,unconfirmed:all.filter(x=>x.userConfirmed===false).length,classes:Object.fromEntries(MEMORY_CLASSES.map(memoryClass=>[memoryClass,all.filter(x=>x.memoryClass===memoryClass).length]))};}

module.exports={POLICY_VERSION,MEMORY_CLASSES,normalizeEntry,semanticKey,exactKey,dedupeKey,isExpired,mergeExact,mergeEntries,resolveConflicts,upsertMemory,scoreMemory,compactMemory,selectMemory,deriveStructuredCandidates,extractExplicitCandidates,prepareMemoryContext,diagnostics};
