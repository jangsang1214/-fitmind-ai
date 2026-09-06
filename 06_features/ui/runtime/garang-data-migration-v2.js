/* GARANG data recovery runtime v3.1
   User-triggered, conservative recovery across current local state, same-account
   backups, Firestore app state, durable history collections and recovery snapshots.
   Unowned legacy data is visible but excluded from automatic recovery unless the
   user explicitly confirms that it belongs to the current account.
*/
(() => {
'use strict';
if(window.__garangDataMigrationV2)return;
window.__garangDataMigrationV2=true;

const Sanitizer=window.GarangStateSanitizer;
const Core=window.GarangSyncDurability;
const History=window.GarangHistoryPersistence;
const LEGACY_KEY='garang_v99_state_v2';
const RECOVERY_BACKUP_PREFIX='garang_recovery_backup_v3::';
const PROTECTED=Object.freeze(['workouts','meals','runs','body']);
let lastReport=null;
let observer=null;

function authUid(){
  try{return window.firebase?.auth?.().currentUser?.uid||null;}catch{return null;}
}
function activeKey(){
  const u=authUid();
  return u?`garang_user_${u}_v3`:'garang_demo_state_v3';
}
function clone(value){
  try{return value===undefined?undefined:JSON.parse(JSON.stringify(value));}catch{return null;}
}
function read(key){
  try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}
}
function unwrap(value){
  if(!value||typeof value!=='object')return null;
  if(value.payload&&typeof value.payload==='object')return value.payload;
  if(value.shell&&typeof value.shell==='object')return value.shell;
  if(value.state&&typeof value.state==='object')return value.state;
  return value;
}
function sanitize(value,owner=null){
  const raw=unwrap(value);
  if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;
  try{return Sanitizer?.sanitizeState?Sanitizer.sanitizeState(raw,{ownerUid:owner}):clone(raw);}catch{return clone(raw);}
}
function rows(value){
  return Array.isArray(value)?value.filter(x=>x&&typeof x==='object'&&!Array.isArray(x)):[];
}
function counts(state){
  const out={};
  for(const domain of PROTECTED)out[domain]=rows(state?.[domain]).length;
  out.total=PROTECTED.reduce((sum,domain)=>sum+out[domain],0);
  return out;
}
function stateStamp(state){
  const values=[
    Date.parse(state?.meta?.updatedAt||0)||0,
    Date.parse(state?.clientUpdatedAt||0)||0,
    Number(state?.updatedAtMs)||0
  ];
  for(const domain of PROTECTED){
    for(const row of rows(state?.[domain])){
      values.push(History?.rowStamp?History.rowStamp(row):(Date.parse(row?.updatedAt||row?.createdAt||0)||0));
    }
  }
  return Math.max(0,...values);
}
function candidate(label,type,key,state,owner=null,{trusted=true,warning=''}={}){
  const safe=sanitize(state,owner);
  if(!safe)return null;
  return {
    label,
    type,
    key:key||null,
    state:safe,
    counts:counts(safe),
    stamp:stateStamp(safe),
    trusted:trusted!==false,
    warning:String(warning||'')
  };
}
function toast(message){
  const el=document.getElementById('toast');
  if(!el)return;
  el.textContent=message;
  el.classList.add('show');
  clearTimeout(el.__recoveryTimer);
  el.__recoveryTimer=setTimeout(()=>el.classList.remove('show'),3000);
}
function stamp(){return new Date().toISOString().replace(/[:.]/g,'-');}
function keys(){
  const out=[];
  try{
    for(let i=0;i<localStorage.length;i++){
      const key=localStorage.key(i);
      if(key)out.push(key);
    }
  }catch{}
  return out;
}
function sameAccountBackupKey(key,u){
  const active=activeKey();
  if(key===active||key===LEGACY_KEY)return true;
  if(key.startsWith('garang_sync_backup_v2::'))return key.includes(active);
  if(key.startsWith('garang_state_backup_v3::'))return key.includes(active);
  if(key.startsWith('garang_cloud_recovery_backup_v2::')||key.startsWith('garang_cloud_recovery_backup_v3::'))return !!u&&key.includes(u);
  if(key.startsWith('garang_import_backup_v2::')||key.startsWith('garang_state_recovery_backup_v1::'))return key.includes(active)||(!u&&key.includes(LEGACY_KEY));
  if(key.startsWith(RECOVERY_BACKUP_PREFIX))return key.includes(active)||(!!u&&key.includes(u));
  return false;
}
function labelForKey(key){
  if(key===activeKey())return '현재 기기 상태';
  if(key===LEGACY_KEY)return '구버전 로컬 상태';
  if(key.startsWith('garang_sync_backup_v2::'))return '동기화 이전 백업';
  if(key.startsWith('garang_state_backup_v3::'))return '기기 롤링 백업';
  if(key.startsWith('garang_cloud_recovery_backup_v3::'))return '클라우드 롤링 백업';
  if(key.startsWith('garang_cloud_recovery_backup_v2::'))return '클라우드 최초 백업';
  if(key.startsWith('garang_import_backup_v2::'))return '가져오기 이전 백업';
  if(key.startsWith('garang_state_recovery_backup_v1::'))return '상태 복구 백업';
  if(key.startsWith(RECOVERY_BACKUP_PREFIX))return '복구 실행 이전 백업';
  return '로컬 백업';
}
function declaredOwner(value){
  const raw=unwrap(value);
  const owner=raw?.meta?.syncOwnerUid||raw?.ownerUid||null;
  return owner?String(owner):null;
}
function localCandidates(u){
  const out=[];
  for(const key of keys()){
    if(!sameAccountBackupKey(key,u))continue;
    const raw=read(key);
    if(key===LEGACY_KEY&&u){
      const owner=declaredOwner(raw);
      const trusted=!!owner&&owner===String(u);
      const hit=candidate(
        trusted?'구버전 로컬 상태':'구버전 로컬 상태 · 계정 미확인',
        'local-legacy',
        key,
        raw,
        trusted?u:null,
        {
          trusted,
          warning:trusted?'':'이 구버전 데이터에는 현재 계정 소유자 정보가 없어 자동 복구에서 제외됩니다.'
        }
      );
      if(hit)out.push(hit);
      continue;
    }
    const hit=candidate(labelForKey(key),'local',key,raw,key===activeKey()?u:null,{trusted:true});
    if(hit)out.push(hit);
  }
  return out.sort((a,b)=>b.stamp-a.stamp);
}
function combineHistory(baseInput,candidates,history,u,{includeUnverified=false}={}){
  let out=sanitize(baseInput,u)||{};
  out.meta=out.meta&&typeof out.meta==='object'?out.meta:{};
  out.meta.syncOwnerUid=u||out.meta.syncOwnerUid||null;
  const safeTombstones=rows(out.meta.syncTombstones).filter(t=>!PROTECTED.includes(String(t.domain||''))||t.explicit===true);
  out.meta.syncTombstones=safeTombstones;
  for(const domain of PROTECTED){
    let merged=rows(out[domain]);
    for(const item of candidates){
      if(item?.trusted===false&&!includeUnverified)continue;
      const list=rows(item?.state?.[domain]);
      if(History?.mergeRows)merged=History.mergeRows(domain,merged,list,out);
      else merged=[...merged,...list];
    }
    if(History?.mergeRows)merged=History.mergeRows(domain,merged,rows(history?.[domain]),out);
    out[domain]=merged;
  }
  return sanitize(out,u)||out;
}
function bestPrimary(candidates,u){
  const active=candidates.find(x=>x.key===activeKey());
  if(active)return active.state;
  const cloud=candidates.find(x=>x.type==='cloud-state');
  if(cloud)return cloud.state;
  return candidates.filter(x=>x.trusted!==false).slice().sort((a,b)=>b.stamp-a.stamp)[0]?.state||{};
}
async function readCloud(u){
  const result={candidates:[],history:Object.fromEntries(PROTECTED.map(d=>[d,[]])),errors:[]};
  if(!u||!window.firebase?.apps?.length)return result;
  const db=window.firebase.firestore();
  const user=db.collection('users').doc(u);
  try{
    const snap=await user.collection('app').doc('state').get();
    if(snap?.exists){
      const c=candidate('클라우드 현재 상태','cloud-state','users/app/state',snap.data(),u,{trusted:true});
      if(c)result.candidates.push(c);
    }
  }catch(error){result.errors.push(`클라우드 상태: ${error?.code||error?.message||'확인 실패'}`);}
  for(const domain of PROTECTED){
    try{
      const col=user.collection(History.COLLECTIONS[domain]);
      const snap=await col.get();
      const docs=Array.isArray(snap?.docs)?snap.docs:[];
      result.history[domain]=docs.map(doc=>History.recordFromDoc(doc.data())).filter(Boolean);
    }catch(error){result.errors.push(`${domain}: ${error?.code||error?.message||'확인 실패'}`);}
  }
  try{
    const snap=await user.collection('recoverySnapshots').get();
    const docs=Array.isArray(snap?.docs)?snap.docs:[];
    for(const doc of docs.slice(-30)){
      const data=doc.data();
      const state=data?.shell||data?.state||data?.payload||null;
      if(!state)continue;
      const c=candidate('클라우드 복구 스냅샷','cloud-backup',doc.id,state,u,{trusted:true});
      if(c)result.candidates.push(c);
    }
  }catch(error){result.errors.push(`복구 스냅샷: ${error?.code||error?.message||'확인 실패'}`);}
  return result;
}
async function scanData({includeUnverifiedLegacy=false}={}){
  const u=authUid();
  const local=localCandidates(u);
  const cloud=await readCloud(u);
  const all=[...local,...cloud.candidates];
  const primary=bestPrimary(all,u);
  const recovered=combineHistory(primary,all,cloud.history,u,{includeUnverified:includeUnverifiedLegacy});
  const current=candidate('현재 상태','current',activeKey(),read(activeKey()),u,{trusted:true})?.state||sanitize(primary,u)||{};
  const unverified=all.filter(item=>item.trusted===false&&item.counts?.total>0);
  return {
    uid:u,
    activeKey:activeKey(),
    local,
    cloudCandidates:cloud.candidates,
    history:cloud.history,
    errors:cloud.errors,
    all,
    unverified,
    unverifiedIncluded:includeUnverifiedLegacy&&unverified.length>0,
    current,
    recovered,
    currentCounts:counts(current),
    recoveredCounts:counts(recovered),
    scannedAt:new Date().toISOString()
  };
}
function esc(value){
  return String(value??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
}
function countText(c){return `운동 ${c.workouts} · 식단 ${c.meals} · 러닝 ${c.runs} · 신체 ${c.body}`;}
function sourceRows(report){
  const historyCounts={
    workouts:rows(report.history.workouts).length,
    meals:rows(report.history.meals).length,
    runs:rows(report.history.runs).length,
    body:rows(report.history.body).length
  };
  historyCounts.total=PROTECTED.reduce((sum,d)=>sum+historyCounts[d],0);
  const list=[...report.all];
  if(historyCounts.total)list.push({label:'클라우드 장기 기록',type:'cloud-history',counts:historyCounts,stamp:0,trusted:true});
  const unique=[];
  const seen=new Set();
  for(const item of list){
    const key=`${item.type}|${item.key||item.label}|${item.counts.total}`;
    if(seen.has(key))continue;
    seen.add(key);
    unique.push(item);
  }
  return unique.sort((a,b)=>(b.counts?.total||0)-(a.counts?.total||0)).slice(0,20);
}
function closeModal(){document.querySelector('.garang-data-recovery-modal')?.remove();}
function sourceHtml(item){
  const unverified=item.trusted===false;
  return `<div style="display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-top:1px solid #252824">
    <span>
      <b style="display:block;color:${unverified?'#e5b996':'#f3f1eb'}">${esc(item.label)}</b>
      <small style="color:#8e948c">${esc(item.type)}${unverified?' · 자동 병합 제외':''}</small>
      ${item.warning?`<small style="display:block;margin-top:3px;color:#a98d79">${esc(item.warning)}</small>`:''}
    </span>
    <small style="text-align:right;color:#b8bdb7">${esc(countText(item.counts))}</small>
  </div>`;
}
function renderReport(report){
  lastReport=report;
  closeModal();
  const recoverable=report.recoveredCounts.total>report.currentCounts.total;
  const hasUnverified=report.unverified.length>0&&!report.unverifiedIncluded;
  const modal=document.createElement('div');
  modal.className='garang-data-recovery-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.78);display:flex;align-items:flex-end;justify-content:center;padding:16px;box-sizing:border-box;overflow:auto';
  const rowsHtml=sourceRows(report).map(sourceHtml).join('');
  const errors=report.errors.length?`<div style="margin-top:12px;padding:10px;border:1px solid #573d33;border-radius:10px;color:#d6a38f;font-size:12px">일부 확인 실패: ${report.errors.map(esc).join(' · ')}</div>`:'';
  const unverifiedNotice=report.unverifiedIncluded
    ?'<div style="margin-top:12px;padding:10px;border:1px solid #765c42;border-radius:10px;color:#e4b989;font-size:12px">계정 소유자를 확인할 수 없는 구버전 기록을 사용자가 직접 포함한 상태입니다. 복구 전에 현재 계정의 기록이 맞는지 다시 확인하세요.</div>'
    :hasUnverified
      ?'<div style="margin-top:12px;padding:10px;border:1px solid #4d463c;border-radius:10px;color:#baad9b;font-size:12px">계정 소유자를 확인할 수 없는 구버전 기록은 안전을 위해 자동 복구에서 제외했습니다.</div>'
      :'';
  const unverifiedButton=hasUnverified
    ?'<button type="button" data-recovery-include-unverified style="flex:1;min-width:180px;padding:12px;border-radius:11px;border:1px solid #725a40;background:#1b1712;color:#e1b98a">계정 미확인 구버전 검토</button>'
    :'';
  modal.innerHTML=`<section role="dialog" aria-modal="true" aria-label="GARANG 데이터 복구 센터" style="width:min(680px,100%);max-height:88vh;overflow:auto;background:#0b0d0b;border:1px solid #2a2e29;border-radius:18px;padding:18px;color:#ecefe9;box-sizing:border-box">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
      <div><small style="color:#68bca5">DATA HEALTH</small><h2 style="margin:5px 0 0;font-size:22px">데이터 복구 센터</h2></div>
      <button type="button" data-recovery-close style="border:0;background:transparent;color:#eee;font-size:28px;padding:4px 8px">×</button>
    </div>
    <p style="color:#a6aca5;line-height:1.6">현재 계정의 기기 저장소, 같은 계정 백업, 클라우드 상태, 장기 기록과 복구 스냅샷을 확인합니다. 복구 버튼을 누르기 전에는 현재 기록을 삭제하거나 대체하지 않습니다.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0">
      <div style="padding:12px;border:1px solid #252824;border-radius:12px"><small style="color:#8e948c">현재 화면 기준</small><b style="display:block;margin-top:5px">${esc(countText(report.currentCounts))}</b></div>
      <div style="padding:12px;border:1px solid #35594f;border-radius:12px"><small style="color:#68bca5">안전 병합 가능</small><b style="display:block;margin-top:5px">${esc(countText(report.recoveredCounts))}</b></div>
    </div>
    <div>${rowsHtml||'<div style="color:#8e948c">확인 가능한 저장 소스가 없습니다.</div>'}</div>
    ${unverifiedNotice}${errors}
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px">
      <button type="button" data-recovery-rescan style="flex:1;min-width:120px;padding:12px;border-radius:11px;border:1px solid #38403a;background:#171a17;color:#eee">다시 확인</button>
      <button type="button" data-recovery-export style="flex:1;min-width:120px;padding:12px;border-radius:11px;border:1px solid #38403a;background:#171a17;color:#eee">현재 백업 내보내기</button>
      ${unverifiedButton}
      <button type="button" data-recovery-restore ${recoverable?'':'disabled'} style="flex:2;min-width:180px;padding:12px;border-radius:11px;border:0;background:${recoverable?'#62b89f':'#343834'};color:${recoverable?'#06110d':'#8b908a'};font-weight:700">${recoverable?'누락 기록 안전 복구':'추가 복구 기록 없음'}</button>
    </div>
    <p style="margin:12px 0 0;color:#777f78;font-size:12px">복구 시 현재 상태와 클라우드 상태를 먼저 별도 백업한 뒤, 운동·식단·러닝·신체 기록만 비파괴 병합합니다.</p>
  </section>`;
  document.body.appendChild(modal);
  modal.querySelector('[data-recovery-close]').onclick=closeModal;
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
  modal.querySelector('[data-recovery-rescan]').onclick=()=>openRecoveryCenter();
  modal.querySelector('[data-recovery-export]').onclick=()=>window.GarangSyncDurabilityRuntime?.exportVerifiedBackup?.();
  const include=modal.querySelector('[data-recovery-include-unverified]');
  if(include)include.onclick=async()=>{
    const ok=window.confirm('이 구버전 데이터는 어느 계정의 기록인지 자동 확인할 수 없습니다. 현재 로그인한 계정의 기록이 맞다고 확신할 때만 포함하세요. 포함해서 다시 계산할까요?');
    if(!ok)return;
    toast('계정 미확인 구버전 기록을 포함해 다시 계산합니다.');
    try{renderReport(await scanData({includeUnverifiedLegacy:true}));}catch(error){console.warn('[GARANG] unverified legacy review failed',error);toast('구버전 기록 확인에 실패했습니다. 현재 데이터는 변경하지 않았습니다.');}
  };
  const restore=modal.querySelector('[data-recovery-restore]');
  if(recoverable)restore.onclick=()=>restoreReport(report);
}
async function openRecoveryCenter(){
  toast('저장된 기록을 안전하게 확인하고 있습니다.');
  try{renderReport(await scanData());}
  catch(error){console.warn('[GARANG] recovery scan failed',error);toast('데이터 확인 중 오류가 발생했습니다. 현재 기록을 삭제하지 않았습니다.');}
}
async function guardedPersistHistory(db,u,state){
  let out=clone(state);
  for(const domain of PROTECTED){
    const collection=db.collection('users').doc(u).collection(History.COLLECTIONS[domain]);
    const final=[];
    for(let offset=0;offset<rows(out[domain]).length;offset+=25){
      const chunk=rows(out[domain]).slice(offset,offset+25);
      const checked=await Promise.all(chunk.map(async row=>{
        const local=History.normalizeRecord(domain,row,u);
        const ref=collection.doc(encodeURIComponent(local.id));
        const snap=await ref.get();
        const remote=snap.exists?History.recordFromDoc(snap.data()):null;
        return {local,remote,ref};
      }));
      for(const item of checked){
        if(item.remote&&History.rowStamp(item.remote)>History.rowStamp(item.local)){
          final.push(item.remote);
          continue;
        }
        await item.ref.set(History.docPayload(domain,item.local,u),{merge:false});
        final.push(item.local);
      }
    }
    out[domain]=History.mergeRows(domain,[],final,out);
  }
  return out;
}
async function restoreReport(report){
  if(!report||report!==lastReport)return;
  const before=report.currentCounts;
  const after=report.recoveredCounts;
  if(after.total<=before.total)return toast('추가로 복구할 기록이 없습니다.');
  const warning=report.unverifiedIncluded?' 계정 소유자를 확인할 수 없는 구버전 기록도 포함되어 있습니다.':'';
  if(!window.confirm(`현재 ${before.total}개 기록에서 최대 ${after.total}개 기록으로 안전 병합합니다.${warning} 계속할까요?`))return;
  const u=authUid();
  let recovered=clone(report.recovered);
  try{
    const raw=localStorage.getItem(report.activeKey);
    if(raw)localStorage.setItem(`${RECOVERY_BACKUP_PREFIX}${u||'demo'}::${report.activeKey}::${stamp()}`,raw);
    if(u&&window.firebase?.apps?.length){
      const db=window.firebase.firestore();
      const user=db.collection('users').doc(u);
      const current=report.current||{};
      await user.collection('recoverySnapshots').doc(`manual-recovery-v3-${Date.now()}`).set({
        recoveryVersion:3,
        ownerUid:u,
        createdAt:new Date().toISOString(),
        source:'pre-recovery',
        counts:counts(current),
        shell:History.compactShell(current)
      },{merge:false});
      recovered=await guardedPersistHistory(db,u,recovered);
      localStorage.setItem(report.activeKey,JSON.stringify(recovered));
      const shell=Core?.compactForCloud?Core.compactForCloud(History.compactShell(recovered)):History.compactShell(recovered);
      shell.meta={...(shell.meta||{}),syncOwnerUid:u};
      shell.clientUpdatedAt=new Date().toISOString();
      shell.cloudUpdatedAt=window.firebase.firestore.FieldValue.serverTimestamp();
      await user.collection('app').doc('state').set(shell,{merge:false});
    }else{
      localStorage.setItem(report.activeKey,JSON.stringify(recovered));
    }
    toast('기록 복구가 완료되었습니다. 앱을 다시 불러옵니다.');
    setTimeout(()=>location.reload(),700);
  }catch(error){
    console.warn('[GARANG] safe recovery failed',error);
    toast('복구를 완료하지 못했습니다. 복구 전 백업은 유지됩니다.');
  }
}
function bindSettingsButton(){
  const button=document.getElementById('importLegacy');
  if(!button)return;
  button.textContent='데이터 복구 확인';
  button.title='기기·클라우드·백업의 기록을 확인하고 누락 기록을 안전하게 병합합니다.';
  button.onclick=openRecoveryCenter;
  button.dataset.garangSafeImport='v3.1';
}
function startBinding(){
  bindSettingsButton();
  const main=document.getElementById('main');
  if(!main||observer)return;
  observer=new MutationObserver(()=>bindSettingsButton());
  observer.observe(main,{childList:true,subtree:true});
}
setTimeout(startBinding,0);
window.addEventListener('load',startBinding,{once:true});
window.GarangDataMigrationV2=Object.freeze({
  version:'v3.1',
  importLegacy:openRecoveryCenter,
  openRecoveryCenter,
  scanData,
  counts,
  combineHistory,
  activeKey
});
})();
