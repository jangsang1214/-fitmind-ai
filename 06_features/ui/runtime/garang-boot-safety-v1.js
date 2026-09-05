/* GARANG boot safety v1
   Repairs malformed persisted state before app.js boots and performs one guarded reload
   only when the authenticated/demo app becomes visible without navigation bindings.
   Corrupt raw payloads are backed up before repair; valid user records are preserved.
*/
(() => {
  'use strict';
  const Core=window.GarangSyncDurability;
  if(!Core?.sanitizeState||window.__garangBootSafetyV1)return;
  window.__garangBootSafetyV1=true;

  const BACKUP_PREFIX='garang_boot_recovery_v1::';
  const RELOAD_KEY='garang_boot_recovery_reload_v1';
  const nativeGet=Storage.prototype.getItem;
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  const get=(key)=>{try{return nativeGet.call(localStorage,key);}catch{return null;}};
  const set=(key,value)=>{try{nativeSet.call(localStorage,key,value);return true;}catch{return false;}};

  function backup(key,raw,reason){
    if(raw==null)return;
    const stamp=new Date().toISOString();
    const backupKey=`${BACKUP_PREFIX}${key}::${Date.now()}`;
    set(backupKey,JSON.stringify({key,reason:String(reason||'repair'),savedAt:stamp,raw:String(raw)}));
  }

  function repairKey(key){
    if(!Core.isStateKey(key))return {key,changed:false};
    const raw=get(key);if(raw==null)return {key,changed:false};
    let parsed;
    try{parsed=JSON.parse(raw);}catch(error){
      backup(key,raw,'invalid_json');
      const safe=Core.sanitizeState({meta:{recoveredAt:new Date().toISOString(),recoveryReason:'invalid_json'}},{ownerUid:Core.ownerFromKey(key)});
      set(key,JSON.stringify(safe));
      return {key,changed:true,reason:'invalid_json'};
    }
    const safe=Core.sanitizeState(parsed,{ownerUid:Core.ownerFromKey(key)});
    const next=JSON.stringify(safe);
    if(next!==raw){backup(key,raw,'invalid_shape');set(key,next);return {key,changed:true,reason:'invalid_shape'};}
    return {key,changed:false};
  }

  function repairAll(){
    const keys=[];
    try{for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key&&Core.isStateKey(key))keys.push(key);}}catch{}
    return keys.map(repairKey);
  }

  const initial=repairAll();
  if(initial.some(x=>x.changed))document.documentElement.dataset.garangStateRecovered='1';

  function navigationReady(){
    const app=document.getElementById('appView');
    if(!app||app.hidden)return true;
    const first=document.querySelector('#bottomNav button[data-page]');
    return !!first&&typeof first.onclick==='function';
  }

  function verifyBoot(){
    if(navigationReady()){
      try{sessionStorage.removeItem(RELOAD_KEY);}catch{}
      document.documentElement.dataset.garangBootReady='1';
      return;
    }
    repairAll();
    let reloaded=false;
    try{reloaded=sessionStorage.getItem(RELOAD_KEY)==='1';}catch{}
    if(!reloaded){
      try{sessionStorage.setItem(RELOAD_KEY,'1');}catch{}
      location.reload();
      return;
    }
    document.documentElement.dataset.garangBootFailed='1';
    const toast=document.getElementById('toast');
    if(toast){toast.textContent='저장 상태를 복구했습니다. 화면을 새로고침해 주세요.';toast.classList.add('show');}
  }

  window.addEventListener('load',()=>setTimeout(verifyBoot,700),{once:true});
  window.addEventListener('pageshow',()=>setTimeout(verifyBoot,900),{once:true});
  window.GarangBootSafety=Object.freeze({version:'garang-boot-safety-v1',repairAll,repairKey,navigationReady});
})();
