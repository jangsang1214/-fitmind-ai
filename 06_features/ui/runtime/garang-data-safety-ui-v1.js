/* GARANG data safety UI v1
   Owns verified export + safe legacy import without capture-phase interception.
*/
(() => {
'use strict';
if(window.__garangDataSafetyUi)return;window.__garangDataSafetyUi=true;
const Integrity=window.GarangBackupIntegrity,Sanitizer=window.GarangStateSanitizer,RecordCore=window.GarangRecordPersistenceCore;
const LEGACY_KEY='garang_v99_state_v2';
const $=s=>document.querySelector(s);
function toast(message){const el=$('#toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__garangDataSafetyTimer);el.__garangDataSafetyTimer=setTimeout(()=>el.classList.remove('show'),2500);}
function currentUid(){try{return window.firebase?.auth?.().currentUser?.uid||null;}catch{return null;}}
function currentKey(){const uid=currentUid();return uid?`garang_user_${uid}_v3`:'garang_demo_state_v3';}
function parse(raw){try{return raw?JSON.parse(raw):null;}catch{return null;}}
function rows(v){return Array.isArray(v)?v.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];}
function mergeById(current,legacy,domain,uid){const map=new Map();const feed=(list,legacySource=false)=>{for(const raw of rows(list)){const withId={...raw,id:String(raw.id||window.GarangSchema?.id?.()||`${domain}_${Date.now()}_${Math.random().toString(36).slice(2)}`)};const record=RecordCore?.normalizeRecord?RecordCore.normalizeRecord(domain,withId,{ownerUid:uid}):withId;if(!record)continue;const old=map.get(record.id);if(!old)map.set(record.id,record);else{const a=RecordCore?.recordStamp?.(old)||Date.parse(old.updatedAt||old.createdAt||0)||0,b=RecordCore?.recordStamp?.(record)||Date.parse(record.updatedAt||record.createdAt||0)||0;if(!legacySource&&b>=a)map.set(record.id,record);}}};feed(legacy,true);feed(current,false);return [...map.values()];}
function mergeLegacy(currentInput,legacyInput,uid){
  const current=Sanitizer?.sanitizeState?Sanitizer.sanitizeState(currentInput||{},{ownerUid:uid}):(currentInput||{}),legacy=Sanitizer?.sanitizeState?Sanitizer.sanitizeState(legacyInput||{},{ownerUid:uid}):(legacyInput||{}),out={...legacy,...current};
  out.meta={...(legacy.meta||{}),...(current.meta||{})};
  for(const domain of ['workouts','meals','runs','body','planner','checkins'])out[domain]=mergeById(current[domain],legacy[domain],domain,uid);
  const generic=['aiChat','actionLog','errors'];for(const domain of generic){const map=new Map();for(const item of [...rows(legacy[domain]),...rows(current[domain])])map.set(String(item.id||JSON.stringify(item)),item);out[domain]=[...map.values()];}
  out.profile=current.profile||legacy.profile||null;out.onboarding={...(legacy.onboarding||{}),...(current.onboarding||{})};out.preferences={...(legacy.preferences||{}),...(current.preferences||{})};
  out.memory={...(legacy.memory||{}),...(current.memory||{})};for(const bucket of ['facts','preferences','goals','events'])out.memory[bucket]=[...new Map([...(legacy.memory?.[bucket]||[]),...(current.memory?.[bucket]||[])].filter(x=>x!=null).map(x=>[typeof x==='string'?x:JSON.stringify(x),x])).values()];
  const entries=new Map();for(const item of [...rows(legacy.memory?.entries),...rows(current.memory?.entries)])entries.set(String(item.id||JSON.stringify(item)),item);out.memory.entries=[...entries.values()];
  out.analytics={...(legacy.analytics||{}),...(current.analytics||{})};out.analytics.events=[...rows(legacy.analytics?.events),...rows(current.analytics?.events)].slice(-500);
  return RecordCore?.normalizeStateRecords?RecordCore.normalizeStateRecords(out,{ownerUid:uid}):out;
}
function download(name,value){const blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1200);}
async function exportVerified(){const key=currentKey(),state=parse(localStorage.getItem(key));if(!state||!Integrity)return toast('내보낼 GARANG 데이터를 찾지 못했습니다.');const envelope=Integrity.createEnvelope(state,{scope:currentUid()?'authenticated':'demo'});if(!Integrity.verifyEnvelope(envelope))return toast('백업 무결성 검증에 실패했습니다.');download(`GARANG_BACKUP_${new Date().toISOString().slice(0,10)}.json`,envelope);toast('검증된 GARANG 백업을 내보냈습니다.');}
function importLegacySafe(){const key=currentKey(),current=parse(localStorage.getItem(key)),legacyRaw=localStorage.getItem(LEGACY_KEY),legacy=parse(legacyRaw);if(!legacyRaw||!legacy)return toast('구버전 로컬 데이터를 찾지 못했습니다.');try{window.GarangSchema?.validateImport?.(legacy);}catch{return toast('구버전 데이터 형식이 손상되어 자동 가져오기를 중단했습니다.');}if(!window.confirm('구버전 데이터를 안전하게 병합할까요? 현재 데이터는 백업 후 유지됩니다.'))return;const uid=currentUid();const merged=mergeLegacy(current||{},legacy,uid);const backupKey=`garang_import_backup_v1::${key}`;try{if(current&&!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(current));localStorage.setItem(key,JSON.stringify(merged));}catch{return toast('기기 저장 공간을 확인해 주세요.');}toast('구버전 데이터를 병합했습니다. 다시 불러옵니다.');setTimeout(()=>location.reload(),500);}
function bind(){const exportBtn=$('#exportData'),importBtn=$('#importLegacy');if(exportBtn&&exportBtn.dataset.garangSafeExport!=='1'){exportBtn.dataset.garangSafeExport='1';exportBtn.onclick=()=>exportVerified();}if(importBtn&&importBtn.dataset.garangSafeImport!=='1'){importBtn.dataset.garangSafeImport='1';importBtn.onclick=importLegacySafe;}const version=$('.app-info .metric-row:first-child b');if(version&&window.GARANG_BUILD?.version)version.textContent=window.GARANG_BUILD.version;}
const main=$('#main');if(main){const observer=new MutationObserver(()=>queueMicrotask(bind));observer.observe(main,{childList:true,subtree:true});}document.addEventListener('DOMContentLoaded',bind,{once:true});setTimeout(bind,0);
window.GarangDataSafetyUI=Object.freeze({exportVerified,importLegacySafe,mergeLegacy});
})();
