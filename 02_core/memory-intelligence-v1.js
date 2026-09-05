(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 else root.GarangMemoryIntelligence=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';

const POLICY_VERSION='memory-intelligence-v1';
const MEMORY_CLASSES=Object.freeze(['episodic','semantic','procedural','preference','state']);
const DAY_MS=86400000;
const SOURCE_TRUST=Object.freeze({user:1,agent:.92,profile:.98,user_model:.95,coach_explicit:.98,structured:.94,memory:.7,unknown:.6});
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const lower=v=>clean(v).toLocaleLowerCase('en-US');
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
const iso=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toISOString():null;};
const tokens=v=>new Set(lower(v).match(/[\p{L}\p{N}]+/gu)||[]);
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function valueOf(e){return clean(e?.value??e?.text??e?.content??'');}
function inferClass(type,explicit){if(MEMORY_CLASSES.includes(explicit))return explicit;const t=clean(type);if(['preference','avoidance'].includes(t))return 'preference';if(['state','recovery','readiness'].includes(t))return 'state';if(['event','episode','workout_event','meal_event','run_event'].includes(t))return 'episodic';if(['procedure','instruction','response_style'].includes(t))return 'procedural';return 'semantic';}
function semanticKey(entry){const c=inferClass(entry?.type,entry?.memoryClass),type=clean(entry?.type||'note')||'note',key=clean(entry?.key||'');return `${c}:${type}:${lower(key||'__value__')}`;}
function exactKey(entry){return `${semanticKey(entry)}:${hash(lower(valueOf(entry)))}`;}
function isExpired(entry,now=new Date()){const t=Date.parse(entry?.expiresAt||'');return Number.isFinite(t)&&t<=now.getTime();}
function normalizeEntry(entry,now=new Date()){
 if(!object(entry))return null;const value=valueOf(entry);if(!value)return null;
 const type=clean(entry.type||'note')||'note',memoryClass=inferClass(type,entry.memoryClass),key=clean(entry.key||'')||null;
 const createdAt=iso(entry.createdAt)||iso(entry.updatedAt)||now.toISOString();
 const updatedAt=iso(entry.updatedAt)||createdAt,observedAt=iso(entry.observedAt)||updatedAt,lastSeenAt=iso(entry.lastSeenAt)||updatedAt;
 const validFrom=iso(entry.validFrom)||observedAt,validTo=iso(entry.validTo),expiresAt=iso(entry.expiresAt);
 const source=clean(entry.source||'memory')||'memory',sourceTrust=Number.isFinite(Number(entry.sourceTrust))?clamp(entry.sourceTrust,0,1):(SOURCE_TRUST[source]??SOURCE_TRUST.unknown);
 const importance=Number.isFinite(Number(entry.importance))?clamp(entry.importance,1,5):2,confidence=Number.isFinite(Number(entry.confidence))?clamp(entry.confidence,0,1):.7,utility=Number.isFinite(Number(entry.utility))?clamp(entry.utility,0,1):.5;
 const evidenceCount=Math.max(1,Number.parseInt(entry.evidenceCount,10)||1),userConfirmed=entry.userConfirmed===false?false:true;
 let status=clean(entry.status||'active')||'active';if(isExpired({expiresAt},now))status='expired';
 const identity=exactKey({memoryClass,type,key,value});
 return {...entry,id:clean(entry.id)||`mem_${hash(identity)}`,memoryClass,type,key,value,source,sourceTrust,importance,confidence,utility,evidenceCount,userConfirmed,createdAt,updatedAt,observedAt,lastSeenAt,validFrom,validTo,expiresAt,status,supersededBy:clean(entry.supersededBy)||null,conflictKey:semanticKey({memoryClass,type,key,value})};
}
function mergeExact(aInput,bInput,now=new Date()){
 const a=normalizeEntry(aInput,now),b=normalizeEntry(bInput,now);if(!a)return b;if(!b)return a;
 const newer=(Date.parse(b.updatedAt)||0)>=(Date.parse(a.updatedAt)||0)?b:a;
 return {...a,...newer,id:a.id||b.id,importance:Math.max(a.importance,b.importance),confidence:Math.max(a.confidence,b.confidence),utility:Math.max(a.utility,b.utility),sourceTrust:Math.max(a.sourceTrust,b.sourceTrust),evidenceCount:(a.evidenceCount||1)+(b.evidenceCount||1),userConfirmed:a.userConfirmed||b.userConfirmed,createdAt:(Date.parse(a.createdAt)||Infinity)<=(Date.parse(b.createdAt)||Infinity)?a.createdAt:b.createdAt,lastSeenAt:now.toISOString(),status:'active',supersededBy:null};
}
function conflictRank(item){return [(item.userConfirmed?1:0),(Date.parse(item.observedAt||item.updatedAt)||0),item.sourceTrust,item.confidence,item.evidenceCount,item.importance];}
function compareRank(a,b){const A=conflictRank(a),B=conflictRank(b);for(let i=0;i<A.length;i++)if(A[i]!==B[i])return B[i]-A[i];return String(a.id).localeCompare(String(b.id));}
function resolveConflicts(entries,{now=new Date()}={}){
 const list=rows(entries).map(x=>normalizeEntry(x,now)).filter(Boolean),groups=new Map();
 for(const item of list){const k=item.conflictKey||semanticKey(item);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(item);}
 const out=[];
 for(const group of groups.values()){
  const exact=new Map();for(const item of group){const k=exactKey(item);exact.set(k,exact.has(k)?mergeExact(exact.get(k),item,now):item);}
  const variants=[...exact.values()];const viable=variants.filter(x=>!isExpired(x,now));
  const winner=(viable.length?viable:variants).slice().sort(compareRank)[0];
  for(const item of variants){if(item.id===winner.id){out.push({...item,status:isExpired(item,now)?'expired':'active',validTo:null,supersededBy:null});}else{const cutoff=winner.observedAt||winner.updatedAt;out.push({...item,status:isExpired(item,now)?'expired':'superseded',validTo:item.validTo||cutoff,supersededBy:winner.id});}}
 }
 return out;
}
function upsertMemory(entries,candidate,{now=new Date()}={}){const incoming=normalizeEntry(candidate,now);if(!incoming)return resolveConflicts(entries,{now});return resolveConflicts([...rows(entries),incoming],{now});}
function scoreMemory(entry,{query='',now=new Date()}={}){
 const item=normalizeEntry(entry,now);if(!item||item.status!=='active'||isExpired(item,now))return -Infinity;
 const age=Math.max(0,(now.getTime()-(Date.parse(item.lastSeenAt||item.updatedAt)||now.getTime()))/DAY_MS);
 let score=item.importance*15+item.confidence*14+item.utility*10+item.sourceTrust*10+Math.min(10,Math.log2(item.evidenceCount+1)*3)+(item.userConfirmed?10:-14)+Math.max(0,16-Math.log2(age+1)*4);
 const q=tokens(query);if(q.size){const h=tokens(`${item.memoryClass} ${item.type} ${item.key||''} ${item.value}`);let overlap=0;for(const t of q)if(h.has(t))overlap++;score+=overlap/q.size*42;if(lower(`${item.key||''} ${item.value}`).includes(lower(query)))score+=20;else if(overlap===0)score-=8;}
 return Number(score.toFixed(4));
}
function compactMemory(entries,{now=new Date(),deletedIds=[],maxEntries=500,includeHistory=true}={}){
 const deleted=new Set((Array.isArray(deletedIds)?deletedIds:[]).map(String));let list=resolveConflicts(entries,{now}).filter(x=>!deleted.has(String(x.id)));
 if(!includeHistory)list=list.filter(x=>x.status==='active'&&!isExpired(x,now));
 list.sort((a,b)=>{const sa=scoreMemory(a,{now}),sb=scoreMemory(b,{now});if(sa!==sb)return sb-sa;return (Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0);});return list.slice(0,Math.max(1,Number.parseInt(maxEntries,10)||500));
}
function selectMemory(entries,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false,deletedIds=[]}={}){
 const max=Math.max(1,Math.min(50,Number.parseInt(limit,10)||24)),budget=Math.max(500,Math.min(20000,Number.parseInt(budgetChars,10)||6000));
 const ranked=compactMemory(entries,{now,deletedIds,maxEntries:500,includeHistory:false}).filter(x=>includeUnconfirmed||x.userConfirmed!==false).map(x=>({...x,_score:scoreMemory(x,{query,now})})).sort((a,b)=>b._score-a._score||String(a.id).localeCompare(String(b.id)));
 const out=[];let used=0;for(const item of ranked){const cost=clean(`${item.type} ${item.key||''} ${item.value}`).length;if(out.length&&used+cost>budget)continue;out.push(item);used+=cost;if(out.length>=max)break;}return out.map(({_score,...x})=>x);
}
function candidate(type,key,value,{memoryClass=null,importance=3,confidence=.95,utility=.6,source='structured',now=new Date(),userConfirmed=true,expiresAt=null}={}){const text=clean(value);if(!text)return null;return normalizeEntry({type,key,value:text,memoryClass,importance,confidence,utility,source,userConfirmed,createdAt:now.toISOString(),updatedAt:now.toISOString(),observedAt:now.toISOString(),lastSeenAt:now.toISOString(),expiresAt},now);}
function deriveStructuredCandidates(stateInput,{now=new Date()}={}){
 const s=object(stateInput)?stateInput:{},profile=object(s.profile)?s.profile:{},model=object(s.userModel)?s.userModel:(object(s.onboarding)?s.onboarding:{}),prefs=object(s.preferences)?s.preferences:{},out=[];const add=(...args)=>{const x=candidate(...args);if(x)out.push(x);};
 add('goal','primary_goal',profile.goal||model.goal,{memoryClass:'semantic',importance:5,confidence:.99,utility:1,source:'profile',now});
 add('preference','training_preferences',model.preferences,{memoryClass:'preference',importance:4,utility:.9,source:'user_model',now});
 if(Number.isFinite(Number(model.weeklyFrequency)))add('schedule','training_frequency_per_week',String(Number(model.weeklyFrequency)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now});
 if(Number.isFinite(Number(model.availableMinutes)))add('schedule','available_training_minutes',String(Number(model.availableMinutes)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now});
 add('identity','training_experience',model.experience,{memoryClass:'semantic',importance:3,utility:.7,source:'user_model',now});
 add('preference','language',prefs.language,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now});add('preference','unit_system',prefs.unit,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now});return out;
}
function extractExplicitCandidates(text,{now=new Date(),source='coach_explicit'}={}){
 const input=clean(text);if(!input)return [];const found=[];const add=(type,key,value,importance,memoryClass='semantic')=>{const x=candidate(type,key,value,{memoryClass,importance,confidence:.98,utility:.9,source,now,userConfirmed:true});if(x)found.push(x);};
 const rules=[
  {re:/(?:내|제)\s*목표(?:는|가)\s+(.{2,100}?)(?:입니다|이에요|예요|이야|야|[.!?]|$)/i,type:'goal',key:'explicit_goal',imp:5,cls:'semantic'},
  {re:/\bmy\s+goal\s+is\s+(.{2,100}?)(?:[.!?]|$)/i,type:'goal',key:'explicit_goal',imp:5,cls:'semantic'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:을|를)?\s*선호(?:해|해요|합니다|한다)(?:[.!?]|$)/i,type:'preference',key:'explicit_preference',imp:4,cls:'preference'},
  {re:/\bi\s+prefer\s+(.{2,90}?)(?:[.!?]|$)/i,type:'preference',key:'explicit_preference',imp:4,cls:'preference'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:은|는|을|를)?\s*피하고\s*싶(?:어|어요|습니다)(?:[.!?]|$)/i,type:'avoidance',key:'explicit_avoidance',imp:4,cls:'preference',prefix:'avoid: '},
  {re:/\bi\s+(?:want\s+to\s+)?avoid\s+(.{2,90}?)(?:[.!?]|$)/i,type:'avoidance',key:'explicit_avoidance',imp:4,cls:'preference',prefix:'avoid: '}
 ];for(const r of rules){for(const m of input.matchAll(new RegExp(r.re.source,r.re.flags.includes('g')?r.re.flags:r.re.flags+'g'))){if(m?.[1])add(r.type,r.key,`${r.prefix||''}${clean(m[1])}`,r.imp,r.cls);}}
 return compactMemory(found,{now,maxEntries:20,includeHistory:false});
}
function prepareMemoryContext(memoryInput,stateInput,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false}={}){
 const memory=object(memoryInput)?memoryInput:{},deletedIds=Array.isArray(memory.deletedIds)?memory.deletedIds:[];let combined=rows(memory.entries);
 for(const x of deriveStructuredCandidates(stateInput,{now}))combined=upsertMemory(combined,x,{now});const all=compactMemory(combined,{now,deletedIds,maxEntries:500,includeHistory:true}),selected=selectMemory(all,{query,now,limit,budgetChars,includeUnconfirmed,deletedIds});
 return {facts:Array.isArray(memory.facts)?memory.facts:[],preferences:Array.isArray(memory.preferences)?memory.preferences:[],goals:Array.isArray(memory.goals)?memory.goals:[],events:Array.isArray(memory.events)?memory.events:[],entries:selected,meta:{policyVersion:POLICY_VERSION,selectedCount:selected.length,activeCount:all.filter(x=>x.status==='active').length,historyCount:all.filter(x=>x.status!=='active').length,queryAware:!!clean(query),budgetChars}};
}
function diagnostics(entries,{now=new Date()}={}){const all=compactMemory(entries,{now,maxEntries:500,includeHistory:true});return {policyVersion:POLICY_VERSION,total:all.length,active:all.filter(x=>x.status==='active').length,superseded:all.filter(x=>x.status==='superseded').length,expired:all.filter(x=>x.status==='expired').length,unconfirmed:all.filter(x=>x.userConfirmed===false).length,classes:Object.fromEntries(MEMORY_CLASSES.map(c=>[c,all.filter(x=>x.memoryClass===c).length]))};}
return Object.freeze({POLICY_VERSION,MEMORY_CLASSES,normalizeEntry,semanticKey,exactKey,isExpired,mergeExact,resolveConflicts,upsertMemory,scoreMemory,compactMemory,selectMemory,deriveStructuredCandidates,extractExplicitCandidates,prepareMemoryContext,diagnostics});
});
