/* GARANG data migration runtime v2
   Owns explicit legacy import without touching ordinary clicks or polling state.
*/
(() => {
'use strict';
if(window.__garangDataMigrationV2)return;window.__garangDataMigrationV2=true;
const Legacy=window.GarangLegacyMigration,Sanitizer=window.GarangStateSanitizer;
const LEGACY_KEY='garang_v99_state_v2';
const BACKUP_PREFIX='garang_import_backup_v2::';
function uid(){try{return window.firebase?.auth?.().currentUser?.uid||null;}catch{return null;}}
function activeKey(){const u=uid();return u?`garang_user_${u}_v3`:'garang_demo_state_v3';}
function read(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function toast(message){const el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');clearTimeout(el.__migrationTimer);el.__migrationTimer=setTimeout(()=>el.classList.remove('show'),2500);}
function backup(key,value){try{const stamp=new Date().toISOString().replace(/[:.]/g,'-'),backupKey=`${BACKUP_PREFIX}${key}::${stamp}`;localStorage.setItem(backupKey,JSON.stringify(value));return backupKey;}catch{return null;}}
function importLegacy(){
  if(!Legacy||!Sanitizer)return toast('데이터 마이그레이션 모듈을 불러오지 못했습니다.');
  const old=read(LEGACY_KEY);if(!old)return toast('구버전 로컬 데이터를 찾지 못했습니다.');
  if(!window.confirm('구버전 기록을 현재 데이터에 안전하게 병합할까요? 현재 데이터는 백업 후 유지됩니다.'))return;
  const key=activeKey(),current=read(key)||{},owner=uid();
  const safeCurrent=Sanitizer.sanitizeState(current,{ownerUid:owner}),safeLegacy=Sanitizer.sanitizeState(old,{ownerUid:null});
  const merged=Sanitizer.sanitizeState(Legacy.mergeState(safeCurrent,safeLegacy),{ownerUid:owner});
  backup(key,safeCurrent);backup(LEGACY_KEY,safeLegacy);
  try{localStorage.setItem(key,JSON.stringify(merged));toast('구버전 기록을 중복 없이 병합했습니다. 앱을 다시 불러옵니다.');setTimeout(()=>location.reload(),500);}catch(error){console.warn('[GARANG] legacy import failed',error);toast('가져오기에 실패했습니다. 기존 데이터는 변경하지 않았습니다.');}
}
window.GarangDataMigrationV2=Object.freeze({version:'v2',importLegacy,activeKey});
})();
