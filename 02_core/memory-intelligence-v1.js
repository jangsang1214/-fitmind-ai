(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GarangMemoryIntelligence=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){

'use strict';
const POLICY_VERSION='memory-intelligence-v1';
const CONTRACT_VERSION='garang-memory-v1';
const MEMORY_SCHEMA_VERSION=1;
const MEMORY_CLASSES=Object.freeze(['episodic','semantic','procedural','preference','state']);
const ENTRY_STATUSES=Object.freeze(['active','superseded','expired']);
const DAY_MS=86400000;
const SOURCE_TRUST=Object.freeze({user:1,agent:.92,profile:.98,user_model:.95,coach_explicit:.98,structured:.94,memory:.7,legacy:.68,unknown:.6});
const CLASS_POLICY=Object.freeze({
 episodic:Object.freeze({base:2,halfLifeDays:45}),
 semantic:Object.freeze({base:7,halfLifeDays:365}),
 procedural:Object.freeze({base:6,halfLifeDays:365}),
 preference:Object.freeze({base:8,halfLifeDays:180}),
 state:Object.freeze({base:4,halfLifeDays:3})
});
const CONTEXT_FIELDS=Object.freeze(['id','memoryClass','type','key','value','source','importance','confidence','utility','evidenceCount','userConfirmed','revision','observedAt','updatedAt','expiresAt','status']);
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
const lower=v=>clean(v).toLocaleLowerCase('en-US');
const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)));
const iso=v=>{const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toISOString():null;};
const tokens=v=>new Set(lower(v).match(/[\p{L}\p{N}]+/gu)||[]);
const error=code=>{const e=new Error(code);e.code=code;return e;};
function hash(value){let h=2166136261;for(const ch of String(value)){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return (h>>>0).toString(16).padStart(8,'0');}
function valueOf(e){return clean(e?.value??e?.text??e?.content??'');}
function inferClass(type,explicit){if(MEMORY_CLASSES.includes(explicit))return explicit;const t=clean(type);if(['preference','avoidance'].includes(t))return 'preference';if(['state','recovery','readiness'].includes(t))return 'state';if(['event','episode','workout_event','meal_event','run_event'].includes(t))return 'episodic';if(['procedure','instruction','response_style'].includes(t))return 'procedural';return 'semantic';}
function normalizeDeletedIds(input){return [...new Set((Array.isArray(input)?input:[]).map(x=>clean(x)).filter(Boolean))].sort();}
function assertCompatibleContract(input){
 if(!object(input))return;
 if(input.contractVersion&&String(input.contractVersion)!==CONTRACT_VERSION)throw error('FOREIGN_MEMORY_CONTRACT');
 const schema=Number(input.schemaVersion);
 if(Number.isFinite(schema)&&schema>MEMORY_SCHEMA_VERSION)throw error('FUTURE_MEMORY_SCHEMA');
}
function semanticKey(entry){const c=inferClass(entry?.type,entry?.memoryClass),type=clean(entry?.type||'note')||'note',key=clean(entry?.key||''),value=valueOf(entry);return key?`${c}:${type}:${lower(key)}`:`${c}:${type}:value:${hash(lower(value))}`;}
function exactKey(entry){return `${semanticKey(entry)}:${hash(lower(valueOf(entry)))}`;}
const dedupeKey=exactKey;
function isExpired(entry,now=new Date()){const t=Date.parse(entry?.expiresAt||'');return Number.isFinite(t)&&t<=now.getTime();}
function normalizeEntry(entry,now=new Date()){
 if(!object(entry))return null;
 assertCompatibleContract(entry);
 const value=valueOf(entry);if(!value)return null;
 const type=clean(entry.type||'note')||'note',memoryClass=inferClass(type,entry.memoryClass),key=clean(entry.key||'')||null;
 const createdAt=iso(entry.createdAt)||iso(entry.updatedAt)||iso(entry.observedAt)||now.toISOString();
 const updatedAt=iso(entry.updatedAt)||createdAt,observedAt=iso(entry.observedAt)||updatedAt,lastSeenAt=iso(entry.lastSeenAt)||updatedAt,validFrom=iso(entry.validFrom)||observedAt,validTo=iso(entry.validTo),expiresAt=iso(entry.expiresAt);
 const source=clean(entry.source||'memory')||'memory',sourceTrust=Number.isFinite(Number(entry.sourceTrust))?clamp(entry.sourceTrust,0,1):(SOURCE_TRUST[source]??SOURCE_TRUST.unknown);
 const importance=Number.isFinite(Number(entry.importance))?clamp(entry.importance,1,5):2,confidence=Number.isFinite(Number(entry.confidence))?clamp(entry.confidence,0,1):.7,utility=Number.isFinite(Number(entry.utility))?clamp(entry.utility,0,1):.5;
 const evidenceCount=Math.max(1,Number.parseInt(entry.evidenceCount,10)||1),userConfirmed=entry.userConfirmed===false?false:true,revision=Math.max(1,Number.parseInt(entry.revision,10)||1),ownerUid=clean(entry.ownerUid)||null;
 let status=clean(entry.status||'active')||'active';if(!ENTRY_STATUSES.includes(status))status='active';if(isExpired({expiresAt},now))status='expired';
 const identity=exactKey({memoryClass,type,key,value});
 return {...entry,contractVersion:CONTRACT_VERSION,schemaVersion:MEMORY_SCHEMA_VERSION,id:clean(entry.id)||`mem_${hash(identity)}`,ownerUid,memoryClass,type,key,value,source,sourceTrust,importance,confidence,utility,evidenceCount,userConfirmed,revision,createdAt,updatedAt,observedAt,lastSeenAt,validFrom,validTo,expiresAt,status,supersededBy:clean(entry.supersededBy)||null,conflictKey:semanticKey({memoryClass,type,key,value})};
}
function laterIso(...values){let best=null,bestMs=-Infinity;for(const v of values){const s=iso(v),ms=Date.parse(s||'');if(Number.isFinite(ms)&&ms>bestMs){best=s;bestMs=ms;}}return best;}
function earlierIso(...values){let best=null,bestMs=Infinity;for(const v of values){const s=iso(v),ms=Date.parse(s||'');if(Number.isFinite(ms)&&ms<bestMs){best=s;bestMs=ms;}}return best;}
function mergeExact(aInput,bInput,now=new Date()){
 const a=normalizeEntry(aInput,now),b=normalizeEntry(bInput,now);if(!a)return b;if(!b)return a;
 const bNewer=(Date.parse(b.updatedAt)||0)>(Date.parse(a.updatedAt)||0)||((Date.parse(b.updatedAt)||0)===(Date.parse(a.updatedAt)||0)&&String(b.id).localeCompare(String(a.id))<0);
 const newer=bNewer?b:a,older=bNewer?a:b,sameId=String(a.id)===String(b.id);
 return {...older,...newer,id:clean(older.id)||clean(newer.id),ownerUid:newer.ownerUid||older.ownerUid||null,importance:Math.max(a.importance,b.importance),confidence:Math.max(a.confidence,b.confidence),utility:Math.max(a.utility,b.utility),sourceTrust:Math.max(a.sourceTrust,b.sourceTrust),evidenceCount:sameId?Math.max(a.evidenceCount,b.evidenceCount):(a.evidenceCount||1)+(b.evidenceCount||1),userConfirmed:a.userConfirmed||b.userConfirmed,revision:Math.max(a.revision,b.revision),createdAt:earlierIso(a.createdAt,b.createdAt)||newer.createdAt,lastSeenAt:laterIso(a.lastSeenAt,b.lastSeenAt,a.updatedAt,b.updatedAt)||newer.updatedAt,status:'active',supersededBy:null};
}
const mergeEntries=mergeExact;
function conflictRank(item){return [item.userConfirmed?1:0,Date.parse(item.observedAt||item.updatedAt)||0,item.sourceTrust,item.confidence,item.evidenceCount,item.importance,item.revision];}
function compareRank(a,b){const A=conflictRank(a),B=conflictRank(b);for(let i=0;i<A.length;i++)if(A[i]!==B[i])return B[i]-A[i];const ax=exactKey(a),bx=exactKey(b);if(ax!==bx)return ax.localeCompare(bx);return String(a.id).localeCompare(String(b.id));}
function ownerAllowed(item,ownerUid){return !ownerUid||!item.ownerUid||String(item.ownerUid)===String(ownerUid);}
function resolveConflicts(entries,{now=new Date(),deletedIds=[],ownerUid=null}={}){
 const deleted=new Set(normalizeDeletedIds(deletedIds)),list=rows(entries).map(x=>normalizeEntry(x,now)).filter(x=>x&&!deleted.has(String(x.id))&&ownerAllowed(x,ownerUid)),groups=new Map();
 for(const item of list){const k=semanticKey(item);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(item);}
 const out=[];
 for(const group of groups.values()){
  const exact=new Map();
  for(const item of group){const k=exactKey(item);exact.set(k,exact.has(k)?mergeExact(exact.get(k),item,now):item);}
  const variants=[...exact.values()],viable=variants.filter(x=>!isExpired(x,now)),winner=(viable.length?viable:variants).slice().sort(compareRank)[0],winnerKey=winner?exactKey(winner):null;
  for(const item of variants){
   if(exactKey(item)===winnerKey)out.push({...item,status:isExpired(item,now)?'expired':'active',validTo:null,supersededBy:null});
   else{const cutoff=winner?.observedAt||winner?.updatedAt||item.updatedAt;out.push({...item,status:isExpired(item,now)?'expired':'superseded',validTo:item.validTo||cutoff,supersededBy:winner?.id||null});}
  }
 }
 return out.sort((a,b)=>semanticKey(a).localeCompare(semanticKey(b))||compareRank(a,b));
}
function upsertMemory(entries,candidate,{now=new Date(),deletedIds=[],ownerUid=null}={}){
 const incoming=normalizeEntry(candidate,now);if(!incoming)return resolveConflicts(entries,{now,deletedIds,ownerUid});
 const deleted=new Set(normalizeDeletedIds(deletedIds));if(deleted.has(String(incoming.id)))throw error('MEMORY_TOMBSTONED_ID');
 if(ownerUid&&incoming.ownerUid&&String(incoming.ownerUid)!==String(ownerUid))throw error('MEMORY_OWNER_MISMATCH');
 const scoped=ownerUid&&!incoming.ownerUid?{...incoming,ownerUid:String(ownerUid)}:incoming;
 return resolveConflicts([...rows(entries),scoped],{now,deletedIds,ownerUid});
}
function lexicalRelevance(item,query){
 const q=tokens(query);if(!q.size)return 0;
 const hay=tokens(`${item.memoryClass} ${item.type} ${item.key||''} ${item.value}`);let overlap=0;for(const t of q)if(hay.has(t))overlap++;
 const ratio=overlap/q.size,phrase=lower(`${item.key||''} ${item.value}`).includes(lower(query))?1:0;
 return ratio*48+phrase*22+(overlap===0?-10:0);
}
function scoreMemory(entry,{query='',now=new Date()}={}){
 const item=normalizeEntry(entry,now);if(!item||item.status!=='active'||isExpired(item,now))return -Infinity;
 const age=Math.max(0,(now.getTime()-(Date.parse(item.lastSeenAt||item.updatedAt)||now.getTime()))/DAY_MS),policy=CLASS_POLICY[item.memoryClass]||CLASS_POLICY.semantic,freshness=18/(1+age/Math.max(1,policy.halfLifeDays));
 let score=policy.base+item.importance*15+item.confidence*14+item.utility*10+item.sourceTrust*10+Math.min(10,Math.log2(item.evidenceCount+1)*3)+(item.userConfirmed?12:-18)+freshness+lexicalRelevance(item,query);
 return Number(score.toFixed(4));
}
function compactMemory(entries,{now=new Date(),deletedIds=[],maxEntries=500,includeHistory=true,ownerUid=null}={}){
 let list=resolveConflicts(entries,{now,deletedIds,ownerUid});if(!includeHistory)list=list.filter(x=>x.status==='active'&&!isExpired(x,now));
 list.sort((a,b)=>{const sa=scoreMemory(a,{now}),sb=scoreMemory(b,{now});if(sa!==sb)return sb-sa;return (Date.parse(b.updatedAt)||0)-(Date.parse(a.updatedAt)||0)||String(a.id).localeCompare(String(b.id));});
 return list.slice(0,Math.max(1,Number.parseInt(maxEntries,10)||500));
}
function contextEntry(entry){
 const item={};for(const key of CONTEXT_FIELDS)if(entry[key]!==undefined)item[key]=entry[key];return item;
}
function contextCost(entry){return JSON.stringify(contextEntry(entry)).length;}
function selectMemory(entries,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false,deletedIds=[],ownerUid=null}={}){
 const max=Math.max(1,Math.min(50,Number.parseInt(limit,10)||24)),budget=Math.max(256,Math.min(20000,Number.parseInt(budgetChars,10)||6000));
 const ranked=compactMemory(entries,{now,deletedIds,maxEntries:500,includeHistory:false,ownerUid}).filter(x=>includeUnconfirmed||x.userConfirmed!==false).map(x=>({...x,_score:scoreMemory(x,{query,now})})).sort((a,b)=>b._score-a._score||String(a.id).localeCompare(String(b.id)));
 const out=[];let used=0;
 for(const item of ranked){const cost=contextCost(item);if(used+cost>budget)continue;out.push(item);used+=cost;if(out.length>=max)break;}
 return out.map(({_score,...x})=>x);
}
function candidate(type,key,value,{memoryClass=null,importance=3,confidence=.95,utility=.6,source='structured',now=new Date(),observedAt=null,userConfirmed=true,expiresAt=null,ownerUid=null,revision=1}={}){
 const text=clean(value);if(!text)return null;const seen=iso(observedAt)||now.toISOString();
 return normalizeEntry({type,key,value:text,memoryClass,importance,confidence,utility,source,userConfirmed,createdAt:seen,updatedAt:seen,observedAt:seen,lastSeenAt:seen,expiresAt,ownerUid,revision},now);
}
function deriveStructuredCandidates(stateInput,{now=new Date(),ownerUid=null}={}){
 const s=object(stateInput)?stateInput:{},profile=object(s.profile)?s.profile:{},model=object(s.userModel)?s.userModel:(object(s.onboarding)?s.onboarding:{}),prefs=object(s.preferences)?s.preferences:{},observedAt=iso(profile.updatedAt)||iso(model.updatedAt)||iso(s.meta?.updatedAt)||now.toISOString(),owner=ownerUid||clean(s.meta?.syncOwnerUid)||null,out=[];
 const add=(...args)=>{const x=candidate(...args);if(x)out.push(x);};
 add('goal','primary_goal',profile.goal||model.goal,{memoryClass:'semantic',importance:5,confidence:.99,utility:1,source:'profile',now,observedAt,ownerUid:owner});
 add('preference','training_preferences',model.preferences,{memoryClass:'preference',importance:4,utility:.9,source:'user_model',now,observedAt,ownerUid:owner});
 if(Number.isFinite(Number(model.weeklyFrequency)))add('schedule','training_frequency_per_week',String(Number(model.weeklyFrequency)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now,observedAt,ownerUid:owner});
 if(Number.isFinite(Number(model.availableMinutes)))add('schedule','available_training_minutes',String(Number(model.availableMinutes)),{memoryClass:'semantic',importance:4,utility:.9,source:'user_model',now,observedAt,ownerUid:owner});
 add('identity','training_experience',model.experience,{memoryClass:'semantic',importance:3,utility:.7,source:'user_model',now,observedAt,ownerUid:owner});
 add('preference','language',prefs.language,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now,observedAt,ownerUid:owner});
 add('preference','unit_system',prefs.unit,{memoryClass:'procedural',importance:4,utility:1,source:'profile',now,observedAt,ownerUid:owner});
 return out;
}
function extractExplicitCandidates(text,{now=new Date(),source='coach_explicit',ownerUid=null}={}){
 const input=clean(text);if(!input)return [];const found=[];
 const add=(type,key,value,importance,memoryClass='semantic')=>{const x=candidate(type,key,value,{memoryClass,importance,confidence:.98,utility:.9,source,now,userConfirmed:true,ownerUid});if(x)found.push(x);};
 const rules=[
  {re:/(?:내|제)\s*목표(?:는|가)\s+(.{2,100}?)(?:입니다|이에요|예요|이야|야|[.!?]|$)/gi,type:'goal',key:'primary_goal',importance:5,memoryClass:'semantic'},
  {re:/\bmy\s+goal\s+is\s+(.{2,100}?)(?:[.!?]|$)/gi,type:'goal',key:'primary_goal',importance:5,memoryClass:'semantic'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:을|를)?\s*선호(?:해|해요|합니다|한다)(?:[.!?]|$)/gi,type:'preference',key:'training_preferences',importance:4,memoryClass:'preference'},
  {re:/\bi\s+prefer\s+(.{2,90}?)(?:[.!?]|$)/gi,type:'preference',key:'training_preferences',importance:4,memoryClass:'preference'},
  {re:/(?:나는|저는|제가)?\s*(.{2,90}?)\s*(?:은|는|을|를)?\s*피하고\s*싶(?:어|어요|습니다)(?:[.!?]|$)/gi,type:'avoidance',key:'explicit_avoidance',importance:4,memoryClass:'preference',prefix:'avoid: '},
  {re:/\bi\s+(?:want\s+to\s+)?avoid\s+(.{2,90}?)(?:[.!?]|$)/gi,type:'avoidance',key:'explicit_avoidance',importance:4,memoryClass:'preference',prefix:'avoid: '}
 ];
 for(const r of rules)for(const m of input.matchAll(r.re))if(m?.[1])add(r.type,r.key,`${r.prefix||''}${clean(m[1])}`,r.importance,r.memoryClass);
 return compactMemory(found,{now,maxEntries:20,includeHistory:false,ownerUid});
}
function stableMemoryRows(entries,{now=new Date(),deletedIds=[],ownerUid=null,maxEntries=500}={}){
 return resolveConflicts(entries,{now,deletedIds,ownerUid}).sort((a,b)=>semanticKey(a).localeCompare(semanticKey(b))||(Date.parse(a.observedAt)||0)-(Date.parse(b.observedAt)||0)||String(a.id).localeCompare(String(b.id))).slice(-Math.max(1,Number.parseInt(maxEntries,10)||500));
}
function migrateMemory(memoryInput,{now=new Date(),ownerUid=null,maxEntries=500}={}){
 const memory=object(memoryInput)?memoryInput:{};assertCompatibleContract(memory);
 const deletedIds=normalizeDeletedIds(memory.deletedIds),entries=stableMemoryRows(memory.entries,{now,deletedIds,ownerUid,maxEntries});
 return {contractVersion:CONTRACT_VERSION,schemaVersion:MEMORY_SCHEMA_VERSION,policyVersion:POLICY_VERSION,facts:Array.isArray(memory.facts)?memory.facts:[],preferences:Array.isArray(memory.preferences)?memory.preferences:[],goals:Array.isArray(memory.goals)?memory.goals:[],events:Array.isArray(memory.events)?memory.events:[],entries,deletedIds,legacyMigrated:memory.legacyMigrated!==false};
}
function mergeMemoryContainers(localInput,remoteInput,{now=new Date(),ownerUid=null,maxEntries=500}={}){
 const local=migrateMemory(localInput,{now,ownerUid,maxEntries}),remote=migrateMemory(remoteInput,{now,ownerUid,maxEntries}),deletedIds=normalizeDeletedIds([...local.deletedIds,...remote.deletedIds]);
 const uniq=(a,b)=>[...new Map([...(a||[]),...(b||[])].map(x=>[typeof x==='string'?`s:${x}`:`o:${JSON.stringify(x)}`,x])).values()];
 return {contractVersion:CONTRACT_VERSION,schemaVersion:MEMORY_SCHEMA_VERSION,policyVersion:POLICY_VERSION,facts:uniq(local.facts,remote.facts),preferences:uniq(local.preferences,remote.preferences),goals:uniq(local.goals,remote.goals),events:uniq(local.events,remote.events),entries:stableMemoryRows([...local.entries,...remote.entries],{now,deletedIds,ownerUid,maxEntries}),deletedIds,legacyMigrated:true};
}
function prepareMemoryContext(memoryInput,stateInput,{query='',now=new Date(),limit=24,budgetChars=6000,includeUnconfirmed=false,ownerUid=null}={}){
 const state=object(stateInput)?stateInput:{},owner=ownerUid||clean(state.meta?.syncOwnerUid)||null,memory=migrateMemory(memoryInput,{now,ownerUid:owner}),deletedIds=memory.deletedIds;
 let combined=memory.entries;for(const x of deriveStructuredCandidates(state,{now,ownerUid:owner}))combined=upsertMemory(combined,x,{now,deletedIds,ownerUid:owner});
 const all=compactMemory(combined,{now,deletedIds,maxEntries:500,includeHistory:true,ownerUid:owner}),selected=selectMemory(all,{query,now,limit,budgetChars,includeUnconfirmed,deletedIds,ownerUid:owner}),contextEntries=selected.map(contextEntry),usedChars=contextEntries.reduce((sum,item)=>sum+JSON.stringify(item).length,0);
 return {facts:[],preferences:[],goals:[],events:[],entries:contextEntries,meta:{contractVersion:CONTRACT_VERSION,schemaVersion:MEMORY_SCHEMA_VERSION,policyVersion:POLICY_VERSION,selectedCount:contextEntries.length,activeCount:all.filter(x=>x.status==='active').length,historyCount:all.filter(x=>x.status!=='active').length,queryAware:!!clean(query),budgetChars:Math.max(256,Math.min(20000,Number.parseInt(budgetChars,10)||6000)),usedChars,legacyBucketCounts:{facts:memory.facts.length,preferences:memory.preferences.length,goals:memory.goals.length,events:memory.events.length}}};
}
function validateEntry(entry,{now=new Date()}={}){
 const errors=[];let item=null;try{item=normalizeEntry(entry,now);}catch(e){return [e.code||e.message];}
 if(!item)return ['INVALID_MEMORY_ENTRY'];
 if(!MEMORY_CLASSES.includes(item.memoryClass))errors.push('memoryClass');if(!ENTRY_STATUSES.includes(item.status))errors.push('status');if(!item.id)errors.push('id');if(!item.value)errors.push('value');if(item.importance<1||item.importance>5)errors.push('importance');if(item.confidence<0||item.confidence>1)errors.push('confidence');if(item.utility<0||item.utility>1)errors.push('utility');if(item.revision<1)errors.push('revision');
 return errors;
}
function validateMemory(memoryInput,{now=new Date(),ownerUid=null}={}){
 try{const memory=migrateMemory(memoryInput,{now,ownerUid});const errors=[];for(const item of memory.entries)for(const issue of validateEntry(item,{now}))errors.push(`${item.id}:${issue}`);return errors;}catch(e){return [e.code||e.message];}
}
function diagnostics(entries,{now=new Date(),deletedIds=[],ownerUid=null}={}){
 const all=compactMemory(entries,{now,deletedIds,maxEntries:500,includeHistory:true,ownerUid});
 return {contractVersion:CONTRACT_VERSION,schemaVersion:MEMORY_SCHEMA_VERSION,policyVersion:POLICY_VERSION,total:all.length,active:all.filter(x=>x.status==='active').length,superseded:all.filter(x=>x.status==='superseded').length,expired:all.filter(x=>x.status==='expired').length,unconfirmed:all.filter(x=>x.userConfirmed===false).length,classes:Object.fromEntries(MEMORY_CLASSES.map(c=>[c,all.filter(x=>x.memoryClass===c).length]))};
}

return Object.freeze({POLICY_VERSION,CONTRACT_VERSION,MEMORY_SCHEMA_VERSION,MEMORY_CLASSES,ENTRY_STATUSES,SOURCE_TRUST,CLASS_POLICY,CONTEXT_FIELDS,normalizeDeletedIds,normalizeEntry,semanticKey,exactKey,dedupeKey,isExpired,mergeExact,mergeEntries,resolveConflicts,upsertMemory,scoreMemory,compactMemory,selectMemory,contextEntry,contextCost,candidate,deriveStructuredCandidates,extractExplicitCandidates,migrateMemory,mergeMemoryContainers,prepareMemoryContext,validateEntry,validateMemory,diagnostics});
});
