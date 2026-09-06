(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.GarangLegacyMigration=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const DOMAINS=['workouts','meals','runs','body','planner','checkins','aiChat'];
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const rows=v=>Array.isArray(v)?v.filter(object):[];
const clone=v=>JSON.parse(JSON.stringify(v));
function fnv1a(value){let hash=0x811c9dc5;const text=String(value??'');for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,0x01000193)>>>0;}return hash.toString(16).padStart(8,'0');}
function stable(value){if(Array.isArray(value))return `[${value.map(stable).join(',')}]`;if(object(value))return `{${Object.keys(value).sort().map(k=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;return JSON.stringify(value);}
function rowId(domain,row){if(row.id)return String(row.id);const basis={domain,date:row.date||'',name:row.name||'',title:row.title||'',sessionId:row.sessionId||'',distance:row.distance||0,weight:row.weight||0,createdAt:row.createdAt||''};return `legacy_${domain}_${fnv1a(stable(basis))}`;}
function normalizeDomain(domain,input){return rows(input).map(row=>{const x=clone(row);x.id=rowId(domain,x);if(domain==='meals')x.items=rows(x.items).map(item=>({...clone(item),id:item.id||`legacy_food_${fnv1a(stable(item))}`}));return x;});}
function mergeRows(domain,current,legacy){const map=new Map();for(const row of [...normalizeDomain(domain,current),...normalizeDomain(domain,legacy)]){const previous=map.get(row.id);if(!previous){map.set(row.id,row);continue;}const a=Date.parse(previous.updatedAt||previous.createdAt||0)||0,b=Date.parse(row.updatedAt||row.createdAt||0)||0;if(b>a)map.set(row.id,row);}return [...map.values()];}
function mergeState(currentInput,legacyInput){const current=object(currentInput)?clone(currentInput):{},legacy=object(legacyInput)?clone(legacyInput):{},out={...legacy,...current};
  out.meta={...(object(legacy.meta)?legacy.meta:{}),...(object(current.meta)?current.meta:{})};
  for(const domain of DOMAINS)out[domain]=mergeRows(domain,current[domain],legacy[domain]);
  out.profile=current.profile??legacy.profile??null;
  out.onboarding={...(object(legacy.onboarding)?legacy.onboarding:{}),...(object(current.onboarding)?current.onboarding:{})};
  out.preferences={...(object(legacy.preferences)?legacy.preferences:{}),...(object(current.preferences)?current.preferences:{})};
  const cm=object(current.memory)?current.memory:{},lm=object(legacy.memory)?legacy.memory:{};out.memory={...lm,...cm};
  for(const bucket of ['facts','preferences','goals','events'])out.memory[bucket]=[...new Map([...(Array.isArray(lm[bucket])?lm[bucket]:[]),...(Array.isArray(cm[bucket])?cm[bucket]:[])].map(v=>[stable(v),v])).values()];
  out.memory.entries=mergeRows('memory',cm.entries,lm.entries);
  out.memory.deletedIds=[...new Set([...(Array.isArray(lm.deletedIds)?lm.deletedIds:[]),...(Array.isArray(cm.deletedIds)?cm.deletedIds:[])].map(String))];
  out.actionLog=mergeRows('actionLog',current.actionLog,legacy.actionLog);
  out.errors=mergeRows('errors',current.errors,legacy.errors);
  out.analytics={...(object(legacy.analytics)?legacy.analytics:{}),...(object(current.analytics)?current.analytics:{})};
  out.analytics.events=mergeRows('analytics',current.analytics?.events,legacy.analytics?.events);
  return out;
}
return Object.freeze({VERSION:'garang-legacy-migration-v2',DOMAINS,rowId,normalizeDomain,mergeRows,mergeState});
});
